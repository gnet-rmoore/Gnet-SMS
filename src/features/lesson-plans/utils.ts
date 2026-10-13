import type { LessonActivity, LessonPlan, LessonPlanForm } from "./types";
import i18n from "../../i18n/instance";

/** Roles that can approve/return lesson plans by platform default. */
export const REVIEWER_ROLES = new Set(["SCHOOL_ADMIN", "PRINCIPAL", "VPI"]);

export function canReviewLessonPlans(role?: string, capabilities?: string[] | null) {
  if (Array.isArray(capabilities)) {
    return capabilities.includes("action.lesson_plans.approve");
  }
  return Boolean(role && REVIEWER_ROLES.has(role));
}

export function parseObjectives(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.map((x) => String(x || "").trim()).filter(Boolean);
  } catch {
    /* plain */
  }
  return String(raw)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseActivities(raw?: string | null): LessonActivity[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) {
      return v.map((a) => ({
        title: String(a?.title || "").trim(),
        minutes: a?.minutes != null && a.minutes !== "" ? Number(a.minutes) : null,
        description: String(a?.description || "").trim(),
      }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function parseMaterials(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.map((x) => String(x || "").trim()).filter(Boolean);
  } catch {
    /* plain */
  }
  return String(raw)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function emptyForm(today: string): LessonPlanForm {
  return {
    title: "",
    lessonDate: today,
    durationMinutes: 45,
    periodLabel: "",
    schedulePeriodId: "",
    subjectId: "",
    subjectName: "",
    gradeLevelId: "",
    gradeLevelName: "",
    classroomId: "",
    classroomName: "",
    objectives: [""],
    standards: "",
    warmUp: "",
    activities: [{ title: "", minutes: 10, description: "" }],
    materials: [""],
    assessment: "",
    differentiation: "",
    homework: "",
  };
}

export function formFromPlan(plan: LessonPlan): LessonPlanForm {
  const objectives = parseObjectives(plan.objectives);
  const activities = parseActivities(plan.activities);
  const materials = parseMaterials(plan.materials);
  return {
    title: plan.title || "",
    lessonDate: plan.lessonDate || "",
    durationMinutes: plan.durationMinutes || 45,
    periodLabel: plan.periodLabel || "",
    schedulePeriodId: plan.schedulePeriodId || "",
    subjectId: plan.subjectId || "",
    subjectName: plan.subjectName || "",
    gradeLevelId: plan.gradeLevelId || "",
    gradeLevelName: plan.gradeLevelName || "",
    classroomId: plan.classroomId || "",
    classroomName: plan.classroomName || "",
    objectives: objectives.length ? objectives : [""],
    standards: plan.standards || "",
    warmUp: plan.warmUp || "",
    activities: activities.length
      ? activities
      : [{ title: "", minutes: 10, description: "" }],
    materials: materials.length ? materials : [""],
    assessment: plan.assessment || "",
    differentiation: plan.differentiation || "",
    homework: plan.homework || "",
  };
}

export function formToPayload(form: LessonPlanForm) {
  return {
    title: form.title.trim(),
    lessonDate: form.lessonDate,
    durationMinutes: Number(form.durationMinutes) || 45,
    periodLabel: form.periodLabel.trim() || null,
    schedulePeriodId: form.schedulePeriodId || null,
    subjectId: form.subjectId,
    subjectName: form.subjectName,
    gradeLevelId: form.gradeLevelId || null,
    gradeLevelName: form.gradeLevelName || null,
    classroomId: form.classroomId || null,
    classroomName: form.classroomName || null,
    objectives: form.objectives.map((o) => o.trim()).filter(Boolean),
    standards: form.standards.trim() || null,
    warmUp: form.warmUp.trim() || null,
    activities: form.activities
      .map((a) => ({
        title: a.title.trim(),
        minutes: a.minutes != null && a.minutes !== ("" as any) ? Number(a.minutes) : null,
        description: (a.description || "").trim(),
      }))
      .filter((a) => a.title),
    materials: form.materials.map((m) => m.trim()).filter(Boolean),
    assessment: form.assessment.trim() || null,
    differentiation: form.differentiation.trim() || null,
    homework: form.homework.trim() || null,
  };
}

export function statusLabel(status: string) {
  const keyMap: Record<string, string> = {
    DRAFT: "draft",
    SUBMITTED: "inReview",
    APPROVED: "approved",
    RETURNED: "returned",
  };
  const enMap: Record<string, string> = {
    DRAFT: "Draft",
    SUBMITTED: "In review",
    APPROVED: "Approved",
    RETURNED: "Returned",
  };
  const key = keyMap[status];
  if (key) return i18n.t(`pages:lessonPlans.status.${key}`) || enMap[status];
  return status;
}

export function statusChipClass(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "SUBMITTED":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "RETURNED":
      return "bg-rose-50 text-rose-700 border-rose-100";
    default:
      return "bg-slate-50 text-slate-600 border-slate-100";
  }
}

/** Monday (local) of the week containing `isoDate` (YYYY-MM-DD). */
export function weekStartOf(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDayLabel(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
