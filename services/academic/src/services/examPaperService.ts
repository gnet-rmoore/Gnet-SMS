import prisma from "../lib/prisma";
import {
  createExamPaperDownloadUrl,
  createExamPaperUploadUrl,
} from "../lib/examPaperStorage";
import { getIdentityUsersByRoles } from "../lib/identityClient";
import { notifyInApp, notifyInAppMany } from "../lib/notifyInApp";
import { evaluatePaperStart } from "../lib/paperApproval";

const REVIEWER_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"];
const DELIVERY_MODES = new Set(["ONLINE", "OFFLINE", "HYBRID"]);
const LEGS = new Set(["ONLINE", "OFFLINE"]);

function httpError(message: string, status: number, code?: string) {
  return Object.assign(new Error(message), { status, code });
}

function normalizeMode(raw: unknown, fallback = "ONLINE"): string {
  const mode = String(raw || fallback).toUpperCase();
  return DELIVERY_MODES.has(mode) ? mode : fallback;
}

async function syncExamDenorm(examId: string, schoolId: string, patch: {
  paperStatus?: string;
  deliveryMode?: string;
  isOnline?: boolean;
}) {
  await prisma.exam.update({
    where: { id: examId },
    data: {
      ...(patch.paperStatus !== undefined ? { paperStatus: patch.paperStatus } : {}),
      ...(patch.deliveryMode !== undefined ? { deliveryMode: patch.deliveryMode } : {}),
      ...(patch.isOnline !== undefined ? { isOnline: patch.isOnline } : {}),
    },
  });
}

async function latestPackage(examId: string) {
  return prisma.examPaperPackage.findFirst({
    where: { examId },
    orderBy: { revision: "desc" },
  });
}

type PaperSnapshot = {
  examId: string;
  schoolId: string;
  packageId: string;
  revision: number;
  status: string;
  deliveryMode: string;
  authorId: string;
  pdfObjectKey: string | null;
  pdfFileName: string | null;
  feedback: string | null;
  submittedAt: Date | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
};

/** Append an immutable revision row capturing a package state transition. */
async function recordRevision(
  pkg: PaperSnapshot,
  action: "CREATE" | "UPDATE" | "SUBMIT" | "APPROVE" | "RETURN",
  actorId: string
) {
  try {
    await prisma.examPaperRevision.create({
      data: {
        packageId: pkg.packageId,
        examId: pkg.examId,
        schoolId: pkg.schoolId,
        revision: pkg.revision,
        status: pkg.status,
        deliveryMode: pkg.deliveryMode,
        actorId: actorId || "system",
        action,
        snapshot: JSON.stringify({
          pdfObjectKey: pkg.pdfObjectKey,
          pdfFileName: pkg.pdfFileName,
          feedback: pkg.feedback,
          authorId: pkg.authorId,
          submittedAt: pkg.submittedAt,
          reviewedBy: pkg.reviewedBy,
          reviewedAt: pkg.reviewedAt,
        }),
      },
    });
  } catch (err) {
    // Revision history must never block the paper workflow.
    console.warn("[exam-paper] recordRevision failed:", (err as any)?.message || err);
  }
}

function toSnapshot(
  pkg: any,
  ids: { examId: string; schoolId: string }
): PaperSnapshot {
  return {
    examId: ids.examId,
    schoolId: ids.schoolId,
    packageId: pkg.id,
    revision: pkg.revision,
    status: pkg.status,
    deliveryMode: pkg.deliveryMode,
    authorId: pkg.authorId,
    pdfObjectKey: pkg.pdfObjectKey ?? null,
    pdfFileName: pkg.pdfFileName ?? null,
    feedback: pkg.feedback ?? null,
    submittedAt: pkg.submittedAt ?? null,
    reviewedBy: pkg.reviewedBy ?? null,
    reviewedAt: pkg.reviewedAt ?? null,
  };
}

async function assertEditable(pkg: { status: string }) {
  if (!["DRAFT", "RETURNED"].includes(pkg.status)) {
    throw httpError(
      "Paper can only be edited while Draft or Returned",
      409,
      "PAPER_LOCKED"
    );
  }
}

async function validateContentForMode(
  examId: string,
  schoolId: string,
  mode: string,
  pkg: { pdfObjectKey: string | null }
) {
  const questionCount = await prisma.examQuestion.count({
    where: { examId, schoolId },
  });
  const hasPdf = Boolean(pkg.pdfObjectKey);
  if (!questionCount && !hasPdf) {
    throw httpError("Add structured questions and/or a PDF before submitting", 400);
  }
  if (mode === "ONLINE" && questionCount < 1) {
    throw httpError("Online delivery requires at least one structured question", 400);
  }
  if (mode === "OFFLINE" && !hasPdf) {
    throw httpError("Offline delivery requires a PDF paper", 400);
  }
  if (mode === "HYBRID" && (questionCount < 1 || !hasPdf)) {
    throw httpError("Hybrid delivery requires both structured questions and a PDF", 400);
  }
}

/**
 * Bootstrap: existing online exams with questions but no package → APPROVED.
 */
export async function ensureLegacyPaperApproved(examId: string, schoolId: string) {
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
  if (!exam) return null;
  const existing = await latestPackage(examId);
  if (existing) return existing;

  const questionCount = await prisma.examQuestion.count({
    where: { examId, schoolId },
  });
  if (!exam.isOnline || questionCount < 1) return null;

  const pkg = await prisma.examPaperPackage.create({
    data: {
      examId,
      schoolId,
      authorId: "system-migration",
      status: "APPROVED",
      revision: 1,
      deliveryMode: exam.deliveryMode || "ONLINE",
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: "system-migration",
      feedback: "Auto-approved: existing online exam migrated",
    },
  });
  await syncExamDenorm(examId, schoolId, {
    paperStatus: "APPROVED",
    deliveryMode: pkg.deliveryMode,
    isOnline: true,
  });
  return pkg;
}

export const examPaperService = {
  async getOrCreateDraft(examId: string, schoolId: string, authorId: string) {
    const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
    if (!exam) throw httpError("Exam not found", 404);

    await ensureLegacyPaperApproved(examId, schoolId);
    let pkg = await latestPackage(examId);

    if (!pkg) {
      pkg = await prisma.examPaperPackage.create({
        data: {
          examId,
          schoolId,
          authorId,
          status: "DRAFT",
          revision: 1,
          deliveryMode: exam.deliveryMode || "ONLINE",
        },
      });
      await syncExamDenorm(examId, schoolId, {
        paperStatus: "DRAFT",
        deliveryMode: pkg.deliveryMode,
      });
      await recordRevision(toSnapshot(pkg, { examId, schoolId }), "CREATE", authorId);
    } else if (pkg.status === "APPROVED") {
      // Read-only view of approved head
    } else if (pkg.status === "RETURNED" || pkg.status === "DRAFT") {
      // editable
    }

    const questionCount = await prisma.examQuestion.count({
      where: { examId, schoolId },
    });
    const roster = await prisma.examPaperRosterFlag.findMany({
      where: { examId, schoolId },
      orderBy: { createdAt: "asc" },
    });

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        deliveryMode: exam.deliveryMode,
        paperStatus: exam.paperStatus,
        isOnline: exam.isOnline,
        startDate: exam.startDate,
        endDate: exam.endDate,
        duration: exam.duration,
        maxViolations: exam.maxViolations,
        showResultsImmediately: exam.showResultsImmediately,
        instructions: exam.instructions,
      },
      package: pkg,
      questionCount,
      roster,
      canEdit: pkg ? ["DRAFT", "RETURNED"].includes(pkg.status) : true,
    };
  },

  async updateDraft(
    examId: string,
    schoolId: string,
    authorId: string,
    data: { deliveryMode?: string; instructions?: string | null; maxViolations?: number }
  ) {
    const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
    if (!exam) throw httpError("Exam not found", 404);

    let pkg = await latestPackage(examId);
    if (!pkg) {
      const created = await this.getOrCreateDraft(examId, schoolId, authorId);
      pkg = created.package;
    }
    if (!pkg) throw httpError("Package missing", 500);
    await assertEditable(pkg);

    const deliveryMode =
      data.deliveryMode !== undefined
        ? normalizeMode(data.deliveryMode, pkg.deliveryMode)
        : pkg.deliveryMode;

    const updated = await prisma.$transaction(async (tx) => {
      const nextPkg = await tx.examPaperPackage.update({
        where: { id: pkg!.id },
        data: {
          deliveryMode,
          status: pkg!.status === "RETURNED" ? "DRAFT" : pkg!.status,
          authorId: pkg!.authorId === "system-migration" ? authorId : pkg!.authorId,
        },
      });
      await tx.exam.update({
        where: { id: examId },
        data: {
          deliveryMode,
          paperStatus: nextPkg.status,
          ...(data.instructions !== undefined
            ? { instructions: data.instructions ? String(data.instructions).slice(0, 5000) : null }
            : {}),
          ...(data.maxViolations !== undefined
            ? {
                maxViolations: Math.max(
                  0,
                  Math.min(50, Number(data.maxViolations) || 0)
                ),
              }
            : {}),
          isOnline: deliveryMode === "ONLINE" || deliveryMode === "HYBRID",
        },
      });
      return nextPkg;
    });

    await recordRevision(toSnapshot(updated, { examId, schoolId }), "UPDATE", authorId);

    return this.getOrCreateDraft(examId, schoolId, authorId);
  },

  async presignPdf(
    examId: string,
    schoolId: string,
    authorId: string,
    fileName: string,
    mimeType: string
  ) {
    let pkg = (await latestPackage(examId)) || null;
    if (!pkg) {
      const created = await this.getOrCreateDraft(examId, schoolId, authorId);
      pkg = created.package;
    }
    await assertEditable(pkg!);
    return createExamPaperUploadUrl({
      schoolId,
      examId,
      fileName,
      mimeType,
    });
  },

  async confirmPdf(
    examId: string,
    schoolId: string,
    authorId: string,
    body: { storageKey: string; fileUrl: string; fileName: string }
  ) {
    let pkg = await latestPackage(examId);
    if (!pkg) {
      const created = await this.getOrCreateDraft(examId, schoolId, authorId);
      pkg = created.package;
    }
    await assertEditable(pkg!);

    const key = String(body.storageKey || "");
    if (!key.startsWith(`exam-papers/${schoolId}/${examId}/`)) {
      throw httpError("Invalid storage key", 400);
    }

    await prisma.examPaperPackage.update({
      where: { id: pkg!.id },
      data: {
        pdfObjectKey: key,
        pdfFileUrl: String(body.fileUrl || ""),
        pdfFileName: String(body.fileName || "paper.pdf").slice(0, 200),
        pdfUploadedAt: new Date(),
        status: pkg!.status === "RETURNED" ? "DRAFT" : pkg!.status,
        authorId: pkg!.authorId === "system-migration" ? authorId : pkg!.authorId,
      },
    });
    await syncExamDenorm(examId, schoolId, {
      paperStatus: pkg!.status === "RETURNED" ? "DRAFT" : pkg!.status,
    });

    return this.getOrCreateDraft(examId, schoolId, authorId);
  },

  async clearPdf(examId: string, schoolId: string, authorId: string) {
    const pkg = await latestPackage(examId);
    if (!pkg || pkg.schoolId !== schoolId) throw httpError("Paper not found", 404);
    await assertEditable(pkg);
    await prisma.examPaperPackage.update({
      where: { id: pkg.id },
      data: {
        pdfObjectKey: null,
        pdfFileUrl: null,
        pdfFileName: null,
        pdfUploadedAt: null,
        authorId: pkg.authorId === "system-migration" ? authorId : pkg.authorId,
      },
    });
    return this.getOrCreateDraft(examId, schoolId, authorId);
  },

  async submit(examId: string, schoolId: string, authorId: string) {
    let pkg = await latestPackage(examId);
    if (!pkg || pkg.schoolId !== schoolId) {
      const created = await this.getOrCreateDraft(examId, schoolId, authorId);
      pkg = created.package;
    }
    await assertEditable(pkg!);
    await validateContentForMode(examId, schoolId, pkg!.deliveryMode, pkg!);

    const examForDeadline = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
    if (examForDeadline?.paperDueAt && new Date() > examForDeadline.paperDueAt) {
      throw Object.assign(new Error("The paper deadline has passed"), {
        status: 409,
        code: "PAPER_DEADLINE_PASSED",
      });
    }

    const updated = await prisma.examPaperPackage.update({
      where: { id: pkg!.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        feedback: null,
        authorId: pkg!.authorId === "system-migration" ? authorId : pkg!.authorId,
      },
    });
    await syncExamDenorm(examId, schoolId, {
      paperStatus: "SUBMITTED",
      deliveryMode: updated.deliveryMode,
      isOnline:
        updated.deliveryMode === "ONLINE" || updated.deliveryMode === "HYBRID",
    });
    await recordRevision(toSnapshot(updated, { examId, schoolId }), "SUBMIT", authorId);

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    const reviewers = await getIdentityUsersByRoles(schoolId, REVIEWER_ROLES);
    await notifyInAppMany(
      reviewers.map((u) => ({
        schoolId,
        userId: u.id,
        eventKey: "EXAM_PAPER_SUBMITTED",
        title: "Exam paper submitted",
        body: `${exam?.title || "Exam"} is ready for review`,
        href: `/exam-paper-review`,
        meta: { examId, packageId: updated.id },
      }))
    );

    return this.getOrCreateDraft(examId, schoolId, authorId);
  },

  async listPending(schoolId: string) {
    const rows = await prisma.examPaperPackage.findMany({
      where: { schoolId, status: "SUBMITTED" },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            deliveryMode: true,
            paperStatus: true,
            subjectId: true,
          },
        },
      },
      orderBy: { submittedAt: "asc" },
    });
    return rows.map((r) => ({
      ...r,
      questionCount: undefined as number | undefined,
    }));
  },

  async listPendingEnriched(schoolId: string) {
    const rows = await this.listPending(schoolId);
    const withCounts = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        questionCount: await prisma.examQuestion.count({
          where: { examId: r.examId, schoolId },
        }),
      }))
    );
    return withCounts;
  },

  async review(
    packageId: string,
    schoolId: string,
    reviewerId: string,
    body: { action: "APPROVE" | "RETURN"; feedback?: string; deliveryMode?: string }
  ) {
    const pkg = await prisma.examPaperPackage.findFirst({
      where: { id: packageId, schoolId },
      include: { exam: true },
    });
    if (!pkg) throw httpError("Paper not found", 404);
    if (pkg.status !== "SUBMITTED") {
      throw httpError("Only submitted papers can be reviewed", 409);
    }

    const action = String(body.action || "").toUpperCase();
    if (action === "RETURN") {
      const feedback = String(body.feedback || "").trim();
      if (!feedback) throw httpError("Feedback is required when returning a paper", 400);
      const updated = await prisma.examPaperPackage.update({
        where: { id: packageId },
        data: {
          status: "RETURNED",
          feedback: feedback.slice(0, 5000),
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
      });
      await syncExamDenorm(pkg.examId, schoolId, { paperStatus: "RETURNED" });
      await recordRevision(toSnapshot(updated, { examId: pkg.examId, schoolId }), "RETURN", reviewerId);
      if (pkg.authorId && pkg.authorId !== "system-migration") {
        await notifyInApp({
          schoolId,
          userId: pkg.authorId,
          eventKey: "EXAM_PAPER_RETURNED",
          title: "Exam paper returned",
          body: `${pkg.exam.title}: ${feedback.slice(0, 120)}`,
          href: `/exams/${pkg.examId}/paper`,
          meta: { examId: pkg.examId, packageId },
        });
      }
      return updated;
    }

    if (action !== "APPROVE") throw httpError("Invalid action", 400);

    const deliveryMode = body.deliveryMode
      ? normalizeMode(body.deliveryMode, pkg.deliveryMode)
      : pkg.deliveryMode;
    await validateContentForMode(pkg.examId, schoolId, deliveryMode, pkg);

    const updated = await prisma.examPaperPackage.update({
      where: { id: packageId },
      data: {
        status: "APPROVED",
        deliveryMode,
        feedback: null,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
    await syncExamDenorm(pkg.examId, schoolId, {
      paperStatus: "APPROVED",
      deliveryMode,
      isOnline: deliveryMode === "ONLINE" || deliveryMode === "HYBRID",
    });
    await recordRevision(toSnapshot(updated, { examId: pkg.examId, schoolId }), "APPROVE", reviewerId);

    if (pkg.authorId && pkg.authorId !== "system-migration") {
      await notifyInApp({
        schoolId,
        userId: pkg.authorId,
        eventKey: "EXAM_PAPER_APPROVED",
        title: "Exam paper approved",
        body: `${pkg.exam.title} is approved for ${deliveryMode.toLowerCase()} delivery`,
        href: `/exams/${pkg.examId}/paper`,
        meta: { examId: pkg.examId, packageId, deliveryMode },
      });
    }
    return updated;
  },

  async pdfDownloadUrl(examId: string, schoolId: string) {
    const pkg = await latestPackage(examId);
    if (!pkg || pkg.schoolId !== schoolId) throw httpError("Paper not found", 404);
    if (!pkg.pdfObjectKey) throw httpError("No PDF attached", 404);
    if (!["SUBMITTED", "APPROVED"].includes(pkg.status)) {
      // Teachers can also download their draft PDF
      if (!["DRAFT", "RETURNED"].includes(pkg.status)) {
        throw httpError("PDF not available", 403);
      }
    }
    const signed = await createExamPaperDownloadUrl(pkg.pdfObjectKey);
    return {
      downloadUrl: signed || pkg.pdfFileUrl,
      fileName: pkg.pdfFileName,
    };
  },

  async setRoster(
    examId: string,
    schoolId: string,
    entries: { studentId: string; leg: string }[]
  ) {
    const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
    if (!exam) throw httpError("Exam not found", 404);
    if (exam.deliveryMode !== "HYBRID" && exam.paperStatus === "APPROVED") {
      // allow setting while drafting hybrid too
    }
    const mode = exam.deliveryMode;
    if (mode !== "HYBRID") {
      throw httpError("Roster legs apply only to HYBRID exams", 400);
    }

    if (!Array.isArray(entries) || entries.length > 2000) {
      throw httpError("Invalid roster payload", 400);
    }

    for (const row of entries) {
      const leg = String(row.leg || "").toUpperCase();
      if (!LEGS.has(leg)) throw httpError("Invalid leg", 400);
      const studentId = String(row.studentId || "");
      if (!studentId) continue;

      const attempt = await prisma.examAttempt.findUnique({
        where: { examId_studentId: { examId, studentId } },
      });
      if (attempt && attempt.status !== "IN_PROGRESS") {
        // already finished online — cannot flip
        if (leg === "OFFLINE") {
          throw httpError(
            `Student ${studentId} already completed an online attempt`,
            409,
            "ATTEMPT_EXISTS"
          );
        }
      }
      if (attempt && attempt.status === "IN_PROGRESS" && leg === "OFFLINE") {
        throw httpError(
          `Student ${studentId} has an in-progress online attempt`,
          409,
          "ATTEMPT_IN_PROGRESS"
        );
      }

      await prisma.examPaperRosterFlag.upsert({
        where: { examId_studentId: { examId, studentId } },
        create: { examId, schoolId, studentId, leg },
        update: { leg },
      });
    }

    return prisma.examPaperRosterFlag.findMany({
      where: { examId, schoolId },
      orderBy: { createdAt: "asc" },
    });
  },

  async getStudentLeg(examId: string, schoolId: string, studentId: string) {
    const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
    if (!exam) return null;
    if (exam.deliveryMode === "ONLINE") return "ONLINE";
    if (exam.deliveryMode === "OFFLINE") return "OFFLINE";
    const flag = await prisma.examPaperRosterFlag.findUnique({
      where: { examId_studentId: { examId, studentId } },
    });
    // Hybrid default: ONLINE if no flag (plan: explicit flags preferred; default online for unset)
    return flag?.leg || "ONLINE";
  },

  async assertCanStartOnline(examId: string, schoolId: string, studentId: string) {
    await ensureLegacyPaperApproved(examId, schoolId);
    const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId } });
    if (!exam) throw httpError("Exam not found", 404);

    const pkg = await latestPackage(examId);
    const leg =
      exam.deliveryMode === "HYBRID"
        ? await this.getStudentLeg(examId, schoolId, studentId)
        : undefined;

    const decision = evaluatePaperStart({
      paperStatus: exam.paperStatus,
      latestPackageStatus: pkg?.status ?? null,
      deliveryMode: exam.deliveryMode,
      leg,
    });
    if (!decision.ok) throw httpError(decision.message, 403, decision.code);

    return exam;
  },

  /** Immutable revision history for an exam's paper (newest first). */
  async listRevisions(examId: string, schoolId: string) {
    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId },
      select: { id: true, title: true },
    });
    if (!exam) throw httpError("Exam not found", 404);
    const rows = await prisma.examPaperRevision.findMany({
      where: { examId, schoolId },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      packageId: r.packageId,
      revision: r.revision,
      status: r.status,
      deliveryMode: r.deliveryMode,
      action: r.action,
      actorId: r.actorId,
      createdAt: r.createdAt,
      snapshot: r.snapshot ? safeParse(r.snapshot) : null,
    }));
  },
};

function safeParse(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
