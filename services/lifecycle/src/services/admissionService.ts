import crypto from "node:crypto";
import prisma from "../lib/prisma";
import { findOrCreateIdentityUser, getSchoolStudentTotal, linkParentStudent, getIdentitySchool, verifyReturningStudent } from "../lib/identityClient";
import { createEntranceFee, getFee, randomPassword } from "../lib/financeClient";
import { addClassroomMember, getHomeroomPlacedStudentIds, resolveStudentNextGrade } from "../lib/classroomClient";
import { assertTransition, generateApplicationNumber } from "../domain/admissionStates";
import {
  parseAdmissionPolicy,
  isEnrollableStatus,
  parseApplicationNotes,
  applicantTypeFromNotes,
  type AdmissionPolicy,
} from "../domain/admissionPolicy";
import { notifyAdmissionStatusChange } from "../lib/admissionNotifications";
import { getParentChildIds } from "../lib/identityClient";
import { nextActionFor } from "../domain/admissionFunnel";

const parseDateSafely = (dateStr: any) => {
  if (!dateStr || String(dateStr).trim() === "") return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
};

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function formatPublicStatus(app: {
  id: string;
  applicationNumber: string | null;
  studentIdNumber: string | null;
  status: string;
  studentName: string;
  gradeLevelName: string | null;
  appliedAt: Date;
  feePaymentId: string | null;
  admissionDocuments?: { docType: string; status: string }[];
}) {
  return {
    id: app.id,
    applicationNumber: app.applicationNumber,
    studentIdNumber: app.studentIdNumber,
    status: app.status,
    studentName: app.studentName,
    gradeLevelName: app.gradeLevelName,
    appliedAt: app.appliedAt,
    documents: app.admissionDocuments ?? [],
    feePaymentId: app.feePaymentId,
  };
}

async function loadSchoolPolicy(schoolId: string): Promise<AdmissionPolicy> {
  const school = await getIdentitySchool(schoolId);
  return parseAdmissionPolicy(school?.admissionPolicy);
}

export const admissionService = {
  async getApplications(
    schoolId: string,
    opts?: {
      q?: string;
      status?: string;
      gradeLevelId?: string;
      page?: number | string;
      pageSize?: number | string;
      /** Raise the hard cap for exports (CSV). Normal listing stays at 100. */
      maxPageSize?: number;
    }
  ) {
    const where: any = { schoolId };
    if (opts?.status) where.status = String(opts.status).toUpperCase();
    if (opts?.gradeLevelId) where.gradeLevelId = opts.gradeLevelId;
    const q = opts?.q?.trim();
    if (q) {
      where.OR = [
        { studentName: { contains: q, mode: "insensitive" } },
        { parentName: { contains: q, mode: "insensitive" } },
        { parentEmail: { contains: q, mode: "insensitive" } },
        { studentEmail: { contains: q, mode: "insensitive" } },
      ];
    }
    const page = Math.max(1, Number(opts?.page) || 1);
    const cap = Math.min(5000, Math.max(100, Number(opts?.maxPageSize) || 100));
    const pageSize = Math.min(cap, Math.max(1, Number(opts?.pageSize) || 50));
    const [total, items] = await Promise.all([
      prisma.admissionApplication.count({ where }),
      prisma.admissionApplication.findMany({
        where,
        include: { admissionDocuments: true },
        orderBy: { appliedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, total, page, pageSize };
  },

  async getApplicationStatusCounts(schoolId: string) {
    const rows = await prisma.admissionApplication.groupBy({
      by: ["status"],
      where: { schoolId },
      _count: { _all: true },
    });
    return rows.map((r) => ({ status: r.status, count: r._count._all }));
  },

  async getMyApplications(
    schoolId: string,
    viewer: { id: string; email?: string | null; role: string }
  ) {
    if (viewer.role !== "PARENT") {
      throw Object.assign(new Error("Unauthorized"), { status: 403 });
    }
    const childIds = await getParentChildIds(viewer.id);
    const parentEmail = String(viewer.email || "").trim().toLowerCase();
    const or: any[] = [];
    if (childIds.length) {
      or.push({ studentUserId: { in: childIds } });
    }
    if (parentEmail) {
      or.push({ parentEmail: { equals: parentEmail, mode: "insensitive" } });
    }
    if (!or.length) return [];

    return prisma.admissionApplication.findMany({
      where: { schoolId, OR: or },
      select: {
        id: true,
        applicationNumber: true,
        studentName: true,
        status: true,
        gradeLevelName: true,
        appliedAt: true,
        reviewedAt: true,
        source: true,
      },
      orderBy: { appliedAt: "desc" },
      take: 100,
    });
  },

  async getApplication(id: string) {
    return prisma.admissionApplication.findUnique({
      where: { id },
      include: { admissionDocuments: true },
    });
  },

  /**
   * Server-derived "what happens next" for an application. Single source of truth for
   * every UI so the client never re-implements the status machine.
   */
  async getNextAction(id: string) {
    const app = await prisma.admissionApplication.findUnique({
      where: { id },
      include: { admissionDocuments: true },
    });
    if (!app) throw Object.assign(new Error("Application not found"), { status: 404 });
    const policy = await loadSchoolPolicy(app.schoolId);
    let fee: { id: string; status: string | null; balance: number | null } | null = null;
    if (app.feePaymentId) {
      const f = await getFee(app.feePaymentId);
      if (f) {
        fee = {
          id: f.id,
          status: f.status ?? null,
          balance:
            typeof f.balance === "number"
              ? f.balance
              : typeof f.amount === "number"
                ? Math.max(0, Number(f.amount) - Number(f.amountPaid || 0))
                : null,
        };
      }
    }
    const step = nextActionFor({
      status: app.status,
      feePaymentId: app.feePaymentId,
      classroomId: app.classroomId,
      fee,
      policy,
    });
    return {
      id: app.id,
      status: app.status,
      applicationNumber: app.applicationNumber,
      nextAction: step.action,
      blockedBy: step.blockedBy,
      required: step.required,
      fee,
      documents: (app.admissionDocuments ?? []).map((d: any) => ({
        docType: d.docType,
        status: d.status,
      })),
    };
  },

  async createApplication(schoolId: string, data: any, source = "STAFF_DIRECT") {
    const studentEmail =
      data.studentEmail && String(data.studentEmail).trim() !== ""
        ? String(data.studentEmail).trim().toLowerCase()
        : null;
    const parentEmail =
      data.parentEmail && String(data.parentEmail).trim() !== "" ? String(data.parentEmail).trim() : null;
    const studentPhone =
      data.studentPhone && String(data.studentPhone).trim() !== "" ? String(data.studentPhone).trim() : null;

    const applicantType =
      String(data.applicantType || "").toUpperCase() === "RETURNING" ? "RETURNING" : "NEW";

    let existingStudentUserId: string | null =
      data.existingStudentUserId && String(data.existingStudentUserId).trim()
        ? String(data.existingStudentUserId).trim()
        : null;

    let studentName = data.studentName;
    let gradeLevelId = data.gradeLevelId;
    let gradeLevelName = data.gradeLevelName || null;
    let parentName = data.parentName;
    let parentPhone = data.parentPhone;
    let gender = data.gender || "MALE";
    let address = data.address || null;
    let studentIdNumber: string | null = data.studentIdNumber ? String(data.studentIdNumber) : null;
    const dob = parseDateSafely(data.dob);

    if (source === "PUBLIC" && applicantType === "RETURNING") {
      const idNumber = data.studentIdNumber ? String(data.studentIdNumber).trim() : null;
      const email = studentEmail;
      if (!idNumber && !email) {
        throw Object.assign(
          new Error("Student ID or email is required for returning registration"),
          { status: 400 }
        );
      }
      const matched = await verifyReturningStudent(schoolId, { idNumber, email }, data.dob || null);
      existingStudentUserId = matched.id;
      studentIdNumber = matched.studentIdNumber || idNumber || studentIdNumber;
      studentName = matched.name || studentName;
      parentName = parentName || matched.parentName || "Parent";
      parentPhone = parentPhone || matched.parentPhone || matched.phone || "n/a";
      gender = data.gender || matched.gender || "MALE";
      address = address || matched.address;

      // Promotion-aware auto-grade for returning students.
      const resolution = await resolveStudentNextGrade(
        schoolId,
        matched.id,
        matched.gradeLevelId
      );
      if (resolution && resolution.allowReturn === false) {
        throw Object.assign(
          new Error("This student is not eligible to re-register at this time"),
          { status: 403, code: "RETURNING_NOT_ELIGIBLE", outcome: resolution.outcome }
        );
      }
      if (resolution && resolution.gradeLevelId) {
        gradeLevelId = resolution.gradeLevelId;
      } else {
        gradeLevelId = gradeLevelId || matched.gradeLevelId || "pending-assignment";
      }
    }

    const notesPayload = {
      ...parseApplicationNotes(typeof data.notes === "string" ? data.notes : null),
      ...(data.notes && typeof data.notes === "object" ? data.notes : {}),
      applicantType,
      ...(existingStudentUserId ? { existingStudentUserId } : {}),
    };

    const rawStatusToken = crypto.randomBytes(24).toString("hex");

    return prisma.admissionApplication
      .create({
        data: {
          schoolId,
          applicationNumber: generateApplicationNumber(schoolId),
          studentIdNumber,
          studentName,
          studentEmail,
          studentPhone,
          dob,
          gender,
          address,
          parentName,
          parentEmail,
          parentPhone,
          gradeLevelId: gradeLevelId || "pending-assignment",
          gradeLevelName,
          previousSchool: data.previousSchool || null,
          notes: JSON.stringify(notesPayload),
          source,
          status: "PENDING",
          statusTokenHash: hashToken(rawStatusToken),
          classroomId: data.classroomId || null,
          studentUserId: existingStudentUserId,
        },
      })
      .then((app) => ({ ...app, statusToken: rawStatusToken, applicantType }));
  },

  async updateApplication(id: string, data: any) {
    const current = await prisma.admissionApplication.findUnique({ where: { id } });
    if (!current) {
      throw Object.assign(new Error("Application not found"), { status: 404 });
    }

    if (data.status !== undefined && data.status !== current.status) {
      assertTransition(current.status, data.status);
      if (data.status === "ENROLLED") {
        return this.enroll(id, {
          classroomId: data.classroomId || current.classroomId,
          waiveFee: data.waiveFee,
          waiveDocs: data.waiveDocs,
          idempotencyKey: data.idempotencyKey,
        });
      }
      if (data.status === "APPROVED" || data.status === "FEE_PENDING") {
        // Reuse the transition path so the auto entrance invoice fires on approval.
        return this.transition(id, data.status, {
          amount: data.amount,
          entranceFeeAmount: data.entranceFeeAmount,
          createFee: data.createFee,
          reason: data.reason,
        });
      }
    }

    let nextNotes = data.notes;
    if (data.notes !== undefined) {
      const preserved = parseApplicationNotes(current.notes);
      const incoming =
        typeof data.notes === "string"
          ? parseApplicationNotes(data.notes)
          : data.notes && typeof data.notes === "object"
            ? (data.notes as Record<string, unknown>)
            : {};
      const applicantType =
        incoming.applicantType === "RETURNING" || preserved.applicantType === "RETURNING"
          ? "RETURNING"
          : incoming.applicantType || preserved.applicantType || "NEW";
      const existingStudentUserId =
        incoming.existingStudentUserId || preserved.existingStudentUserId || undefined;
      nextNotes = JSON.stringify({
        ...preserved,
        ...incoming,
        applicantType,
        ...(existingStudentUserId ? { existingStudentUserId } : {}),
      });
    }

    return prisma.admissionApplication.update({
      where: { id },
      data: {
        status: data.status !== undefined ? data.status : undefined,
        notes: nextNotes !== undefined ? nextNotes : undefined,
        documents: data.documents !== undefined ? data.documents : undefined,
        evaluation: data.evaluation !== undefined ? data.evaluation : undefined,
        classroomId: data.classroomId !== undefined ? data.classroomId : undefined,
        reviewedAt: data.status ? new Date() : undefined,
      },
      include: { admissionDocuments: true },
    });
  },

  async transition(id: string, to: string, opts: any = {}) {
    const current = await prisma.admissionApplication.findUnique({ where: { id } });
    if (!current) throw Object.assign(new Error("Application not found"), { status: 404 });
    const fromStatus = current.status;
    assertTransition(current.status, to);

    if (to === "ENROLLED") {
      const result = await this.enroll(id, opts);
      void notifyAdmissionStatusChange(
        { ...current, status: "ENROLLED" },
        fromStatus
      );
      return result;
    }

    if (to === "APPROVED" || to === "FEE_PENDING") {
      // Approving a fee-required application auto-raises the entrance invoice and parks
      // the application on FEE_PENDING, so staff never forget to bill the applicant.
      const policy = to === "APPROVED" ? await loadSchoolPolicy(current.schoolId) : null;
      const autoAmount =
        policy && policy.requireEntranceFee ? Number(policy.entranceFeeAmount) || 0 : 0;
      const needsAutoFee = to === "APPROVED" && autoAmount > 0 && !current.feePaymentId;
      const amount = Number(
        opts.amount || opts.entranceFeeAmount || (needsAutoFee ? autoAmount : 0)
      );
      const shouldCreate =
        !current.feePaymentId && amount > 0 && (to === "FEE_PENDING" || opts.createFee || needsAutoFee);
      let feePaymentId = current.feePaymentId;
      let target = to;
      if (shouldCreate) {
        try {
          const fee = await createEntranceFee({
            schoolId: current.schoolId,
            applicationId: current.id,
            studentId: current.studentUserId,
            amount,
          });
          feePaymentId = fee.id;
          target = "FEE_PENDING";
        } catch (err: any) {
          // Finance unavailable: keep the approval, let staff retry the invoice explicitly.
          console.warn("[lifecycle] auto entrance fee failed:", err?.message || err);
          target = "APPROVED";
        }
      }
      const updated = await prisma.admissionApplication.update({
        where: { id },
        data: { status: target, feePaymentId, reviewedAt: new Date() },
        include: { admissionDocuments: true },
      });
      void notifyAdmissionStatusChange(updated, fromStatus);
      return updated;
    }

    const updated = await prisma.admissionApplication.update({
      where: { id },
      data: {
        status: to,
        notes: opts.reason ? `${current.notes || ""}\n[${to}] ${opts.reason}`.trim() : current.notes,
        reviewedAt: new Date(),
      },
      include: { admissionDocuments: true },
    });
    void notifyAdmissionStatusChange(updated, fromStatus);
    return updated;
  },

  async assertEnrollGates(app: any, opts: { waiveFee?: boolean; waiveDocs?: boolean; policy?: AdmissionPolicy }) {
    const policy = opts.policy || (await loadSchoolPolicy(app.schoolId));

    if (policy.requireEntranceFee && !opts.waiveFee) {
      if (!app.feePaymentId) {
        throw Object.assign(new Error("Entrance fee required before enroll"), {
          status: 400,
          code: "FEE_REQUIRED",
        });
      }
      const fee = await getFee(app.feePaymentId);
      if (!fee || fee.status !== "PAID") {
        throw Object.assign(new Error("Entrance fee not paid"), {
          status: 400,
          code: "FEE_REQUIRED",
        });
      }
    }

    if (!opts.waiveDocs && policy.requiredDocTypes?.length) {
      const docs = app.admissionDocuments || (await prisma.admissionDocument.findMany({ where: { applicationId: app.id } }));
      for (const docType of policy.requiredDocTypes) {
        const ok = docs.some((d: any) => d.docType === docType && d.status === "APPROVED");
        if (!ok) {
          throw Object.assign(new Error(`Required document missing or unapproved: ${docType}`), {
            status: 400,
            code: "DOCS_REQUIRED",
            docType,
          });
        }
      }
    }

    return policy;
  },

  async enroll(
    id: string,
    opts: {
      classroomId?: string | null;
      waiveFee?: boolean;
      waiveDocs?: boolean;
      policy?: AdmissionPolicy;
      idempotencyKey?: string;
    } = {}
  ) {
    const app = await prisma.admissionApplication.findUnique({
      where: { id },
      include: { admissionDocuments: true },
    });
    if (!app) throw Object.assign(new Error("Application not found"), { status: 404 });

    if (app.status === "ENROLLED" && app.studentUserId) {
      return { ...app, idempotent: true, credentials: null };
    }

    if (!isEnrollableStatus(app.status)) {
      throw Object.assign(
        new Error(
          `Cannot enroll from status ${app.status}. Approve the application (and clear fee/docs gates) first.`
        ),
        { status: 400, code: "INVALID_STATUS_TRANSITION" }
      );
    }

    const policy = await this.assertEnrollGates(app, opts);

    if (policy.requireClassroomOnEnroll && !(opts.classroomId || app.classroomId)) {
      throw Object.assign(new Error("Classroom assignment required before enroll"), {
        status: 400,
        code: "CLASSROOM_REQUIRED",
      });
    }

    const studentEmail =
      app.studentEmail && app.studentEmail.trim() !== ""
        ? app.studentEmail
        : `student_${app.id.slice(0, 8)}@placeholder.local`;

    const studentPassword = randomPassword();
    const feeCohort = applicantTypeFromNotes(app.notes) === "RETURNING" ? "RETURNING" : "NEW";
    const isReturning = feeCohort === "RETURNING";
    const studentUser = await findOrCreateIdentityUser({
      email: studentEmail,
      name: app.studentName,
      role: "STUDENT",
      schoolId: app.schoolId,
      password: studentPassword,
      mustChangePassword: !isReturning,
      sendWelcomeEmail: !isReturning,
      dob: app.dob,
      gender: app.gender,
      address: app.address,
      parentName: app.parentName,
      parentPhone: app.parentPhone,
      gradeLevelId: app.gradeLevelId,
      feeCohort,
    });

    const studentCreated = studentUser.created !== false;
    let parentUserId: string | null = app.parentUserId;
    let parentPassword: string | undefined;
    let parentCreated = false;
    let parentLinkFailed = false;
    if (app.parentEmail && app.parentEmail.trim() !== "") {
      parentPassword = randomPassword();
      const parentUser = await findOrCreateIdentityUser({
        email: app.parentEmail.trim(),
        name: app.parentName,
        role: "PARENT",
        schoolId: app.schoolId,
        password: parentPassword,
        mustChangePassword: true,
        sendWelcomeEmail: true,
        phone: app.parentPhone,
      });
      parentUserId = parentUser.id;
      parentCreated = Boolean(parentUser.created);
      try {
        await linkParentStudent(parentUser.id, studentUser.id);
      } catch (err: any) {
        // Non-fatal: the parent account exists; record the gap for follow-up.
        parentLinkFailed = true;
        console.warn("[lifecycle] parent-student link failed:", err?.message || err);
      }
    }

    let classAssignFailed = false;
    const classroomId = opts.classroomId || app.classroomId;
    if (classroomId) {
      try {
        await addClassroomMember(classroomId, studentUser.id, "STUDENT");
      } catch (err: any) {
        console.warn("[lifecycle] classroom assign failed:", err.message);
        classAssignFailed = true;
      }
    }

    // Conditional claim: only the first concurrent caller flips the row to ENROLLED.
    // Replays/races get count 0 and return the already-enrolled application (idempotent).
    const idempotencyKey = opts.idempotencyKey || `enroll:${id}`;
    const claim = await prisma.admissionApplication.updateMany({
      where: { id, status: { not: "ENROLLED" } },
      data: {
        status: "ENROLLED",
        studentUserId: studentUser.id,
        parentUserId,
        classroomId: classroomId || null,
        enrolledAt: new Date(),
        classAssignFailed,
      },
    });
    if (claim.count === 0) {
      const already = await prisma.admissionApplication.findUnique({
        where: { id },
        include: { admissionDocuments: true },
      });
      return { ...(already as any), idempotent: true, idempotencyKey, credentials: null };
    }
    const updated = await prisma.admissionApplication.findUnique({
      where: { id },
      include: { admissionDocuments: true },
    });

    return {
      ...(updated as any),
      credentials: {
        studentEmail,
        studentPassword: studentCreated ? studentPassword : undefined,
        studentMustChangePassword: studentCreated ? !isReturning : undefined,
        parentEmail: app.parentEmail,
        parentPassword: parentCreated ? parentPassword : undefined,
        parentMustChangePassword: parentCreated ? true : undefined,
        welcomeEmailSent: studentCreated ? !isReturning : false,
      },
      idempotencyKey,
      classAssignFailed,
      parentLinkFailed,
      policySnapshot: {
        requireEntranceFee: policy.requireEntranceFee,
        requiredDocTypes: policy.requiredDocTypes,
        waivedFee: Boolean(opts.waiveFee),
        waivedDocs: Boolean(opts.waiveDocs),
      },
    };
  },

  async addDocument(applicationId: string, data: any) {
    const app = await prisma.admissionApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw Object.assign(new Error("Application not found"), { status: 404 });

    const fileUrl = String(data.fileUrl || "");
    if (!fileUrl) throw Object.assign(new Error("fileUrl required"), { status: 400 });

    let status = data.status || "UPLOADED";
    if (data.scanStatus === "PENDING_SCAN" || data.runScan) {
      const { runVirusScan } = await import("../lib/storage");
      const scan = await runVirusScan(data.storageKey || fileUrl);
      if (scan === "INFECTED") {
        throw Object.assign(new Error("File failed virus scan"), { status: 400, code: "VIRUS_DETECTED" });
      }
      status = "UPLOADED";
    }

    return prisma.admissionDocument.create({
      data: {
        applicationId,
        schoolId: app.schoolId,
        docType: data.docType || "OTHER",
        status,
        fileUrl,
        fileName: data.fileName || null,
        mimeType: data.mimeType || null,
        sizeBytes: data.sizeBytes != null ? Number(data.sizeBytes) : null,
        uploadedBy: data.uploadedBy || null,
      },
    });
  },

  async createDocumentUpload(applicationId: string, data: any) {
    const app = await prisma.admissionApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw Object.assign(new Error("Application not found"), { status: 404 });
    const { createAdmissionUploadUrl, assertAllowedMime } = await import("../lib/storage");
    const mimeType = String(data.mimeType || "application/pdf");
    assertAllowedMime(mimeType);
    const presign = await createAdmissionUploadUrl({
      schoolId: app.schoolId,
      applicationId,
      docType: String(data.docType || "OTHER"),
      fileName: String(data.fileName || "document.pdf"),
      mimeType,
    });
    return { ...presign, applicationId, docType: data.docType || "OTHER", mimeType };
  },

  async confirmDocumentUpload(applicationId: string, data: any) {
    return this.addDocument(applicationId, {
      ...data,
      runScan: true,
      status: "UPLOADED",
    });
  },

  async onFeePaid(feeId: string, applicationId?: string) {
    const app = applicationId
      ? await prisma.admissionApplication.findUnique({ where: { id: applicationId } })
      : await prisma.admissionApplication.findFirst({ where: { feePaymentId: feeId } });
    if (!app) return null;
    // Never advance an application via an unrelated fee id.
    if (app.feePaymentId && feeId && app.feePaymentId !== feeId) return app;
    if (app.status === "FEE_PENDING") {
      return prisma.admissionApplication.update({
        where: { id: app.id },
        data: { status: "DOCS_PENDING", feePaymentId: feeId || app.feePaymentId },
        include: { admissionDocuments: true },
      });
    }
    return app;
  },

  async reviewDocument(docId: string, status: "APPROVED" | "REJECTED", reviewerId?: string, reason?: string) {
    return prisma.admissionDocument.update({
      where: { id: docId },
      data: {
        status,
        reviewedBy: reviewerId || null,
        reviewedAt: new Date(),
        rejectionReason: reason || null,
      },
    });
  },

  async withdraw(id: string) {
    const app = await prisma.admissionApplication.findUnique({ where: { id } });
    if (!app) throw Object.assign(new Error("Application not found"), { status: 404 });
    if (app.status === "ENROLLED") {
      throw Object.assign(new Error("Cannot withdraw enrolled application"), { status: 400 });
    }
    assertTransition(app.status, "WITHDRAWN");
    return prisma.admissionApplication.update({
      where: { id },
      data: { status: "WITHDRAWN" },
    });
  },

  async publicStatus(id: string, rawToken: string) {
    const app = await prisma.admissionApplication.findUnique({
      where: { id },
      include: { admissionDocuments: { select: { docType: true, status: true } } },
    });
    if (!app || !app.statusTokenHash || app.statusTokenHash !== hashToken(rawToken)) {
      throw Object.assign(new Error("Not found"), { status: 404 });
    }
    return formatPublicStatus(app);
  },

  async publicStatusByReference(schoolId: string, applicationNumber: string, rawToken: string) {
    const number = String(applicationNumber || "").trim();
    const token = String(rawToken || "").trim();
    if (!schoolId || !number || !token) {
      throw Object.assign(new Error("Reference number and access code are required"), {
        status: 400,
      });
    }
    const app = await prisma.admissionApplication.findFirst({
      where: {
        schoolId,
        applicationNumber: { equals: number, mode: "insensitive" },
      },
      include: { admissionDocuments: { select: { docType: true, status: true } } },
    });
    if (!app || !app.statusTokenHash || app.statusTokenHash !== hashToken(token)) {
      throw Object.assign(new Error("Not found"), { status: 404 });
    }
    return formatPublicStatus(app);
  },

  /** Public "look me up" for returning students: verify identity and return prefill + promotion-aware locked grade. */
  async verifyReturningForPublic(schoolId: string, body: any) {
    const idNumber = body.studentIdNumber ? String(body.studentIdNumber).trim() : null;
    const email = body.studentEmail ? String(body.studentEmail).trim().toLowerCase() : null;
    if (!idNumber) {
      throw Object.assign(new Error("Student ID is required"), { status: 400 });
    }
    const dob = body.dob ? String(body.dob) : null;
    const matched = await verifyReturningStudent(schoolId, { idNumber, email: email || null }, dob);
    const resolution = await resolveStudentNextGrade(schoolId, matched.id, matched.gradeLevelId);
    if (resolution && resolution.allowReturn === false) {
      throw Object.assign(
        new Error("This student is not eligible to re-register at this time"),
        { status: 403, code: "RETURNING_NOT_ELIGIBLE", outcome: resolution.outcome }
      );
    }
    return {
      studentUserId: matched.id,
      studentIdNumber: matched.studentIdNumber || idNumber || null,
      name: matched.name,
      email: matched.email,
      gender: matched.gender,
      address: matched.address,
      parentName: matched.parentName,
      parentPhone: matched.parentPhone,
      phone: matched.phone,
      feeCohort: matched.feeCohort,
      gradeLevelId: resolution?.gradeLevelId || matched.gradeLevelId || null,
      gradeLocked: Boolean(resolution?.locked),
      promotionOutcome: resolution?.outcome || "UNKNOWN",
    };
  },

  async createEntranceFeeForApplication(id: string, amount: number) {
    const app = await prisma.admissionApplication.findUnique({ where: { id } });
    if (!app) throw Object.assign(new Error("Application not found"), { status: 404 });
    if (app.feePaymentId) {
      return { feePaymentId: app.feePaymentId, existing: true };
    }
    const fee = await createEntranceFee({
      schoolId: app.schoolId,
      applicationId: app.id,
      studentId: app.studentUserId,
      amount,
    });
    const updated = await prisma.admissionApplication.update({
      where: { id },
      data: { feePaymentId: fee.id, status: app.status === "APPROVED" ? "FEE_PENDING" : app.status },
    });
    return { application: updated, fee };
  },

  async assignClassroom(id: string, classroomId: string) {
    const app = await prisma.admissionApplication.findUnique({ where: { id } });
    if (!app) throw Object.assign(new Error("Application not found"), { status: 404 });
    if (app.status !== "ENROLLED" || !app.studentUserId) {
      throw Object.assign(new Error("Application must be enrolled"), { status: 400 });
    }
    await addClassroomMember(classroomId, app.studentUserId, "STUDENT");
    return prisma.admissionApplication.update({
      where: { id },
      data: { classroomId, classAssignFailed: false },
    });
  },

  /** Staff-only summary linking admissions enroll outcomes to class placement. */
  async getPlacementSummary(schoolId: string) {
    const placedIds = await getHomeroomPlacedStudentIds(schoolId);
    const totalStudents = await getSchoolStudentTotal(schoolId);
    const enrolledApps = await prisma.admissionApplication.findMany({
      where: { schoolId, status: "ENROLLED", studentUserId: { not: null } },
      select: {
        id: true,
        studentUserId: true,
        studentName: true,
        gradeLevelId: true,
        gradeLevelName: true,
        classAssignFailed: true,
        source: true,
        enrolledAt: true,
      },
      orderBy: { enrolledAt: "desc" },
      take: 200,
    });

    const needsPlacement = enrolledApps.filter(
      (app) =>
        app.classAssignFailed ||
        (app.studentUserId != null && !placedIds.has(app.studentUserId))
    );

    const readyToEnroll = await prisma.admissionApplication.count({
      where: {
        schoolId,
        status: { in: ["APPROVED", "FEE_PENDING", "DOCS_PENDING"] },
      },
    });

    const applicationIntents: Array<{
      studentUserId: string;
      applicationId: string;
      gradeLevelId: string | null;
      gradeLevelName: string | null;
    }> = [];
    const intentSeen = new Set<string>();
    for (const app of enrolledApps) {
      if (!app.studentUserId || intentSeen.has(app.studentUserId)) continue;
      intentSeen.add(app.studentUserId);
      applicationIntents.push({
        studentUserId: app.studentUserId,
        applicationId: app.id,
        gradeLevelId: app.gradeLevelId || null,
        gradeLevelName: app.gradeLevelName,
      });
    }

    return {
      homeroomPlacedCount: placedIds.size,
      totalStudents,
      unplacedStudentCount: Math.max(0, totalStudents - placedIds.size),
      admissionsNeedsPlacement: needsPlacement.length,
      readyToEnrollCount: readyToEnroll,
      applicationIntents,
      items: needsPlacement.slice(0, 25).map((app) => ({
        applicationId: app.id,
        studentUserId: app.studentUserId,
        studentName: app.studentName,
        gradeLevelId: app.gradeLevelId,
        gradeLevelName: app.gradeLevelName,
        classAssignFailed: app.classAssignFailed,
        source: app.source,
        enrolledAt: app.enrolledAt,
      })),
    };
  },

  async bulkTransition(
    schoolId: string,
    input: {
      applicationIds: string[];
      to: string;
      reason?: string;
      waiveFee?: boolean;
      waiveDocs?: boolean;
      createFee?: boolean;
      amount?: number;
    }
  ) {
    const ids = [...new Set((input.applicationIds || []).filter(Boolean))].slice(0, 50);
    if (!ids.length) {
      throw Object.assign(new Error("applicationIds required"), { status: 400 });
    }
    const to = String(input.to || "").toUpperCase();
    if (!to) throw Object.assign(new Error("to status required"), { status: 400 });

    const succeeded: Array<{ id: string; status: string }> = [];
    const failed: Array<{ id: string; error: string; code?: string }> = [];

    for (const id of ids) {
      try {
        const app = await prisma.admissionApplication.findFirst({ where: { id, schoolId } });
        if (!app) throw Object.assign(new Error("Application not found"), { status: 404 });
        const result = await this.transition(id, to, {
          reason: input.reason,
          waiveFee: input.waiveFee,
          waiveDocs: input.waiveDocs,
          createFee: input.createFee,
          amount: input.amount,
        });
        succeeded.push({ id, status: result.status || to });
      } catch (err: any) {
        failed.push({ id, error: err.message || "Transition failed", code: err.code });
      }
    }

    return { succeeded, failed, total: ids.length };
  },

  async bulkEnroll(
    schoolId: string,
    input: {
      applicationIds: string[];
      classroomId?: string | null;
      waiveFee?: boolean;
      waiveDocs?: boolean;
    }
  ) {
    const ids = [...new Set((input.applicationIds || []).filter(Boolean))].slice(0, 50);
    if (!ids.length) {
      throw Object.assign(new Error("applicationIds required"), { status: 400 });
    }

    const succeeded: Array<{ id: string; studentUserId: string | null; classAssignFailed?: boolean }> =
      [];
    const failed: Array<{ id: string; error: string; code?: string }> = [];

    for (const id of ids) {
      try {
        const app = await prisma.admissionApplication.findFirst({ where: { id, schoolId } });
        if (!app) throw Object.assign(new Error("Application not found"), { status: 404 });
        const result = await this.enroll(id, {
          classroomId: input.classroomId,
          waiveFee: input.waiveFee,
          waiveDocs: input.waiveDocs,
          idempotencyKey: `bulk-enroll-${id}`,
        });
        succeeded.push({
          id,
          studentUserId: result.studentUserId || null,
          classAssignFailed: result.classAssignFailed,
        });
      } catch (err: any) {
        failed.push({ id, error: err.message || "Enroll failed", code: err.code });
      }
    }

    return { succeeded, failed, total: ids.length };
  },
};
