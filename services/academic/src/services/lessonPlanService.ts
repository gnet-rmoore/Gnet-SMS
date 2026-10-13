import prisma from "../lib/prisma";
import { getIdentityUsersByRoles } from "../lib/identityClient";
import { notifyInApp, notifyInAppMany } from "../lib/notifyInApp";
import { shareLessonPlanToClassroom, parseSyllabusUnits } from "../lib/lessonShare";
import { actorHasCapability } from "../lib/capabilities";

export const LESSON_REVIEWER_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"] as const;
export const LESSON_EDITABLE = new Set(["DRAFT", "RETURNED"]);
export const LESSON_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "RETURNED"] as const;
export const LESSON_RESCHEDULABLE = new Set(["DRAFT", "RETURNED"]);

type ActivityStep = { title: string; minutes?: number | null; description?: string };

export type { SyllabusUnit } from "../lib/lessonShare";
export { parseSyllabusUnits } from "../lib/lessonShare";

function assertCanOwn(
  existing: { teacherId: string },
  actor: { id: string; role: string; capabilities?: string[] },
  action: string
) {
  const isReviewer =
    Array.isArray(actor.capabilities)
      ? actor.capabilities.includes("action.lesson_plans.approve")
      : LESSON_REVIEWER_ROLES.includes(actor.role as any);
  if (actor.role === "TEACHER" && existing.teacherId !== actor.id) {
    throw Object.assign(new Error(`You can only ${action} your own lesson plans`), {
      status: 403,
    });
  }
  if (!isReviewer && existing.teacherId !== actor.id) {
    throw Object.assign(new Error(`Not allowed to ${action} this lesson plan`), { status: 403 });
  }
}

function asJsonString(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function parseObjectives(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.map((x) => String(x || "").trim()).filter(Boolean);
  } catch {
    /* plain text */
  }
  return String(raw || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseActivities(raw: string): ActivityStep[] {
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) {
      return v
        .map((a) => ({
          title: String(a?.title || "").trim(),
          minutes: a?.minutes != null && a.minutes !== "" ? Number(a.minutes) : null,
          description: String(a?.description || "").trim(),
        }))
        .filter((a) => a.title);
    }
  } catch {
    /* ignore */
  }
  return [];
}

function validateForSubmit(row: {
  title: string;
  subjectId: string;
  lessonDate: string;
  objectives: string;
  activities: string;
}) {
  if (!String(row.title || "").trim()) {
    throw Object.assign(new Error("Title is required to submit"), { status: 400 });
  }
  if (!row.subjectId) {
    throw Object.assign(new Error("Subject is required to submit"), { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.lessonDate || "")) {
    throw Object.assign(new Error("Lesson date (YYYY-MM-DD) is required to submit"), {
      status: 400,
    });
  }
  if (parseObjectives(row.objectives).length < 1) {
    throw Object.assign(new Error("Add at least one learning objective before submitting"), {
      status: 400,
    });
  }
  if (parseActivities(row.activities).length < 1) {
    throw Object.assign(new Error("Add at least one activity before submitting"), {
      status: 400,
    });
  }
}

function assertEditable(status: string) {
  if (!LESSON_EDITABLE.has(status)) {
    throw Object.assign(
      new Error("Only draft or returned lesson plans can be edited"),
      { status: 409, code: "NOT_EDITABLE" }
    );
  }
}

export const lessonPlanService = {
  async list(
    schoolId: string,
    opts: {
      teacherId?: string;
      scope?: "mine" | "all";
      status?: string;
      from?: string;
      to?: string;
      q?: string;
      page?: number;
      pageSize?: number;
      isReviewer?: boolean;
    }
  ) {
    const where: any = { schoolId };
    if (opts.scope === "mine" || (!opts.isReviewer && opts.teacherId)) {
      where.teacherId = opts.teacherId;
    }
    if (opts.status && opts.status !== "ALL") {
      where.status = opts.status;
    }
    if (opts.from || opts.to) {
      where.lessonDate = {};
      if (opts.from) where.lessonDate.gte = opts.from;
      if (opts.to) where.lessonDate.lte = opts.to;
    }
    const q = opts.q?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { subjectName: { contains: q, mode: "insensitive" } },
      ];
    }

    const wantsPaging = opts.page != null || opts.pageSize != null;
    const page = Math.max(1, Number(opts.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(opts.pageSize) || 50));
    const orderBy = [{ lessonDate: "desc" as const }, { updatedAt: "desc" as const }];

    if (wantsPaging) {
      const [total, items] = await Promise.all([
        prisma.lessonPlan.count({ where }),
        prisma.lessonPlan.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
      return { items, total, page, pageSize };
    }

    return prisma.lessonPlan.findMany({ where, orderBy });
  },

  async listPending(schoolId: string) {
    return prisma.lessonPlan.findMany({
      where: { schoolId, status: "SUBMITTED" },
      orderBy: [{ submittedAt: "asc" }, { updatedAt: "asc" }],
    });
  },

  async getById(id: string) {
    const row = await prisma.lessonPlan.findUnique({ where: { id } });
    if (!row) {
      throw Object.assign(new Error("Lesson plan not found"), { status: 404 });
    }
    return row;
  },

  async create(
    schoolId: string,
    data: any,
    actor: { id: string; name: string; role: string }
  ) {
    const teacherId = data.teacherId || actor.id;
    const teacherName = data.teacherName || actor.name || "Teacher";
    if (actor.role === "TEACHER" && teacherId !== actor.id) {
      throw Object.assign(new Error("Teachers can only create their own lesson plans"), {
        status: 403,
      });
    }

    return prisma.lessonPlan.create({
      data: {
        schoolId,
        teacherId,
        teacherName,
        subjectId: data.subjectId,
        subjectName: data.subjectName || "",
        gradeLevelId: data.gradeLevelId || null,
        gradeLevelName: data.gradeLevelName || null,
        classroomId: data.classroomId || null,
        classroomName: data.classroomName || null,
        syllabusPlanId: data.syllabusPlanId || null,
        title: String(data.title || "").trim() || "Untitled lesson",
        lessonDate: data.lessonDate || new Date().toISOString().slice(0, 10),
        durationMinutes: Number(data.durationMinutes) > 0 ? Number(data.durationMinutes) : 45,
        periodLabel: data.periodLabel || null,
        schedulePeriodId: data.schedulePeriodId || null,
        objectives: asJsonString(data.objectives ?? [], "[]"),
        standards: data.standards || null,
        warmUp: data.warmUp || null,
        activities: asJsonString(data.activities ?? [], "[]"),
        materials: data.materials != null ? asJsonString(data.materials, "[]") : null,
        assessment: data.assessment || null,
        differentiation: data.differentiation || null,
        homework: data.homework || null,
        reflection: data.reflection || null,
        status: "DRAFT",
      },
    });
  },

  async update(
    id: string,
    data: any,
    actor: { id: string; role: string }
  ) {
    const existing = await this.getById(id);
    assertCanOwn(existing, actor, "edit");
    assertEditable(existing.status);

    const updateData: any = {};
    const fields = [
      "title",
      "lessonDate",
      "durationMinutes",
      "periodLabel",
      "schedulePeriodId",
      "standards",
      "warmUp",
      "assessment",
      "differentiation",
      "homework",
      "reflection",
      "subjectId",
      "subjectName",
      "gradeLevelId",
      "gradeLevelName",
      "classroomId",
      "classroomName",
      "syllabusPlanId",
    ] as const;
    for (const key of fields) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    if (data.objectives !== undefined) {
      updateData.objectives = asJsonString(data.objectives, "[]");
    }
    if (data.activities !== undefined) {
      updateData.activities = asJsonString(data.activities, "[]");
    }
    if (data.materials !== undefined) {
      updateData.materials =
        data.materials == null ? null : asJsonString(data.materials, "[]");
    }
    if (updateData.durationMinutes != null) {
      updateData.durationMinutes =
        Number(updateData.durationMinutes) > 0 ? Number(updateData.durationMinutes) : 45;
    }
    if (updateData.title != null) {
      updateData.title = String(updateData.title).trim() || existing.title;
    }

    return prisma.lessonPlan.update({ where: { id }, data: updateData });
  },

  async submit(id: string, actor: { id: string; role: string; name?: string }) {
    const existing = await this.getById(id);
    if (actor.role === "TEACHER" && existing.teacherId !== actor.id) {
      throw Object.assign(new Error("You can only submit your own lesson plans"), {
        status: 403,
      });
    }
    assertEditable(existing.status);
    validateForSubmit(existing);

    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        feedback: null,
        reviewedById: null,
        reviewedAt: null,
      },
    });

    const approvers = await getIdentityUsersByRoles(existing.schoolId, [
      ...LESSON_REVIEWER_ROLES,
    ]);
    await notifyInAppMany(
      approvers
        .filter((a) => a.id !== actor.id)
        .map((a) => ({
          schoolId: existing.schoolId,
          userId: a.id,
          eventKey: "LESSON_PLAN_SUBMITTED",
          title: "Lesson plan pending review",
          body: `${existing.teacherName}: “${existing.title}” (${existing.lessonDate}) needs approval.`,
          href: "/lesson-plans",
          meta: { lessonPlanId: existing.id },
        }))
    );

    return updated;
  },

  async review(
    id: string,
    body: { status: "APPROVED" | "RETURNED"; feedback?: string },
    actor: { id: string; role: string; schoolId?: string | null; capabilities?: string[] }
  ) {
    const canReview = await actorHasCapability(
      actor,
      "action.lesson_plans.approve",
      LESSON_REVIEWER_ROLES
    );
    if (!canReview) {
      throw Object.assign(new Error("Not allowed to review lesson plans"), { status: 403 });
    }
    const existing = await this.getById(id);
    if (existing.status !== "SUBMITTED") {
      throw Object.assign(new Error("Only submitted lesson plans can be reviewed"), {
        status: 409,
      });
    }
    if (body.status !== "APPROVED" && body.status !== "RETURNED") {
      throw Object.assign(new Error("Review status must be APPROVED or RETURNED"), {
        status: 400,
      });
    }
    if (body.status === "RETURNED" && !String(body.feedback || "").trim()) {
      throw Object.assign(new Error("Feedback is required when returning a lesson plan"), {
        status: 400,
      });
    }

    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: {
        status: body.status,
        feedback: body.feedback ? String(body.feedback).trim() : null,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });

    const approved = body.status === "APPROVED";
    await notifyInApp({
      schoolId: existing.schoolId,
      userId: existing.teacherId,
      eventKey: approved ? "LESSON_PLAN_APPROVED" : "LESSON_PLAN_RETURNED",
      title: approved ? "Lesson plan approved" : "Lesson plan returned",
      body: approved
        ? `“${existing.title}” was approved.`
        : `“${existing.title}” was returned: ${String(body.feedback).trim()}`,
      href: "/lesson-plans",
      meta: { lessonPlanId: existing.id },
    });

    return updated;
  },

  async duplicate(
    id: string,
    data: { lessonDate?: string },
    actor: { id: string; role: string; name?: string }
  ) {
    const existing = await this.getById(id);
    if (actor.role === "TEACHER" && existing.teacherId !== actor.id) {
      throw Object.assign(new Error("You can only duplicate your own lesson plans"), {
        status: 403,
      });
    }

    return prisma.lessonPlan.create({
      data: {
        schoolId: existing.schoolId,
        teacherId: existing.teacherId,
        teacherName: existing.teacherName,
        subjectId: existing.subjectId,
        subjectName: existing.subjectName,
        gradeLevelId: existing.gradeLevelId,
        gradeLevelName: existing.gradeLevelName,
        classroomId: existing.classroomId,
        classroomName: existing.classroomName,
        syllabusPlanId: existing.syllabusPlanId,
        title: existing.title,
        lessonDate: data.lessonDate || existing.lessonDate,
        durationMinutes: existing.durationMinutes,
        periodLabel: existing.periodLabel,
        schedulePeriodId: existing.schedulePeriodId,
        objectives: existing.objectives,
        standards: existing.standards,
        warmUp: existing.warmUp,
        activities: existing.activities,
        materials: existing.materials,
        assessment: existing.assessment,
        differentiation: existing.differentiation,
        homework: existing.homework,
        reflection: null,
        status: "DRAFT",
      },
    });
  },

  async remove(id: string, actor: { id: string; role: string }) {
    const existing = await this.getById(id);
    assertCanOwn(existing, actor, "delete");
    assertEditable(existing.status);
    await prisma.lessonPlan.delete({ where: { id } });
  },

  async reschedule(
    id: string,
    lessonDate: string,
    actor: { id: string; role: string }
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lessonDate || "")) {
      throw Object.assign(new Error("lessonDate must be YYYY-MM-DD"), { status: 400 });
    }
    const existing = await this.getById(id);
    assertCanOwn(existing, actor, "reschedule");
    if (!LESSON_RESCHEDULABLE.has(existing.status)) {
      throw Object.assign(
        new Error("Only draft or returned plans can be dragged to a new date"),
        { status: 409, code: "NOT_RESCHEDULABLE" }
      );
    }
    return prisma.lessonPlan.update({
      where: { id },
      data: { lessonDate },
    });
  },

  async listTemplates(
    schoolId: string,
    opts?: { subjectId?: string; mine?: string; userId?: string }
  ) {
    const where: any = { schoolId };
    if (opts?.subjectId) where.subjectId = opts.subjectId;
    if (opts?.mine === "1" && opts.userId) where.createdById = opts.userId;
    return prisma.lessonPlanTemplate.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
  },

  async saveAsTemplate(id: string, actor: { id: string; name: string; role: string }) {
    const existing = await this.getById(id);
    assertCanOwn(existing, actor, "save as template");
    return prisma.lessonPlanTemplate.create({
      data: {
        schoolId: existing.schoolId,
        createdById: actor.id,
        createdByName: actor.name || existing.teacherName,
        title: existing.title,
        subjectId: existing.subjectId,
        subjectName: existing.subjectName,
        gradeLevelId: existing.gradeLevelId,
        gradeLevelName: existing.gradeLevelName,
        durationMinutes: existing.durationMinutes,
        periodLabel: existing.periodLabel,
        objectives: existing.objectives,
        standards: existing.standards,
        warmUp: existing.warmUp,
        activities: existing.activities,
        materials: existing.materials,
        assessment: existing.assessment,
        differentiation: existing.differentiation,
        homework: existing.homework,
        sourceLessonPlanId: existing.id,
      },
    });
  },

  async createFromTemplate(
    schoolId: string,
    templateId: string,
    data: { lessonDate?: string; classroomId?: string; classroomName?: string },
    actor: { id: string; name: string; role: string }
  ) {
    const tpl = await prisma.lessonPlanTemplate.findFirst({
      where: { id: templateId, schoolId },
    });
    if (!tpl) {
      throw Object.assign(new Error("Template not found"), { status: 404 });
    }
    return this.create(
      schoolId,
      {
        subjectId: tpl.subjectId,
        subjectName: tpl.subjectName,
        gradeLevelId: tpl.gradeLevelId,
        gradeLevelName: tpl.gradeLevelName,
        classroomId: data.classroomId,
        classroomName: data.classroomName,
        title: tpl.title,
        lessonDate: data.lessonDate,
        durationMinutes: tpl.durationMinutes,
        periodLabel: tpl.periodLabel,
        objectives: tpl.objectives,
        standards: tpl.standards,
        warmUp: tpl.warmUp,
        activities: tpl.activities,
        materials: tpl.materials,
        assessment: tpl.assessment,
        differentiation: tpl.differentiation,
        homework: tpl.homework,
        teacherId: actor.id,
        teacherName: actor.name,
      },
      actor
    );
  },

  async deleteTemplate(id: string, actor: { id: string; role: string }) {
    const tpl = await prisma.lessonPlanTemplate.findUnique({ where: { id } });
    if (!tpl) {
      throw Object.assign(new Error("Template not found"), { status: 404 });
    }
    const isReviewer = LESSON_REVIEWER_ROLES.includes(actor.role as any);
    if (!isReviewer && tpl.createdById !== actor.id) {
      throw Object.assign(new Error("You can only delete your own templates"), { status: 403 });
    }
    await prisma.lessonPlanTemplate.delete({ where: { id } });
  },

  async listSyllabusUnits(schoolId: string) {
    const rows = await prisma.syllabusPlan.findMany({
      where: { schoolId, status: "APPROVED" },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((s) => ({
      id: s.id,
      title: s.title,
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      gradeLevelId: s.gradeLevelId,
      gradeLevelName: s.gradeLevelName,
      teacherId: s.teacherId,
      teacherName: s.teacherName,
      academicYear: s.academicYear,
      standardsFramework: s.standardsFramework,
      objectives: parseObjectives(s.objectives),
      units: parseSyllabusUnits(s.units),
    }));
  },

  async createFromSyllabusUnit(
    schoolId: string,
    body: {
      syllabusPlanId: string;
      unitIndex: number;
      lessonDate?: string;
      classroomId?: string;
      classroomName?: string;
    },
    actor: { id: string; name: string; role: string }
  ) {
    const syllabus = await prisma.syllabusPlan.findFirst({
      where: { id: body.syllabusPlanId, schoolId },
    });
    if (!syllabus) {
      throw Object.assign(new Error("Syllabus plan not found"), { status: 404 });
    }
    if (syllabus.status !== "APPROVED") {
      throw Object.assign(new Error("Only approved syllabi can seed lesson plans"), {
        status: 409,
      });
    }
    const units = parseSyllabusUnits(syllabus.units);
    const unit = units[body.unitIndex];
    if (!unit) {
      throw Object.assign(new Error("Unit index out of range"), { status: 400 });
    }

    const activityText = unit.activities || "";
    const activities: ActivityStep[] = activityText
      ? activityText
          .split(/[;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((title) => ({ title, minutes: null, description: "" }))
      : [{ title: unit.topic || "Unit activities", minutes: 20, description: activityText }];

    const syllabusObjectives = parseObjectives(syllabus.objectives);
    const objectives =
      syllabusObjectives.length > 0
        ? syllabusObjectives.slice(0, 3)
        : [unit.topic || "Complete unit learning goals"].filter(Boolean);

    return this.create(
      schoolId,
      {
        subjectId: syllabus.subjectId,
        subjectName: syllabus.subjectName,
        gradeLevelId: syllabus.gradeLevelId,
        gradeLevelName: syllabus.gradeLevelName,
        classroomId: body.classroomId,
        classroomName: body.classroomName,
        syllabusPlanId: syllabus.id,
        title: unit.topic || `${syllabus.title} — ${unit.week || "Unit"}`,
        lessonDate: body.lessonDate,
        durationMinutes: 45,
        objectives,
        standards: syllabus.standardsFramework,
        activities,
        assessment: unit.assessment || null,
        differentiation: syllabus.differentiation || null,
        teacherId: actor.id,
        teacherName: actor.name,
      },
      actor
    );
  },

  async shareToClassroom(id: string, actor: { id: string; role: string }) {
    const existing = await this.getById(id);
    assertCanOwn(existing, actor, "share");
    const post = await shareLessonPlanToClassroom(existing, actor);
    return prisma.lessonPlan.update({
      where: { id },
      data: { classroomPostId: post.id },
    });
  },
};
