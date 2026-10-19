import prisma from "../lib/prisma";
import { notifyInApp, notifyInAppMany } from "../lib/notifyInApp";
import { getIdentitySchool, getIdentityUser, getIdentityUsersByRoles } from "../lib/identityClient";
import { generatePDF } from "../lib/pdfService";
import {
  buildTranscriptHTML,
  resolveTranscriptTemplateKey,
  type TranscriptCourseRow,
  type TranscriptSignatory,
} from "../lib/transcriptTemplates";

export type TranscriptStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export type TranscriptSnapshot = {
  records: TranscriptCourseRow[];
  summary: {
    gpa: number;
    average: number;
    honors: string;
    credits: number;
    courseCount: number;
  };
  computedAt: string;
};

type Actor = {
  id: string;
  name?: string;
  role?: string;
  schoolId?: string;
};

const APPROVER_ROLES = ["PRINCIPAL", "VPI", "VPA"];
const FALLBACK_APPROVER_ROLES = ["SCHOOL_ADMIN"];

function httpError(status: number, message: string, code?: string): Error {
  const err: any = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function defaultAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = now.getMonth() >= 7 ? year : year - 1;
  return `${start}/${start + 1}`;
}

/** A/B/C/D/F fallback used when the school has no configured grade legend. */
function fallbackGrade(score: number): { letter: string; points: number; remark: string } {
  if (score >= 90) return { letter: "A", points: 4, remark: "Excellent" };
  if (score >= 80) return { letter: "B", points: 3, remark: "Very Good" };
  if (score >= 70) return { letter: "C", points: 2, remark: "Good" };
  if (score >= 60) return { letter: "D", points: 1, remark: "Pass" };
  return { letter: "F", points: 0, remark: "Fail" };
}

function honorFor(gpa: number): string {
  if (gpa >= 3.8) return "Summa Cum Laude";
  if (gpa >= 3.5) return "Magna Cum Laude";
  if (gpa >= 3.2) return "Dean's List Honour Roll";
  if (gpa < 2) return "Academic Warning";
  return "Satisfactory Standing";
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function serialize(record: any) {
  return {
    ...record,
    snapshot: parseJson<TranscriptSnapshot | null>(record?.snapshot, null),
  };
}

async function loadScales(schoolId: string) {
  try {
    const legends = await prisma.gradeLegend.findMany({
      where: { schoolId },
      include: { scales: true },
      take: 4,
    });
    const scales = legends.flatMap((legend: any) => legend.scales || []);
    return scales
      .filter((scale: any) => Number.isFinite(scale?.minScore) && Number.isFinite(scale?.maxScore))
      .map((scale: any) => ({
        min: Number(scale.minScore),
        max: Number(scale.maxScore),
        letter: String(scale.gradeLetter || ""),
        points: Number.isFinite(scale.gpaPoints) ? Number(scale.gpaPoints) : 0,
        remark: typeof scale.remark === "string" ? scale.remark : "",
      }));
  } catch {
    return [];
  }
}

function gradeFromScale(
  score: number,
  scales: Array<{ min: number; max: number; letter: string; points: number; remark: string }>
) {
  const hit = scales.find((scale) => score >= scale.min && score <= scale.max);
  if (hit) return { letter: hit.letter || "—", points: hit.points, remark: hit.remark };
  return fallbackGrade(score);
}

/** Aggregate released/accepted grade entries into transcript course rows. */
export async function buildSnapshot(
  schoolId: string,
  studentId: string
): Promise<TranscriptSnapshot> {
  const rows = await prisma.gradeEntry.findMany({
    where: {
      schoolId,
      studentId,
      OR: [{ status: "ACCEPTED" }, { exam: { isGradesReleased: true } }],
    },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      exam: { select: { id: true, title: true, startDate: true } },
      examComponent: { select: { id: true, label: true, weightPct: true } },
    },
    orderBy: [{ exam: { startDate: "asc" } }, { subject: { name: "asc" } }],
  });

  const scales = await loadScales(schoolId);

  type Group = {
    subjectName: string;
    subjectCode: string | null;
    term: string;
    scores: number[];
    weights: number[];
  };
  const groups = new Map<string, Group>();

  for (const row of rows) {
    if (row.score === null || row.score === undefined || Number.isNaN(Number(row.score))) continue;
    const subjectName = row.subject?.name || "Subject";
    const term = row.exam?.title || "Continuous Assessment";
    const key = `${row.subjectId}::${row.examId || "continuous"}::${term}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        subjectName,
        subjectCode: row.subject?.code || null,
        term,
        scores: [],
        weights: [],
      };
      groups.set(key, group);
    }
    const weight = Number(row.examComponent?.weightPct);
    group.scores.push(Number(row.score));
    group.weights.push(Number.isFinite(weight) && weight > 0 ? weight : 1);
  }

  const records: TranscriptCourseRow[] = [];
  for (const group of groups.values()) {
    const weightTotal = group.weights.reduce((sum, w) => sum + w, 0);
    const weighted =
      weightTotal > 0
        ? group.scores.reduce((sum, score, index) => sum + score * group.weights[index], 0) /
          weightTotal
        : group.scores.reduce((sum, score) => sum + score, 0) / group.scores.length;
    const score = round(weighted, 1);
    const grade = gradeFromScale(score, scales);
    records.push({
      subjectName: group.subjectName,
      subjectCode: group.subjectCode,
      term: group.term,
      score,
      letter: grade.letter,
      points: round(grade.points, 2),
      credits: 3,
      remark: grade.remark || null,
    });
  }

  records.sort((a, b) =>
    a.subjectName.localeCompare(b.subjectName) || a.term.localeCompare(b.term)
  );

  const courseCount = records.length;
  const average = courseCount
    ? round(records.reduce((sum, row) => sum + (row.score ?? 0), 0) / courseCount, 1)
    : 0;
  const gpa = courseCount
    ? round(records.reduce((sum, row) => sum + row.points, 0) / courseCount, 2)
    : 0;
  const credits = records.reduce((sum, row) => sum + row.credits, 0);

  return {
    records,
    summary: {
      gpa,
      average,
      honors: courseCount ? honorFor(gpa) : "No Records",
      credits,
      courseCount,
    },
    computedAt: new Date().toISOString(),
  };
}

export const transcriptService = {
  async listTranscripts(
    schoolId: string,
    filters: { status?: string | null; studentId?: string | null; academicYear?: string | null }
  ) {
    const where: Record<string, unknown> = { schoolId };
    if (filters.status) where.status = String(filters.status).toUpperCase();
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.academicYear) where.academicYear = filters.academicYear;

    const records = await prisma.transcriptRecord.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: 500,
    });
    return records.map(serialize);
  },

  async getTranscript(id: string) {
    const record = await prisma.transcriptRecord.findUnique({ where: { id } });
    if (!record) throw httpError(404, "Transcript not found", "TRANSCRIPT_NOT_FOUND");
    return serialize(record);
  },

  /**
   * Registrar prepares (or re-prepares) a transcript. A DRAFT/REJECTED record for
   * the same student + academic year is refreshed in place rather than duplicated.
   */
  async prepareTranscript(
    actor: Actor,
    schoolId: string,
    input: {
      studentId: string;
      templateKey?: string | null;
      academicYear?: string | null;
      gradeLevel?: string | null;
    }
  ) {
    const studentId = String(input.studentId || "").trim();
    if (!studentId) throw httpError(400, "studentId is required", "INVALID_STUDENT");

    const student = await getIdentityUser(studentId);
    if (!student) throw httpError(404, "Student not found in the directory", "STUDENT_NOT_FOUND");

    const academicYear = (input.academicYear || "").trim() || defaultAcademicYear();
    const templateKey = resolveTranscriptTemplateKey(input.templateKey);
    const snapshot = await buildSnapshot(schoolId, studentId);

    if (snapshot.records.length === 0) {
      throw httpError(
        422,
        "No released grade records are available for this student yet.",
        "NO_GRADE_RECORDS"
      );
    }

    const existing = await prisma.transcriptRecord.findFirst({
      where: {
        schoolId,
        studentId,
        academicYear,
        status: { in: ["DRAFT", "REJECTED"] },
      },
      orderBy: { updatedAt: "desc" },
    });

    const data = {
      schoolId,
      studentId,
      studentName: student.name || "Student",
      studentEmail: student.email || null,
      gradeLevel: (input.gradeLevel || "").trim() || null,
      academicYear,
      templateKey,
      snapshot: JSON.stringify(snapshot),
      gpa: snapshot.summary.gpa,
      average: snapshot.summary.average,
      honors: snapshot.summary.honors,
      credits: snapshot.summary.credits,
      courseCount: snapshot.summary.courseCount,
      preparedBy: actor.id,
      preparedByName: actor.name || null,
      status: "DRAFT" as const,
      submittedAt: null,
      reviewedBy: null,
      reviewedByName: null,
      reviewedByRole: null,
      reviewedAt: null,
      reviewComment: null,
    };

    const record = existing
      ? await prisma.transcriptRecord.update({ where: { id: existing.id }, data })
      : await prisma.transcriptRecord.create({ data });

    return serialize(record);
  },

  async submitTranscript(id: string, actor: Actor) {
    const existing = await prisma.transcriptRecord.findUnique({ where: { id } });
    if (!existing) throw httpError(404, "Transcript not found", "TRANSCRIPT_NOT_FOUND");
    if (!["DRAFT", "REJECTED"].includes(existing.status)) {
      throw httpError(
        409,
        "Only draft or returned transcripts can be submitted for approval.",
        "INVALID_TRANSCRIPT_STATUS"
      );
    }

    const snapshot = await buildSnapshot(existing.schoolId, existing.studentId);
    if (snapshot.records.length === 0) {
      throw httpError(
        422,
        "No released grade records are available for this student yet.",
        "NO_GRADE_RECORDS"
      );
    }

    const record = await prisma.transcriptRecord.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        snapshot: JSON.stringify(snapshot),
        gpa: snapshot.summary.gpa,
        average: snapshot.summary.average,
        honors: snapshot.summary.honors,
        credits: snapshot.summary.credits,
        courseCount: snapshot.summary.courseCount,
        reviewedBy: null,
        reviewedByName: null,
        reviewedByRole: null,
        reviewedAt: null,
        reviewComment: null,
      },
    });

    let approvers = await getIdentityUsersByRoles(existing.schoolId, APPROVER_ROLES);
    if (approvers.length === 0) {
      approvers = await getIdentityUsersByRoles(existing.schoolId, FALLBACK_APPROVER_ROLES);
    }
    const recipients = approvers.filter((approver) => approver.id !== actor.id);
    if (recipients.length) {
      await notifyInAppMany(
        recipients.map((approver) => ({
          schoolId: existing.schoolId,
          userId: approver.id,
          eventKey: "TRANSCRIPT_SUBMITTED",
          title: "Transcript awaiting approval",
          body: `${existing.studentName}'s official transcript was submitted by the Registrar for your approval.`,
          href: "/transcripts",
          meta: { transcriptId: record.id, studentId: record.studentId },
        }))
      );
    }

    return serialize(record);
  },

  async reviewTranscript(
    id: string,
    actor: Actor,
    action: "APPROVE" | "REJECT",
    comment?: string | null
  ) {
    const existing = await prisma.transcriptRecord.findUnique({ where: { id } });
    if (!existing) throw httpError(404, "Transcript not found", "TRANSCRIPT_NOT_FOUND");
    if (existing.status !== "SUBMITTED") {
      throw httpError(
        409,
        "Only transcripts awaiting approval can be reviewed.",
        "INVALID_TRANSCRIPT_STATUS"
      );
    }

    const trimmed = (comment || "").trim();
    if (action === "REJECT" && !trimmed) {
      throw httpError(400, "A comment is required when returning a transcript.", "COMMENT_REQUIRED");
    }

    const status: TranscriptStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const record = await prisma.transcriptRecord.update({
      where: { id },
      data: {
        status,
        reviewedBy: actor.id,
        reviewedByName: actor.name || null,
        reviewedByRole: actor.role || null,
        reviewedAt: new Date(),
        reviewComment: trimmed || null,
      },
    });

    if (existing.preparedBy && existing.preparedBy !== actor.id) {
      const approved = action === "APPROVE";
      await notifyInApp({
        schoolId: existing.schoolId,
        userId: existing.preparedBy,
        eventKey: approved ? "TRANSCRIPT_APPROVED" : "TRANSCRIPT_RETURNED",
        title: approved ? "Transcript approved" : "Transcript returned for revision",
        body: approved
          ? `${existing.studentName}'s transcript was approved by ${actor.name || "administration"}. It can now be downloaded and printed.`
          : `${existing.studentName}'s transcript was returned by ${actor.name || "administration"}${
              trimmed ? `: ${trimmed}` : ""
            }`,
        href: "/transcripts",
        meta: { transcriptId: record.id, studentId: record.studentId },
      });
    }

    return serialize(record);
  },

  async buildPdf(id: string) {
    const record = await prisma.transcriptRecord.findUnique({ where: { id } });
    if (!record) throw httpError(404, "Transcript not found", "TRANSCRIPT_NOT_FOUND");
    if (record.status !== "APPROVED") {
      throw httpError(
        403,
        "This transcript must be approved by the Principal or a Vice Principal before it can be downloaded or printed.",
        "TRANSCRIPT_NOT_APPROVED"
      );
    }

    const snapshot = parseJson<TranscriptSnapshot | null>(record.snapshot, null);
    if (!snapshot || !Array.isArray(snapshot.records)) {
      throw httpError(409, "Transcript content is unavailable.", "TRANSCRIPT_SNAPSHOT_MISSING");
    }

    const school = await getIdentitySchool(record.schoolId);
    const [registrarUser, approverUser] = await Promise.all([
      record.preparedBy ? getIdentityUser(record.preparedBy).catch(() => null) : null,
      record.reviewedBy ? getIdentityUser(record.reviewedBy).catch(() => null) : null,
    ]);

    const rawSignatories: any = school?.documentSignatories;
    const signatories: Record<string, any> =
      typeof rawSignatories === "string"
        ? parseJson<Record<string, any>>(rawSignatories, {})
        : rawSignatories && typeof rawSignatories === "object"
          ? rawSignatories
          : {};
    const principalSlot = signatories?.principal;
    const principalUserId =
      typeof principalSlot === "string" ? principalSlot : principalSlot?.userId || null;
    let principalSignature: string | null = approverUser?.signatureUrl || null;
    if (!principalSignature && principalUserId) {
      const principalUser = await getIdentityUser(principalUserId).catch(() => null);
      principalSignature = principalUser?.signatureUrl || null;
    }

    const approverTitle =
      record.reviewedByRole === "PRINCIPAL"
        ? "Principal"
        : record.reviewedByRole === "VPI"
          ? "Vice Principal (Academic)"
          : record.reviewedByRole === "VPA"
            ? "Vice Principal (Administration)"
            : record.reviewedByRole === "SCHOOL_ADMIN"
              ? "School Administrator"
              : "Approving Authority";

    const registrar: TranscriptSignatory = {
      name: record.preparedByName || registrarUser?.name || "Registrar",
      title: "Registrar",
      signatureUrl: registrarUser?.signatureUrl || null,
    };
    const approver: TranscriptSignatory = {
      name: record.reviewedByName || approverUser?.name || "Approving Authority",
      title: approverTitle,
      signatureUrl: principalSignature,
    };

    const verificationCode = `TR-${record.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    const html = buildTranscriptHTML(record.templateKey, {
      transcriptId: record.id,
      verificationCode,
      studentName: record.studentName,
      studentEmail: record.studentEmail,
      studentId: record.studentId,
      gradeLevel: record.gradeLevel,
      academicYear: record.academicYear,
      issuedAt: (record.reviewedAt || record.updatedAt || new Date()).toISOString(),
      records: snapshot.records,
      summary: snapshot.summary,
      school: {
        name: school?.name || "School",
        address: school?.address || null,
        city: school?.city || null,
        region: school?.region || null,
        country: school?.country || null,
        contactEmail: school?.contactEmail || null,
        contactPhone: school?.contactPhone || null,
        logoUrl: school?.logoUrl || null,
        brandColor: school?.brandColor || null,
      },
      registrar,
      approver,
    });

    const pdfBuffer = await generatePDF({
      html,
      format: "A4",
      margin: { top: "8mm", bottom: "8mm", left: "8mm", right: "8mm" },
      printBackground: true,
    });

    const safeName = record.studentName.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return {
      buffer: pdfBuffer,
      filename: `${safeName || "Student"}_Official_Transcript.pdf`,
      templateKey: resolveTranscriptTemplateKey(record.templateKey),
    };
  },
};
