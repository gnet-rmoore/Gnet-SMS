import prisma from "../lib/prisma";
import { getClassroomsByMember, getClassroomById, getClassroomMembers } from "../lib/classroomClient";
import { getIdentityUsersByIds, getStudentParentIds, getSchoolGradebookConfig } from "../lib/identityClient";
import { notifyInAppMany } from "../lib/notifyInApp";
import {
  assertStudentInClass,
  assertTeacherClassAccess,
  assertWithinSubmissionDeadline,
  notifyTeacherGradeDecision,
} from "../lib/gradeAccess";
import { gradeEditGrantService } from "./gradeEditGrantService";
import {
  parseAssessmentStructure,
  resolveEffectiveAssessmentStructure,
  serializeAssessmentStructure,
} from "../lib/assessmentStructure";

const REVIEW_STATUSES = new Set(["ACCEPTED", "REJECTED"]);

/** Timeline status for list/detail UI (does not replace stored COMPLETED). */
function deriveExamDisplayStatus(exam: {
  status?: string | null;
  startDate: Date | string;
  endDate: Date | string;
}): string {
  if (exam.status === "COMPLETED") return "COMPLETED";
  const now = Date.now();
  const start = new Date(exam.startDate).getTime();
  const end = new Date(exam.endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return exam.status || "SCHEDULED";
  if (now > end) return "ENDED";
  if (now >= start && now <= end) return "IN_PROGRESS";
  return "SCHEDULED";
}

async function enrichGradeRows(rows: any[]) {
  if (!rows.length) return [];

  const userIds = [
    ...rows.flatMap((r) => [r.studentId, r.enteredBy, r.reviewedBy].filter(Boolean) as string[]),
  ];
  const classIds = [...new Set(rows.map((r) => r.classId).filter(Boolean))];
  const users = await getIdentityUsersByIds(userIds);
  const classrooms = await Promise.all(classIds.map((id) => getClassroomById(id)));
  const classroomMap = new Map(
    classrooms.filter(Boolean).map((c) => [c!.id, c!])
  );

  return rows.map((row) => {
    const student = users.get(row.studentId);
    const teacher = row.enteredBy ? users.get(row.enteredBy) : null;
    const reviewer = row.reviewedBy ? users.get(row.reviewedBy) : null;
    const cls = classroomMap.get(row.classId);
    const assessmentTitle =
      row.exam?.title ||
      row.examComponent?.label ||
      row.subject?.name ||
      "Assessment";
    return {
      ...row,
      assessmentTitle,
      classroom: cls
        ? { id: cls.id, name: cls.name }
        : { id: row.classId, name: "Classroom" },
      student: student
        ? {
            id: student.id,
            name: student.name,
            email: student.email,
            photoUrl: student.photoUrl || null,
          }
        : { id: row.studentId, name: "Unknown student", email: "", photoUrl: null },
      teacher: teacher
        ? {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            photoUrl: teacher.photoUrl || null,
          }
        : { id: row.enteredBy || "", name: "Unknown teacher", email: "", photoUrl: null },
      reviewer: reviewer
        ? {
            id: reviewer.id,
            name: reviewer.name,
            email: reviewer.email,
            photoUrl: reviewer.photoUrl || null,
          }
        : null,
    };
  });
}

async function syncSubmissionBatchStatus(batchId: string | null | undefined, reviewerId?: string) {
  if (!batchId) return;
  const entries = await prisma.gradeEntry.findMany({
    where: { submissionBatchId: batchId },
    select: { status: true },
  });
  if (!entries.length) return;
  const statuses = entries.map((e) => e.status);
  let status = "MIXED";
  if (statuses.every((s) => s === "ACCEPTED")) status = "ACCEPTED";
  else if (statuses.every((s) => s === "REJECTED")) status = "REJECTED";
  else if (statuses.every((s) => s === "SUBMITTED")) status = "SUBMITTED";
  else if (statuses.some((s) => s === "SUBMITTED")) status = "SUBMITTED";
  else status = "MIXED";

  await prisma.gradeSubmissionBatch.update({
    where: { id: batchId },
    data: {
      status,
      ...(reviewerId && status !== "SUBMITTED"
        ? { reviewedBy: reviewerId, reviewedAt: new Date() }
        : {}),
      gradeCount: entries.length,
    },
  });
}

async function createSubmissionBatch(opts: {
  schoolId: string;
  classId: string;
  examId?: string | null;
  examComponentId?: string | null;
  subjectId?: string | null;
  teacherId: string;
  entryIds: string[];
  feedback?: string | null;
}) {
  if (!opts.entryIds.length) return null;
  const batch = await prisma.gradeSubmissionBatch.create({
    data: {
      schoolId: opts.schoolId,
      classId: opts.classId,
      examId: opts.examId || null,
      examComponentId: opts.examComponentId || null,
      subjectId: opts.subjectId || null,
      teacherId: opts.teacherId,
      status: "SUBMITTED",
      gradeCount: opts.entryIds.length,
      feedback: opts.feedback || null,
    },
  });
  await prisma.gradeEntry.updateMany({
    where: { id: { in: opts.entryIds } },
    data: { submissionBatchId: batch.id },
  });
  return batch;
}

const gradeReviewInclude = {
  exam: { select: { id: true, title: true } },
  examComponent: {
    select: { id: true, label: true, shortCode: true, periodId: true },
  },
  subject: { select: { id: true, name: true, code: true } },
} as const;

/**
 * Ported from src/server/services/examService.ts.
 * - Enriches student/teacher from Identity internal API.
 * - getTeacherClassrooms/getSubmissionsSummary/getExamGrades call Classroom via classroomClient.
 */

/** Resolve the ACTIVE AcademicYear.id for grade-entry attribution; literal fallback for legacy schools. */
async function resolveSchoolYearId(schoolId: string): Promise<string> {
  const year = await prisma.academicYear.findFirst({
    where: { schoolId, status: "ACTIVE" },
    orderBy: { activatedAt: "desc" },
    select: { id: true },
  });
  return year?.id ?? "CURRENT_YEAR";
}

export const examService = {
  async getPendingGrades(
    schoolId: string,
    opts?: { page?: number; limit?: number }
  ) {
    const page = Math.max(1, opts?.page || 1);
    const limit = Math.min(50, Math.max(1, opts?.limit || 20));
    const skip = (page - 1) * limit;

    const [totalBatches, batches] = await Promise.all([
      prisma.gradeSubmissionBatch.count({
        where: { schoolId, status: { in: ["SUBMITTED", "MIXED"] } },
      }),
      prisma.gradeSubmissionBatch.findMany({
        where: { schoolId, status: { in: ["SUBMITTED", "MIXED"] } },
        orderBy: { submittedAt: "desc" },
        skip,
        take: limit,
        include: {
          entries: {
            where: { status: "SUBMITTED" },
            include: gradeReviewInclude,
            orderBy: { updatedAt: "desc" },
          },
        },
      }),
    ]);

    // Legacy SUBMITTED rows without a batch
    const orphanRows =
      page === 1
        ? await prisma.gradeEntry.findMany({
            where: {
              schoolId,
              status: "SUBMITTED",
              submissionBatchId: null,
            },
            include: gradeReviewInclude,
            orderBy: { updatedAt: "desc" },
            take: 100,
          })
        : [];

    const enrichedBatches = [];
    for (const b of batches) {
      const grades = await enrichGradeRows(b.entries);
      if (!grades.length) continue;
      const sample = grades[0];
      enrichedBatches.push({
        id: b.id,
        schoolId: b.schoolId,
        classId: b.classId,
        examId: b.examId,
        examComponentId: b.examComponentId,
        subjectId: b.subjectId,
        teacherId: b.teacherId,
        status: b.status,
        submittedAt: b.submittedAt,
        reviewedBy: b.reviewedBy,
        reviewedAt: b.reviewedAt,
        feedback: b.feedback,
        gradeCount: grades.length,
        assessmentTitle: sample.assessmentTitle,
        classroom: sample.classroom,
        teacher: sample.teacher,
        subject: sample.subject,
        exam: sample.exam,
        examComponent: sample.examComponent,
        grades,
      });
    }

    if (orphanRows.length) {
      const grades = await enrichGradeRows(orphanRows);
      // Group orphans client-compat as synthetic batches
      const map = new Map<string, any[]>();
      for (const g of grades) {
        const key = `${g.examId || g.examComponentId}|${g.classId}|${g.enteredBy}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(g);
      }
      for (const [, gs] of map) {
        const sample = gs[0];
        enrichedBatches.push({
          id: `orphan:${sample.id}`,
          schoolId,
          classId: sample.classId,
          examId: sample.examId,
          examComponentId: sample.examComponentId,
          subjectId: sample.subjectId,
          teacherId: sample.enteredBy,
          status: "SUBMITTED",
          submittedAt: sample.updatedAt || sample.enteredAt,
          gradeCount: gs.length,
          assessmentTitle: sample.assessmentTitle,
          classroom: sample.classroom,
          teacher: sample.teacher,
          subject: sample.subject,
          exam: sample.exam,
          examComponent: sample.examComponent,
          grades: gs,
          orphan: true,
        });
      }
    }

    const flatGrades = enrichedBatches.flatMap((b) => b.grades);
    return {
      page,
      limit,
      totalBatches,
      totalGrades: flatGrades.length,
      batches: enrichedBatches,
      /** @deprecated flat list for older clients */
      grades: flatGrades,
    };
  },

  /** Teacher hub: own submitted / returned / recently approved grades. */
  async getTeacherGradeSubmissions(
    schoolId: string,
    teacherId: string,
    opts?: { page?: number; limit?: number; status?: string }
  ) {
    const page = Math.max(1, opts?.page || 1);
    const limit = Math.min(100, Math.max(1, opts?.limit || 50));
    const skip = (page - 1) * limit;
    const statusFilter = opts?.status
      ? { status: opts.status }
      : { status: { in: ["SUBMITTED", "REJECTED", "ACCEPTED"] } };

    const where = {
      schoolId,
      enteredBy: teacherId,
      ...statusFilter,
    };

    const [total, rows] = await Promise.all([
      prisma.gradeEntry.count({ where }),
      prisma.gradeEntry.findMany({
        where,
        include: gradeReviewInclude,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const grades = await enrichGradeRows(rows);
    return { page, limit, total, grades };
  },

  async bulkReviewGradeEntries(
    schoolId: string,
    reviewerId: string,
    data: { ids: string[]; status: string; feedback?: string | null }
  ) {
    const status = String(data.status || "").toUpperCase();
    if (!REVIEW_STATUSES.has(status)) {
      throw Object.assign(new Error("status must be ACCEPTED or REJECTED"), {
        status: 400,
      });
    }
    if (status === "REJECTED" && !String(data.feedback || "").trim()) {
      throw Object.assign(new Error("Feedback is required when rejecting grades"), {
        status: 400,
      });
    }
    const ids = [...new Set((data.ids || []).filter(Boolean))];
    if (!ids.length) {
      throw Object.assign(new Error("At least one grade id is required"), {
        status: 400,
      });
    }

    const results: { id: string; ok: boolean; error?: string }[] = [];
    const notified = new Set<string>();
    for (const id of ids) {
      try {
        await this.updateGradeEntryStatus(id, reviewerId, {
          status,
          feedback: data.feedback,
          schoolId,
          skipNotify: true,
        });
        results.push({ id, ok: true });
      } catch (err: any) {
        results.push({ id, ok: false, error: err.message || "Failed" });
      }
    }

    const okIds = results.filter((r) => r.ok).map((r) => r.id);
    if (okIds.length) {
      const rows = await prisma.gradeEntry.findMany({
        where: { id: { in: okIds } },
        select: {
          enteredBy: true,
          schoolId: true,
          classId: true,
          examId: true,
          examComponentId: true,
          submissionBatchId: true,
        },
      });
      for (const row of rows) {
        const key = row.enteredBy;
        if (!key || notified.has(key)) continue;
        notified.add(key);
        const count = rows.filter((r) => r.enteredBy === key).length;
        await notifyTeacherGradeDecision({
          schoolId: row.schoolId,
          teacherId: key,
          eventKey: status === "REJECTED" ? "GRADE_RETURNED" : "GRADE_APPROVED",
          title:
            status === "REJECTED"
              ? "Grades returned for correction"
              : "Grades approved",
          body:
            status === "REJECTED"
              ? `${count} mark(s) were returned. ${String(data.feedback || "").slice(0, 180)}`
              : `${count} mark(s) were approved and locked.`,
          href: "/grade-review",
          meta: { count, status },
        });
      }
    }

    return {
      status,
      reviewed: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok),
      total: ids.length,
    };
  },

  async getExams(
    schoolId: string,
    query?: {
      page?: number;
      pageSize?: number;
      q?: string;
      status?: string;
      periodId?: string;
    }
  ) {
    const wantsPaging = query?.page != null || query?.pageSize != null;
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 50));
    const now = new Date();

    const where: any = { schoolId };
    const q = query?.q?.trim();
    if (q) {
      where.title = { contains: q, mode: "insensitive" };
    }
    if (query?.periodId) {
      where.examComponent = { periodId: query.periodId };
    }
    const status = query?.status?.toUpperCase();
    if (status === "COMPLETED") {
      where.status = "COMPLETED";
    } else if (status === "SCHEDULED") {
      where.status = { not: "COMPLETED" };
      where.startDate = { gt: now };
    } else if (status === "IN_PROGRESS") {
      where.status = { not: "COMPLETED" };
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    } else if (status === "ENDED") {
      where.status = { not: "COMPLETED" };
      where.endDate = { lt: now };
    }

    const include = {
      _count: {
        select: { gradeEntries: { where: { status: "SUBMITTED" } } },
      },
    };

    const findArgs = {
      where,
      include,
      orderBy: { startDate: "desc" as const },
    };

    const [total, exams] = wantsPaging
      ? await Promise.all([
          prisma.exam.count({ where }),
          prisma.exam.findMany({
            ...findArgs,
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
        ])
      : [0, await prisma.exam.findMany(findArgs)];

    const componentIds = [
      ...new Set(exams.map((e) => e.examComponentId).filter(Boolean) as string[]),
    ];
    const components = componentIds.length
      ? await prisma.examComponent.findMany({
          where: { id: { in: componentIds }, schoolId },
          include: {
            period: {
              select: {
                id: true,
                label: true,
                shortCode: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        })
      : [];
    const componentById = new Map(components.map((c) => [c.id, c]));

    const items = exams.map((exam) => {
      const component = exam.examComponentId
        ? componentById.get(exam.examComponentId) || null
        : null;
      return {
        ...exam,
        isGradesReleased: exam.isGradesReleased,
        hasPendingGrades: exam._count.gradeEntries > 0,
        displayStatus: deriveExamDisplayStatus(exam),
        examComponent: component
          ? {
              id: component.id,
              label: component.label,
              shortCode: component.shortCode,
              componentType: component.componentType,
              period: component.period
                ? {
                    id: component.period.id,
                    label: component.period.label,
                    shortCode: component.period.shortCode,
                    startDate: component.period.startDate,
                    endDate: component.period.endDate,
                  }
                : null,
            }
          : null,
      };
    });

    if (wantsPaging) {
      return { items, total, page, pageSize };
    }
    return items;
  },

  async createExam(schoolId: string, data: any) {
    const title = String(data.title || "").trim();
    if (!title) {
      throw Object.assign(new Error("Title is required"), { status: 400 });
    }
    if (!data.startDate || !data.endDate || !data.gradeSubmissionDeadline) {
      throw Object.assign(
        new Error("Start, end, and grade submission deadline are required"),
        { status: 400 }
      );
    }
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const gradeSubmissionDeadline = new Date(data.gradeSubmissionDeadline);
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      Number.isNaN(gradeSubmissionDeadline.getTime())
    ) {
      throw Object.assign(new Error("Invalid date values"), { status: 400 });
    }
    if (endDate < startDate) {
      throw Object.assign(new Error("End must be on or after start"), { status: 400 });
    }

    let examComponentId: string | null = data.examComponentId
      ? String(data.examComponentId)
      : null;
    if (examComponentId) {
      const component = await prisma.examComponent.findFirst({
        where: { id: examComponentId, schoolId },
        include: { period: true },
      });
      if (!component) {
        throw Object.assign(
          new Error("Academic Calendar component not found for this school"),
          { status: 400 }
        );
      }
      const periodStart = new Date(component.period.startDate);
      const periodEnd = new Date(component.period.endDate);
      periodEnd.setHours(23, 59, 59, 999);
      if (startDate < periodStart || endDate > periodEnd) {
        throw Object.assign(
          new Error(
            `Exam dates must fall within ${component.period.label} (${component.period.shortCode})`
          ),
          { status: 400 }
        );
      }
    }

    const duration = Number(data.duration);
    if (!Number.isFinite(duration) || duration < 1) {
      throw Object.assign(new Error("Duration must be at least 1 minute"), { status: 400 });
    }

    let paperDueAt: Date | null = null;
    if (data.paperDueAt) {
      paperDueAt = new Date(data.paperDueAt);
      if (Number.isNaN(paperDueAt.getTime())) {
        throw Object.assign(new Error("Invalid paper deadline"), { status: 400 });
      }
      if (paperDueAt > startDate) {
        throw Object.assign(
          new Error("Paper deadline must be on or before the exam start"),
          { status: 400 }
        );
      }
    }

    const deliveryModeRaw = String(data.deliveryMode || "ONLINE").toUpperCase();
    const deliveryMode = ["ONLINE", "OFFLINE", "HYBRID"].includes(deliveryModeRaw)
      ? deliveryModeRaw
      : "ONLINE";

    return prisma.exam.create({
      data: {
        schoolId,
        title,
        startDate,
        endDate,
        gradeSubmissionDeadline,
        duration: Math.round(duration),
        examComponentId,
        deliveryMode,
        paperDueAt,
        paperStatus: "NONE",
        isOnline: deliveryMode === "ONLINE" || deliveryMode === "HYBRID",
        status: deriveExamDisplayStatus({
          status: "SCHEDULED",
          startDate,
          endDate,
        }),
      },
    });
  },

  async updateExam(id: string, data: any) {
    const existing = await prisma.exam.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error("Exam not found"), { status: 404 });
    }
    if (existing.status === "COMPLETED") {
      throw Object.assign(new Error("Completed exams cannot be edited"), {
        status: 409,
      });
    }

    const title = data.title !== undefined ? String(data.title || "").trim() : existing.title;
    if (!title) {
      throw Object.assign(new Error("Title is required"), { status: 400 });
    }

    const startDate = new Date(data.startDate ?? existing.startDate.toISOString());
    const endDate = new Date(data.endDate ?? existing.endDate.toISOString());
    const gradeSubmissionDeadline = new Date(
      data.gradeSubmissionDeadline ?? existing.gradeSubmissionDeadline.toISOString()
    );
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      Number.isNaN(gradeSubmissionDeadline.getTime())
    ) {
      throw Object.assign(new Error("Invalid date values"), { status: 400 });
    }
    if (endDate < startDate) {
      throw Object.assign(new Error("End must be on or after start"), { status: 400 });
    }

    const examComponentId =
      data.examComponentId !== undefined
        ? String(data.examComponentId) || null
        : existing.examComponentId;
    if (examComponentId) {
      const component = await prisma.examComponent.findFirst({
        where: { id: examComponentId, schoolId: existing.schoolId },
        include: { period: true },
      });
      if (!component) {
        throw Object.assign(
          new Error("Academic Calendar component not found for this school"),
          { status: 400 }
        );
      }
      const periodStart = new Date(component.period.startDate);
      const periodEnd = new Date(component.period.endDate);
      periodEnd.setHours(23, 59, 59, 999);
      if (startDate < periodStart || endDate > periodEnd) {
        throw Object.assign(
          new Error(
            `Exam dates must fall within ${component.period.label} (${component.period.shortCode})`
          ),
          { status: 400 }
        );
      }
    }

    const duration = data.duration !== undefined ? Number(data.duration) : existing.duration;
    if (!Number.isFinite(duration) || duration < 1) {
      throw Object.assign(new Error("Duration must be at least 1 minute"), { status: 400 });
    }

    let paperDueAt: Date | null = existing.paperDueAt;
    if (data.paperDueAt !== undefined) {
      if (data.paperDueAt === null || data.paperDueAt === "") {
        paperDueAt = null;
      } else {
        paperDueAt = new Date(data.paperDueAt);
        if (Number.isNaN(paperDueAt.getTime())) {
          throw Object.assign(new Error("Invalid paper deadline"), { status: 400 });
        }
      }
    }
    if (paperDueAt && paperDueAt > startDate) {
      throw Object.assign(
        new Error("Paper deadline must be on or before the exam start"),
        { status: 400 }
      );
    }

    const deliveryModeRaw = String(data.deliveryMode || existing.deliveryMode || "ONLINE").toUpperCase();
    const deliveryMode = ["ONLINE", "OFFLINE", "HYBRID"].includes(deliveryModeRaw)
      ? deliveryModeRaw
      : existing.deliveryMode || "ONLINE";

    const isOnline = ["ONLINE", "HYBRID"].includes(deliveryMode);

    return prisma.exam.update({
      where: { id },
      data: {
        title,
        startDate,
        endDate,
        gradeSubmissionDeadline,
        duration: Math.round(duration),
        examComponentId,
        deliveryMode,
        isOnline,
        paperDueAt,
        status: deriveExamDisplayStatus({
          status: existing.status,
          startDate,
          endDate,
        }),
      },
    });
  },

  async getExamById(id: string) {
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) return null;

    let examComponent = null;
    if (exam.examComponentId) {
      const component = await prisma.examComponent.findFirst({
        where: { id: exam.examComponentId, schoolId: exam.schoolId },
        include: {
          period: {
            select: {
              id: true,
              label: true,
              shortCode: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });
      if (component) {
        examComponent = {
          id: component.id,
          label: component.label,
          shortCode: component.shortCode,
          componentType: component.componentType,
          period: component.period,
        };
      }
    }

    return {
      ...exam,
      displayStatus: deriveExamDisplayStatus(exam),
      examComponent,
    };
  },

  async getTeacherClassrooms(examId: string, teacherId: string) {
    // Classrooms where teacher is owner or co-teacher — now fetched from Classroom.
    const classrooms = await getClassroomsByMember(teacherId, ["TEACHER", "CO_TEACHER"]);

    const subjectIds = [...new Set(classrooms.map((c) => c.subjectId).filter(Boolean))] as string[];
    const gradeLevelIds = [...new Set(classrooms.map((c) => c.gradeLevelId).filter(Boolean))] as string[];

    const [subjects, gradeLevels] = await Promise.all([
      subjectIds.length ? prisma.subject.findMany({ where: { id: { in: subjectIds } } }) : Promise.resolve([]),
      gradeLevelIds.length ? prisma.gradeLevel.findMany({ where: { id: { in: gradeLevelIds } } }) : Promise.resolve([]),
    ]);
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const gradeLevelMap = new Map(gradeLevels.map((g) => [g.id, g]));

    const classIds = classrooms.map((c) => c.id);
    const gradeEntries = classIds.length
      ? await prisma.gradeEntry.findMany({
          where: { examId, enteredBy: teacherId, classId: { in: classIds } },
          select: { classId: true, status: true },
        })
      : [];

    return classrooms.map((cls) => {
      const statuses = gradeEntries.filter((g) => g.classId === cls.id).map((g) => g.status);
      let submissionStatus = "NOT_STARTED";
      if (statuses.length > 0) {
        if (statuses.every((s) => s === "ACCEPTED")) submissionStatus = "ACCEPTED";
        else if (statuses.some((s) => s === "REJECTED")) submissionStatus = "REJECTED";
        else if (statuses.some((s) => s === "SUBMITTED")) submissionStatus = "SUBMITTED";
        else submissionStatus = "DRAFT";
      }

      return {
        id: cls.id,
        name: cls.name,
        subject: cls.subjectId ? { id: cls.subjectId, name: subjectMap.get(cls.subjectId)?.name } : null,
        gradeLevel: cls.gradeLevelId ? { name: gradeLevelMap.get(cls.gradeLevelId)?.name } : null,
        submissionStatus,
        _count: { members: cls._count?.members ?? 0 },
      };
    });
  },

  async getSubmissionsSummary(examId: string) {
    const gradeEntries = await prisma.gradeEntry.findMany({ where: { examId } });

    const classIds = [...new Set(gradeEntries.map((g) => g.classId))];
    const classrooms = await Promise.all(classIds.map((id) => getClassroomById(id)));
    const classroomMap = new Map(classrooms.filter(Boolean).map((c) => [c!.id, c!]));

    const subjectIds = [...new Set(classrooms.filter(Boolean).map((c) => c!.subjectId).filter(Boolean))] as string[];
    const gradeLevelIds = [...new Set(classrooms.filter(Boolean).map((c) => c!.gradeLevelId).filter(Boolean))] as string[];
    const [subjects, gradeLevels] = await Promise.all([
      subjectIds.length ? prisma.subject.findMany({ where: { id: { in: subjectIds } } }) : Promise.resolve([]),
      gradeLevelIds.length ? prisma.gradeLevel.findMany({ where: { id: { in: gradeLevelIds } } }) : Promise.resolve([]),
    ]);
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const gradeLevelMap = new Map(gradeLevels.map((g) => [g.id, g]));

    // Group by classroom and teacher
    const groups: Record<string, any> = {};

    gradeEntries.forEach((ge) => {
      const key = `${ge.classId}-${ge.enteredBy}`;
      if (!groups[key]) {
        const cls = classroomMap.get(ge.classId);
        groups[key] = {
          classroom: {
            id: ge.classId,
            name: cls?.name,
            subject: { name: cls?.subjectId ? subjectMap.get(cls.subjectId)?.name : undefined },
            gradeLevel: { name: cls?.gradeLevelId ? gradeLevelMap.get(cls.gradeLevelId)?.name : undefined },
          },
          teacherId: ge.enteredBy,
          status: "DRAFT",
          lastSubmitted: ge.enteredAt,
          counts: { DRAFT: 0, SUBMITTED: 0, ACCEPTED: 0, REJECTED: 0 },
        };
      }

      groups[key].counts[ge.status]++;
      if (new Date(ge.enteredAt) > new Date(groups[key].lastSubmitted)) {
        groups[key].lastSubmitted = ge.enteredAt;
      }
    });

    return Object.values(groups).map((g: any) => {
      const counts = g.counts;
      if (counts.SUBMITTED > 0) g.status = "SUBMITTED";
      else if (counts.REJECTED > 0) g.status = "REJECTED";
      else if (counts.ACCEPTED > 0 && Object.values(counts).reduce((a: any, b: any) => a + b, 0) === counts.ACCEPTED) g.status = "ACCEPTED";
      return g;
    });
  },

  async getExamGrades(examId: string, classroomId: string, teacherId?: string) {
    const members = await getClassroomMembers(classroomId, "STUDENT");

    const existingGrades = await prisma.gradeEntry.findMany({
      where: {
        examId,
        classId: classroomId,
        ...(teacherId ? { enteredBy: teacherId } : {}),
      },
      include: { history: true },
    });

    const historyActorIds = existingGrades.flatMap((g) =>
      (g.history || []).map((h) => h.changedBy).filter(Boolean)
    );
    const users = await getIdentityUsersByIds([
      ...members.map((m) => m.userId),
      ...historyActorIds,
    ]);

    const gradesMap = new Map(existingGrades.map((g) => [g.studentId, g]));

    return members.map((m) => {
      const g = gradesMap.get(m.userId);
      const user = users.get(m.userId);
      const history = (g?.history || []).map((h: any) => {
        const actor = users.get(h.changedBy) || null;
        return {
          ...h,
          user: actor
            ? {
                id: actor.id,
                name: actor.name,
                role: actor.role,
                photoUrl: actor.photoUrl || null,
              }
            : { id: h.changedBy, name: "Staff", photoUrl: null },
        };
      });
      return {
        id: g?.id || null,
        studentId: m.userId,
        student: {
          id: m.userId,
          name: user?.name || "Unknown student",
          email: user?.email || "",
          photoUrl: user?.photoUrl || null,
        },
        grade: g?.score ?? null,
        status: g?.status || "DRAFT",
        feedback: g?.feedback || null,
        isLocked: g?.isLocked || false,
        isIncomplete: Boolean(g?.isIncomplete),
        incompleteNote: g?.incompleteNote || null,
        updatedAt: g?.updatedAt?.toISOString?.() || g?.updatedAt || null,
        history,
      };
    });
  },

  async upsertGradeEntry(
    examId: string,
    teacherId: string,
    schoolId: string,
    data: any,
    opts?: { role?: string; skipBatch?: boolean }
  ) {
    const {
      studentId,
      grade,
      status: requestedStatus,
      classId,
      subjectId,
      examComponentId,
      isIncomplete,
      incompleteNote,
    } = data;
    let status = requestedStatus;
    const role = opts?.role || "TEACHER";
    const isAdmin = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(role);

    await assertTeacherClassAccess(teacherId, classId, role);
    await assertStudentInClass(classId, studentId);

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    const resolvedComponentId =
      examComponentId || exam?.examComponentId || null;

    const existing = await prisma.gradeEntry.findFirst({
      where: { examId, studentId, subjectId, classId },
    });

    const wantsIncomplete =
      typeof isIncomplete === "boolean"
        ? isIncomplete
        : Boolean(existing?.isIncomplete);
    let matchedGrant: { id: string } | null = null;
    if (!isAdmin) {
      matchedGrant = await gradeEditGrantService.resolveMatchingGrant({
        schoolId,
        teacherId,
        classId,
        subjectId,
        examComponentId: resolvedComponentId,
        isIncompleteTarget: wantsIncomplete || Boolean(existing?.isIncomplete),
      });
    }

    if (status === "SUBMITTED" && !matchedGrant) {
      await assertWithinSubmissionDeadline({
        examId,
        examComponentId: resolvedComponentId,
        prisma,
      });
    }

    if (existing?.isLocked && !isAdmin && !matchedGrant) {
      throw Object.assign(new Error("Grade is locked and cannot be modified"), {
        status: 403,
      });
    }
    if (
      existing &&
      !isAdmin &&
      !matchedGrant &&
      ["SUBMITTED", "ACCEPTED"].includes(existing.status) &&
      status === "DRAFT"
    ) {
      throw Object.assign(
        new Error("Submitted grades cannot be edited until reviewed"),
        { status: 409 }
      );
    }
    if (
      existing &&
      !isAdmin &&
      !matchedGrant &&
      existing.status === "ACCEPTED" &&
      status === "SUBMITTED"
    ) {
      throw Object.assign(new Error("Accepted grades cannot be re-submitted"), {
        status: 409,
      });
    }

    if (matchedGrant && existing && ["SUBMITTED", "ACCEPTED"].includes(existing.status)) {
      if (status !== "SUBMITTED") status = "DRAFT";
    }

    const score =
      grade === null || grade === undefined || grade === ""
        ? null
        : parseFloat(String(grade));

    const incompleteData: { isIncomplete?: boolean; incompleteNote?: string | null } = {};
    if (typeof isIncomplete === "boolean") {
      incompleteData.isIncomplete = isIncomplete;
      if (!isIncomplete) incompleteData.incompleteNote = null;
      else if (incompleteNote !== undefined) {
        incompleteData.incompleteNote = String(incompleteNote || "") || null;
      }
    }

    const historyFeedback = matchedGrant ? `viaGrant:${matchedGrant.id}` : null;

    if (existing) {
      return prisma.$transaction(async (tx) => {
        const updated = await tx.gradeEntry.update({
          where: { id: existing.id },
          data: {
            score,
            status,
            enteredBy: teacherId,
            examComponentId: resolvedComponentId || existing.examComponentId,
            feedback:
              status === "DRAFT" || status === "SUBMITTED"
                ? null
                : existing.feedback,
            isLocked: false,
            reviewedBy: status === "SUBMITTED" ? null : existing.reviewedBy,
            reviewedAt: status === "SUBMITTED" ? null : existing.reviewedAt,
            updatedAt: new Date(),
            ...incompleteData,
          },
        });

        await tx.gradeHistory.create({
          data: {
            gradeEntryId: updated.id,
            score: updated.score,
            status: updated.status,
            feedback: historyFeedback,
            changedBy: teacherId,
            changedAt: new Date(),
          },
        });

        return updated;
      }).then(async (updated) => {
        if (status === "SUBMITTED" && !opts?.skipBatch) {
          await createSubmissionBatch({
            schoolId,
            classId,
            examId,
            examComponentId: resolvedComponentId,
            subjectId,
            teacherId,
            entryIds: [updated.id],
          });
        }
        return updated;
      });
    }

    const resolvedYearId = await resolveSchoolYearId(schoolId);
    return prisma.$transaction(async (tx) => {
      const created = await tx.gradeEntry.create({
        data: {
          examId,
          studentId,
          subjectId,
          classId,
          schoolId,
          schoolYearId: resolvedYearId,
          score,
          status,
          enteredBy: teacherId,
          examComponentId: resolvedComponentId,
          isIncomplete: incompleteData.isIncomplete ?? false,
          incompleteNote: incompleteData.incompleteNote ?? null,
        },
      });

      await tx.gradeHistory.create({
        data: {
          gradeEntryId: created.id,
          score: created.score,
          status: created.status,
          feedback: historyFeedback,
          changedBy: teacherId,
          changedAt: new Date(),
        },
      });

      return created;
    }).then(async (created) => {
      if (status === "SUBMITTED" && !opts?.skipBatch) {
        await createSubmissionBatch({
          schoolId,
          classId,
          examId,
          examComponentId: resolvedComponentId,
          subjectId,
          teacherId,
          entryIds: [created.id],
        });
      }
      return created;
    });
  },

  async bulkUpsertGradeEntries(
    examId: string,
    teacherId: string,
    schoolId: string,
    data: {
      classId: string;
      subjectId: string;
      status: string;
      examComponentId?: string | null;
      entries: Array<{ studentId: string; grade: number | null }>;
    },
    opts?: { role?: string }
  ) {
    const role = opts?.role || "TEACHER";
    await assertTeacherClassAccess(teacherId, data.classId, role);

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    const resolvedComponentId =
      data.examComponentId || exam?.examComponentId || null;

    if (data.status === "SUBMITTED") {
      await assertWithinSubmissionDeadline({
        examId,
        examComponentId: resolvedComponentId,
        prisma,
      });
    }

    const saved: string[] = [];
    const failed: Array<{ studentId: string; error: string }> = [];

    for (const entry of data.entries) {
      try {
        await assertStudentInClass(data.classId, entry.studentId);
        const row = await this.upsertGradeEntry(
          examId,
          teacherId,
          schoolId,
          {
            studentId: entry.studentId,
            grade: entry.grade,
            status: data.status,
            classId: data.classId,
            subjectId: data.subjectId,
            examComponentId: data.examComponentId,
          },
          { ...opts, skipBatch: true }
        );
        saved.push(row.id);
      } catch (err: any) {
        failed.push({
          studentId: entry.studentId,
          error: err.message || "Failed",
        });
      }
    }

    if (data.status === "SUBMITTED" && saved.length) {
      await createSubmissionBatch({
        schoolId,
        classId: data.classId,
        examId,
        examComponentId: resolvedComponentId,
        subjectId: data.subjectId,
        teacherId,
        entryIds: saved,
      });
    }

    return {
      saved: saved.length,
      failed,
      total: data.entries.length,
    };
  },

  /** Push Settings → Gradebook Structure template to assessments following the school template. */
  async syncGradebookStructureTemplate(schoolId: string) {
    const schoolGradebookConfig = await getSchoolGradebookConfig(schoolId);
    const { columns } = resolveEffectiveAssessmentStructure({
      schoolGradebookConfigRaw: schoolGradebookConfig,
      structureCustom: false,
    });
    if (!columns.length) return { updated: 0 };

    const serialized = serializeAssessmentStructure(columns);
    const components = await prisma.examComponent.findMany({
      where: { schoolId },
      select: { id: true, gradebookStructureCustom: true },
    });

    const ids = components
      .filter((c) => !c.gradebookStructureCustom)
      .map((c) => c.id);

    if (ids.length === 0) return { updated: 0 };

    await prisma.$transaction(
      ids.map((id) =>
        prisma.examComponent.update({
          where: { id },
          data: {
            gradebookStructure: serialized,
            gradebookStructureCustom: false,
          },
        })
      )
    );

    return { updated: ids.length };
  },

  /** Assessment gradebook: roster + all structure column scores for one exam component. */
  async getAssessmentGrades(
    schoolId: string,
    classroomId: string,
    examComponentId: string,
    subjectId?: string
  ) {
    const component = await prisma.examComponent.findFirst({
      where: { id: examComponentId, schoolId },
      include: { period: { select: { id: true, label: true, shortCode: true } } },
    });
    if (!component) {
      throw Object.assign(new Error("Assessment not found"), { status: 404 });
    }

    const schoolGradebookConfig = await getSchoolGradebookConfig(schoolId);
    const structure = resolveEffectiveAssessmentStructure({
      componentStructureRaw: component.gradebookStructure,
      schoolGradebookConfigRaw: schoolGradebookConfig,
      structureCustom: component.gradebookStructureCustom,
    });
    const members = await getClassroomMembers(classroomId, "STUDENT");
    const users = await getIdentityUsersByIds(members.map((m) => m.userId));

    const existingGrades = await prisma.gradeEntry.findMany({
      where: {
        schoolId,
        classId: classroomId,
        examComponentId,
        ...(subjectId ? { subjectId } : {}),
      },
      include: { history: true },
    });

    const gradeKey = (studentId: string, structureColumnId: string | null) =>
      `${studentId}:${structureColumnId ?? ""}`;

    const gradesMap = new Map(
      existingGrades.map((g) => [
        gradeKey(g.studentId, g.structureColumnId ?? null),
        g,
      ])
    );

    const rows = members.map((m) => {
      const user = users.get(m.userId);
      const cells: Record<
        string,
        {
          grade: number | null;
          status: string;
          isLocked: boolean;
          isIncomplete: boolean;
          incompleteNote: string | null;
          entryId: string | null;
        }
      > = {};

      for (const col of structure.columns) {
        const g = gradesMap.get(gradeKey(m.userId, col.id));
        cells[col.id] = {
          grade: g?.score ?? null,
          status: g?.status || "DRAFT",
          isLocked: Boolean(g?.isLocked),
          isIncomplete: Boolean(g?.isIncomplete),
          incompleteNote: g?.incompleteNote || null,
          entryId: g?.id || null,
        };
      }

      // Legacy single-score entry (no structureColumnId) → map to exam column if present
      const legacy = gradesMap.get(gradeKey(m.userId, null));
      if (legacy && legacy.structureColumnId == null) {
        const examCol =
          structure.columns.find((c) =>
            String(c.componentType || "").toUpperCase().includes("EXAM")
          ) || structure.columns[structure.columns.length - 1];
        if (examCol && cells[examCol.id]?.grade == null) {
          cells[examCol.id] = {
            grade: legacy.score ?? null,
            status: legacy.status || "DRAFT",
            isLocked: Boolean(legacy.isLocked),
            isIncomplete: Boolean(legacy.isIncomplete),
            incompleteNote: legacy.incompleteNote || null,
            entryId: legacy.id,
          };
        }
      }

      return {
        studentId: m.userId,
        student: {
          id: m.userId,
          name: user?.name || "Unknown student",
          email: user?.email || "",
          photoUrl: user?.photoUrl || null,
        },
        cells,
      };
    });

    return {
      assessment: {
        id: component.id,
        label: component.label,
        shortCode: component.shortCode,
        componentType: component.componentType,
        periodId: component.periodId,
        periodLabel: component.period.label,
        periodShortCode: component.period.shortCode,
        gradebookStructure: structure.columns,
        gradebookStructureCustom: component.gradebookStructureCustom,
        structureSource: structure.source,
        gradeSubmissionDeadline: component.gradeSubmissionDeadline?.toISOString?.() || null,
      },
      rows,
    };
  },

  /** Period gradebook: roster + scores for one exam component (no exam required). */
  async getComponentGrades(
    schoolId: string,
    classroomId: string,
    examComponentId: string,
    subjectId?: string
  ) {
    const members = await getClassroomMembers(classroomId, "STUDENT");
    const users = await getIdentityUsersByIds(members.map((m) => m.userId));

    const existingGrades = await prisma.gradeEntry.findMany({
      where: {
        schoolId,
        classId: classroomId,
        examComponentId,
        ...(subjectId ? { subjectId } : {}),
      },
      include: { history: true },
    });

    const gradesMap = new Map(existingGrades.map((g) => [g.studentId, g]));

    return members.map((m) => {
      const g = gradesMap.get(m.userId);
      const user = users.get(m.userId);
      return {
        id: g?.id || null,
        studentId: m.userId,
        student: {
          id: m.userId,
          name: user?.name || "Unknown student",
          email: user?.email || "",
          photoUrl: user?.photoUrl || null,
        },
        grade: g?.score ?? null,
        status: g?.status || "DRAFT",
        feedback: g?.feedback || null,
        isLocked: g?.isLocked || false,
        isIncomplete: Boolean(g?.isIncomplete),
        incompleteNote: g?.incompleteNote || null,
        updatedAt: g?.updatedAt?.toISOString?.() || g?.updatedAt || null,
        examId: g?.examId || null,
        examComponentId,
        history: g?.history || [],
      };
    });
  },

  async upsertComponentGradeEntry(
    teacherId: string,
    schoolId: string,
    data: any,
    opts?: { role?: string; skipBatch?: boolean }
  ) {
    const {
      studentId,
      grade,
      status: requestedStatus,
      classId,
      subjectId,
      examComponentId,
      examId,
      isIncomplete,
      incompleteNote,
      structureColumnId,
    } = data;
    let status = requestedStatus;
    const role = opts?.role || "TEACHER";
    const isAdmin = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(role);

    if (!examComponentId) {
      throw Object.assign(new Error("examComponentId is required"), { status: 400 });
    }

    await assertTeacherClassAccess(teacherId, classId, role);
    await assertStudentInClass(classId, studentId);

    const resolvedStructureColumnId =
      structureColumnId === undefined || structureColumnId === null || structureColumnId === ""
        ? null
        : String(structureColumnId);

    const existing = await prisma.gradeEntry.findFirst({
      where: {
        schoolId,
        studentId,
        subjectId,
        classId,
        examComponentId,
        structureColumnId: resolvedStructureColumnId,
        ...(examId ? { examId } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });

    const wantsIncomplete =
      typeof isIncomplete === "boolean"
        ? isIncomplete
        : Boolean(existing?.isIncomplete);
    let matchedGrant: { id: string } | null = null;
    if (!isAdmin) {
      matchedGrant = await gradeEditGrantService.resolveMatchingGrant({
        schoolId,
        teacherId,
        classId,
        subjectId,
        examComponentId,
        isIncompleteTarget: wantsIncomplete || Boolean(existing?.isIncomplete),
      });
    }

    if (status === "SUBMITTED" && !matchedGrant) {
      await assertWithinSubmissionDeadline({
        examId: examId || null,
        examComponentId,
        prisma,
      });
    }

    if (existing?.isLocked && !isAdmin && !matchedGrant) {
      throw Object.assign(new Error("Grade is locked and cannot be modified"), {
        status: 403,
      });
    }
    if (
      existing &&
      !isAdmin &&
      !matchedGrant &&
      ["SUBMITTED", "ACCEPTED"].includes(existing.status) &&
      status === "DRAFT"
    ) {
      throw Object.assign(
        new Error("Submitted grades cannot be edited until reviewed"),
        { status: 409 }
      );
    }

    if (matchedGrant && existing && ["SUBMITTED", "ACCEPTED"].includes(existing.status)) {
      if (status !== "SUBMITTED") status = "DRAFT";
    }

    const score =
      grade === null || grade === undefined || grade === ""
        ? null
        : parseFloat(String(grade));

    const incompleteData: { isIncomplete?: boolean; incompleteNote?: string | null } = {};
    if (typeof isIncomplete === "boolean") {
      incompleteData.isIncomplete = isIncomplete;
      if (!isIncomplete) incompleteData.incompleteNote = null;
      else if (incompleteNote !== undefined) {
        incompleteData.incompleteNote = String(incompleteNote || "") || null;
      }
    }
    const historyFeedback = matchedGrant ? `viaGrant:${matchedGrant.id}` : null;

    if (existing) {
      return prisma.$transaction(async (tx) => {
        const updated = await tx.gradeEntry.update({
          where: { id: existing.id },
          data: {
            score,
            status,
            enteredBy: teacherId,
            examId: examId || existing.examId,
            feedback:
              status === "DRAFT" || status === "SUBMITTED"
                ? null
                : existing.feedback,
            isLocked: false,
            reviewedBy: status === "SUBMITTED" ? null : existing.reviewedBy,
            reviewedAt: status === "SUBMITTED" ? null : existing.reviewedAt,
            updatedAt: new Date(),
            ...incompleteData,
          },
        });
        await tx.gradeHistory.create({
          data: {
            gradeEntryId: updated.id,
            score: updated.score,
            status: updated.status,
            feedback: historyFeedback,
            changedBy: teacherId,
            changedAt: new Date(),
          },
        });
        return updated;
      }).then(async (updated) => {
        if (status === "SUBMITTED" && !opts?.skipBatch) {
          await createSubmissionBatch({
            schoolId,
            classId,
            examId: examId || null,
            examComponentId,
            subjectId,
            teacherId,
            entryIds: [updated.id],
          });
        }
        return updated;
      });
    }

    const resolvedYearId = await resolveSchoolYearId(schoolId);
    return prisma.$transaction(async (tx) => {
      const created = await tx.gradeEntry.create({
        data: {
          examId: examId || null,
          examComponentId,
          structureColumnId: resolvedStructureColumnId,
          studentId,
          subjectId,
          classId,
          schoolId,
          schoolYearId: resolvedYearId,
          score,
          status,
          enteredBy: teacherId,
          isIncomplete: incompleteData.isIncomplete ?? false,
          incompleteNote: incompleteData.incompleteNote ?? null,
        },
      });
      await tx.gradeHistory.create({
        data: {
          gradeEntryId: created.id,
          score: created.score,
          status: created.status,
          feedback: historyFeedback,
          changedBy: teacherId,
          changedAt: new Date(),
        },
      });
      return created;
    }).then(async (created) => {
      if (status === "SUBMITTED" && !opts?.skipBatch) {
        await createSubmissionBatch({
          schoolId,
          classId,
          examId: examId || null,
          examComponentId,
          subjectId,
          teacherId,
          entryIds: [created.id],
        });
      }
      return created;
    });
  },

  async bulkUpsertComponentGrades(
    teacherId: string,
    schoolId: string,
    data: {
      classId: string;
      subjectId: string;
      examComponentId: string;
      status: string;
      examId?: string | null;
      entries: Array<{
        studentId: string;
        grade: number | null;
        structureColumnId?: string | null;
        isIncomplete?: boolean;
        incompleteNote?: string | null;
      }>;
    },
    opts?: { role?: string }
  ) {
    await assertTeacherClassAccess(teacherId, data.classId, opts?.role || "TEACHER");
    // Deadline / lock / grant checks happen per-entry in upsertComponentGradeEntry

    const saved: string[] = [];
    const failed: Array<{ studentId: string; error: string }> = [];

    for (const entry of data.entries) {
      try {
        const row = await this.upsertComponentGradeEntry(
          teacherId,
          schoolId,
          {
            ...entry,
            status: data.status,
            classId: data.classId,
            subjectId: data.subjectId,
            examComponentId: data.examComponentId,
            examId: data.examId,
          },
          { ...opts, skipBatch: true }
        );
        saved.push(row.id);
      } catch (err: any) {
        failed.push({
          studentId: entry.studentId,
          error: err.message || "Failed",
        });
      }
    }

    if (data.status === "SUBMITTED" && saved.length) {
      await createSubmissionBatch({
        schoolId,
        classId: data.classId,
        examId: data.examId || null,
        examComponentId: data.examComponentId,
        subjectId: data.subjectId,
        teacherId,
        entryIds: saved,
      });
    }

    return { saved: saved.length, failed, total: data.entries.length };
  },

  async getStudentGrades(studentId: string) {
    const rows = await prisma.gradeEntry.findMany({
      where: {
        studentId,
        OR: [
          { status: "ACCEPTED" },
          { exam: { isGradesReleased: true } },
        ],
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        exam: { select: { id: true, title: true, startDate: true, isGradesReleased: true } },
        examComponent: {
          select: {
            id: true,
            label: true,
            shortCode: true,
            weightPct: true,
            gradebookStructure: true,
            gradebookStructureCustom: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      subjectId: r.subjectId,
      subject: r.subject,
      classId: r.classId,
      score: r.score,
      status: r.status,
      examId: r.examId,
      exam: r.exam,
      examComponentId: r.examComponentId,
      examComponent: r.examComponent,
      structureColumnId: r.structureColumnId,
      updatedAt: r.updatedAt,
    }));
  },

  async updateGradeEntryStatus(id: string, userId: string, data: any) {
    const status = String(data.status || "").toUpperCase();
    if (!REVIEW_STATUSES.has(status)) {
      throw Object.assign(new Error("status must be ACCEPTED or REJECTED"), {
        status: 400,
      });
    }
    if (status === "REJECTED" && !String(data.feedback || "").trim()) {
      throw Object.assign(new Error("Feedback is required when rejecting"), {
        status: 400,
      });
    }

    const existing = await prisma.gradeEntry.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error("Grade entry not found"), { status: 404 });
    }
    if (data.schoolId && existing.schoolId !== data.schoolId) {
      throw Object.assign(new Error("Grade does not belong to this school"), {
        status: 403,
      });
    }
    if (existing.status !== "SUBMITTED") {
      throw Object.assign(
        new Error("Only submitted grades can be reviewed"),
        { status: 409, code: "NOT_SUBMITTED" }
      );
    }

    const feedback =
      status === "REJECTED" ? String(data.feedback).trim().slice(0, 2000) : null;
    const isLocked = status === "ACCEPTED";
    const reviewedAt = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.gradeEntry.update({
        where: { id },
        data: {
          status,
          feedback,
          isLocked,
          reviewedBy: userId,
          reviewedAt,
          updatedAt: reviewedAt,
        },
      });

      await tx.gradeHistory.create({
        data: {
          gradeEntryId: id,
          score: row.score,
          status: row.status,
          feedback: row.feedback,
          changedBy: userId,
          changedAt: reviewedAt,
        },
      });

      return row;
    });

    await syncSubmissionBatchStatus(existing.submissionBatchId, userId);

    if (!data.skipNotify && existing.enteredBy) {
      await notifyTeacherGradeDecision({
        schoolId: existing.schoolId,
        teacherId: existing.enteredBy,
        eventKey: status === "REJECTED" ? "GRADE_RETURNED" : "GRADE_APPROVED",
        title:
          status === "REJECTED"
            ? "Grade returned for correction"
            : "Grade approved",
        body:
          status === "REJECTED"
            ? String(feedback || "Please review and resubmit.").slice(0, 240)
            : "Your submitted mark was approved and locked.",
        href: "/grade-review",
        meta: { gradeEntryId: id, status },
      });
    }

    return updated;
  },

  /** Reopen an accepted (locked) grade for correction. */
  async reopenGradeEntry(
    id: string,
    reviewerId: string,
    data?: { reason?: string; schoolId?: string }
  ) {
    const existing = await prisma.gradeEntry.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error("Grade entry not found"), { status: 404 });
    }
    if (data?.schoolId && existing.schoolId !== data.schoolId) {
      throw Object.assign(new Error("Grade does not belong to this school"), {
        status: 403,
      });
    }
    if (existing.status !== "ACCEPTED" && !existing.isLocked) {
      throw Object.assign(
        new Error("Only accepted/locked grades can be reopened"),
        { status: 409, code: "NOT_ACCEPTED" }
      );
    }

    const reason = data?.reason ? String(data.reason).trim().slice(0, 2000) : null;
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.gradeEntry.update({
        where: { id },
        data: {
          status: "DRAFT",
          isLocked: false,
          feedback: reason,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      await tx.gradeHistory.create({
        data: {
          gradeEntryId: id,
          score: row.score,
          status: "REOPENED",
          feedback: reason,
          changedBy: reviewerId,
          changedAt: new Date(),
        },
      });
      return row;
    });

    await syncSubmissionBatchStatus(existing.submissionBatchId, reviewerId);

    if (existing.enteredBy) {
      await notifyTeacherGradeDecision({
        schoolId: existing.schoolId,
        teacherId: existing.enteredBy,
        eventKey: "GRADE_RETURNED",
        title: "Grade reopened for correction",
        body: reason || "An approved grade was unlocked so you can correct it.",
        href: "/grade-review",
        meta: { gradeEntryId: id, status: "REOPENED" },
      });
    }

    return updated;
  },

  async releaseGrades(examId: string, isGradesReleased: boolean) {
    const exam = await prisma.exam.update({
      where: { id: examId },
      data: { isGradesReleased, updatedAt: new Date() },
    });

    if (isGradesReleased) {
      try {
        const entries = await prisma.gradeEntry.findMany({
          where: { examId, status: { in: ["ACCEPTED", "SUBMITTED"] } },
          select: { studentId: true },
          distinct: ["studentId"],
        });
        const studentIds = [...new Set(entries.map((e) => e.studentId).filter(Boolean))];
        const payloads: {
          schoolId: string;
          userId: string;
          eventKey: string;
          title: string;
          body: string;
          href: string;
          meta: Record<string, unknown>;
        }[] = [];
        for (const studentId of studentIds) {
          const parentIds = await getStudentParentIds(studentId);
          for (const parentId of parentIds) {
            payloads.push({
              schoolId: exam.schoolId,
              userId: parentId,
              eventKey: "GRADE_RELEASED",
              title: "Grades released",
              body: `Results for ${exam.title || "an exam"} are now available.`,
              href: `/grades/${studentId}`,
              meta: { examId, studentId },
            });
          }
        }
        await notifyInAppMany(payloads);
      } catch (err: any) {
        console.warn("[academic] GRADE_RELEASED notify failed:", err?.message || err);
      }
    }

    return exam;
  },

  async processResults(examId: string) {
    const grades = await prisma.gradeEntry.findMany({
      where: { examId, status: "ACCEPTED" },
      include: { subject: { select: { name: true } } },
    });

    if (grades.length === 0) {
      throw new Error("No accepted grades found to process");
    }

    // Group by student — enrich names/photos from Identity.
    const studentResults: Record<string, any> = {};
    grades.forEach((g) => {
      if (!studentResults[g.studentId]) {
        studentResults[g.studentId] = {
          studentId: g.studentId,
          totalScore: 0,
          subjects: [],
        };
      }
      studentResults[g.studentId].totalScore += g.score || 0;
      studentResults[g.studentId].subjects.push({
        subjectName: g.subject.name,
        score: g.score || 0,
      });
    });

    const users = await getIdentityUsersByIds(Object.keys(studentResults));

    const results = Object.values(studentResults).map((res: any) => {
      const average = res.totalScore / res.subjects.length;
      const user = users.get(res.studentId);
      return {
        ...res,
        student: {
          id: res.studentId,
          name: user?.name || "Student",
          email: user?.email || "",
          photoUrl: user?.photoUrl || null,
        },
        average,
        subjectCount: res.subjects.length,
        grade: average >= 80 ? "A" : average >= 70 ? "B" : average >= 60 ? "C" : average >= 50 ? "D" : "F",
      };
    });

    results.sort((a, b) => b.average - a.average);
    results.forEach((res, index) => {
      res.position = index + 1;
    });

    return results;
  },
};
