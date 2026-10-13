/** Shared guide progress types (mirrors Identity domain). */

export const GUIDE_VERSION = 1;

export type GuideStepStatus = "todo" | "done" | "skipped";
export type GuideStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "DISMISSED";

export type GuideProgress = {
  trackId: string;
  version: number;
  status: GuideStatus;
  steps: Record<string, GuideStepStatus>;
  dismissedAt?: string | null;
  completedAt?: string | null;
  activeStepId?: string | null;
  welcomeTipSentAt?: string | null;
};

/** Shorter student curriculum when under 13 (plan §14). */
export const STUDENT_UNDER13_STEP_IDS = new Set([
  "student_intro",
  "student_schedule",
  "student_classes",
  "student_grades",
  "student_done",
]);

export function filterStepsForStudentAge(
  trackId: string | null | undefined,
  steps: GuideStepDef[],
  under13: boolean
): GuideStepDef[] {
  if (trackId !== "student" || !under13) return steps;
  return steps.filter((s) => STUDENT_UNDER13_STEP_IDS.has(s.id));
}

export type GuideStepType =
  | "intro"
  | "nav_spotlight"
  | "page_spotlight"
  | "action"
  | "concept"
  | "honesty"
  | "completion";

export type GuideStepDef = {
  id: string;
  type: GuideStepType;
  /** i18n keys under pages.guide.steps.<id>.* — title/body resolved via t(`guide.steps.${id}.title`) */
  titleKey: string;
  bodyKey: string;
  /** Relative path under /:slug/ */
  route?: string;
  /** data-guide-id on sidebar / control */
  anchorId?: string;
  /** nav.* capability required */
  navCapability?: string;
  /** Mark done when pathname matches (prefix) */
  visitPaths?: string[];
};

export type GuideTrackDef = {
  id: string;
  titleKey: string;
  subtitleKey: string;
  steps: GuideStepDef[];
};

export function wizardTrackForRole(role: string | null | undefined): string | null {
  if (!role) return null;
  switch (role) {
    case "TEACHER":
      return "teacher";
    case "STUDENT":
      return "student";
    case "PARENT":
      return "parent";
    case "SCHOOL_ADMIN":
    case "IT_ADMIN":
      return "staff_admin";
    case "PRINCIPAL":
    case "VPI":
      return "staff_academic_lead";
    case "VPA":
      return "staff_ops_lead";
    case "REGISTRAR":
      return "staff_registrar";
    case "ACCOUNTANT":
      return "staff_finance";
    case "MAINTENANCE":
    case "PROCUREMENT":
    case "SECURITY":
    case "TRANSPORTATION":
    case "HOSTEL_WARDEN":
    case "CAFETERIA_MANAGER":
    case "ATHLETICS_DIRECTOR":
      return "staff_ops_specialist";
    case "NURSE":
    case "COUNSELOR":
    case "LIBRARIAN":
      return "staff_care";
    case "SUPER_ADMIN":
      return "super_admin";
    default:
      return null;
  }
}

function step(
  id: string,
  type: GuideStepType,
  opts: Partial<Omit<GuideStepDef, "id" | "type" | "titleKey" | "bodyKey">> = {}
): GuideStepDef {
  return {
    id,
    type,
    titleKey: `guide.steps.${id}.title`,
    bodyKey: `guide.steps.${id}.body`,
    ...opts,
  };
}

export const GUIDE_TRACKS: Record<string, GuideTrackDef> = {
  teacher: {
    id: "teacher",
    titleKey: "guide.tracks.teacher.title",
    subtitleKey: "guide.tracks.teacher.subtitle",
    steps: [
      step("teacher_intro", "intro"),
      step("teacher_schedule", "nav_spotlight", {
        route: "my-schedule",
        anchorId: "nav-my-schedule",
        navCapability: "nav.my-schedule",
        visitPaths: ["my-schedule"],
      }),
      step("teacher_classes", "nav_spotlight", {
        route: "classroom",
        anchorId: "nav-classroom",
        navCapability: "nav.classroom",
        visitPaths: ["classroom"],
      }),
      step("teacher_attendance", "nav_spotlight", {
        route: "attendance",
        anchorId: "nav-attendance",
        navCapability: "nav.attendance",
        visitPaths: ["attendance"],
      }),
      step("teacher_lesson_plans", "nav_spotlight", {
        route: "lesson-plans",
        anchorId: "nav-lesson-plans",
        navCapability: "nav.lesson-plans",
        visitPaths: ["lesson-plans"],
      }),
      step("teacher_gradebook", "nav_spotlight", {
        route: "gradebook",
        anchorId: "nav-gradebook",
        navCapability: "nav.gradebook",
        visitPaths: ["gradebook"],
      }),
      step("teacher_grade_review", "nav_spotlight", {
        route: "grade-review",
        anchorId: "nav-grade-review",
        navCapability: "nav.grade-review",
        visitPaths: ["grade-review"],
      }),
      step("teacher_exams", "nav_spotlight", {
        route: "exams",
        anchorId: "nav-exams",
        navCapability: "nav.exams",
        visitPaths: ["exams", "online-exams"],
      }),
      step("teacher_staff_portal", "nav_spotlight", {
        route: "staff-portal",
        anchorId: "nav-staff-portal",
        navCapability: "nav.staff-portal",
        visitPaths: ["staff-portal"],
      }),
      step("teacher_done", "completion"),
    ],
  },
  student: {
    id: "student",
    titleKey: "guide.tracks.student.title",
    subtitleKey: "guide.tracks.student.subtitle",
    steps: [
      step("student_intro", "intro"),
      step("student_schedule", "nav_spotlight", {
        route: "my-schedule",
        anchorId: "nav-my-schedule",
        navCapability: "nav.my-schedule",
        visitPaths: ["my-schedule", "calendar"],
      }),
      step("student_classes", "nav_spotlight", {
        route: "classroom",
        anchorId: "nav-classroom",
        navCapability: "nav.classroom",
        visitPaths: ["classroom"],
      }),
      step("student_grades", "nav_spotlight", {
        route: "grades",
        anchorId: "nav-grades",
        navCapability: "nav.grades",
        visitPaths: ["grades"],
      }),
      step("student_exams", "nav_spotlight", {
        route: "exams",
        anchorId: "nav-exams",
        navCapability: "nav.exams",
        visitPaths: ["exams", "online-exams"],
      }),
      step("student_attendance", "nav_spotlight", {
        route: "attendance",
        anchorId: "nav-attendance",
        navCapability: "nav.attendance",
        visitPaths: ["attendance"],
      }),
      step("student_fees", "nav_spotlight", {
        route: "fees",
        anchorId: "nav-fees",
        navCapability: "nav.fees",
        visitPaths: ["fees"],
      }),
      step("student_done", "completion"),
    ],
  },
  parent: {
    id: "parent",
    titleKey: "guide.tracks.parent.title",
    subtitleKey: "guide.tracks.parent.subtitle",
    steps: [
      step("parent_intro", "intro"),
      step("parent_children", "nav_spotlight", {
        route: "children",
        anchorId: "nav-children",
        navCapability: "nav.children",
        visitPaths: ["children"],
      }),
      step("parent_schedule", "nav_spotlight", {
        route: "my-schedule",
        anchorId: "nav-my-schedule",
        navCapability: "nav.my-schedule",
        visitPaths: ["my-schedule"],
      }),
      step("parent_grades", "nav_spotlight", {
        route: "grades",
        anchorId: "nav-grades",
        navCapability: "nav.grades",
        visitPaths: ["grades"],
      }),
      step("parent_attendance", "nav_spotlight", {
        route: "attendance",
        anchorId: "nav-attendance",
        navCapability: "nav.attendance",
        visitPaths: ["attendance"],
      }),
      step("parent_fees", "nav_spotlight", {
        route: "fees",
        anchorId: "nav-fees",
        navCapability: "nav.fees",
        visitPaths: ["fees"],
      }),
      step("parent_comms", "nav_spotlight", {
        route: "announcements",
        anchorId: "nav-announcements",
        navCapability: "nav.announcements",
        visitPaths: ["announcements", "documents", "pta"],
      }),
      step("parent_done", "completion"),
    ],
  },
  staff_registrar: {
    id: "staff_registrar",
    titleKey: "guide.tracks.staff_registrar.title",
    subtitleKey: "guide.tracks.staff_registrar.subtitle",
    steps: [
      step("reg_intro", "intro"),
      step("reg_admissions", "nav_spotlight", {
        route: "admissions",
        anchorId: "nav-admissions",
        navCapability: "nav.admissions",
        visitPaths: ["admissions"],
      }),
      step("reg_students", "nav_spotlight", {
        route: "students",
        anchorId: "nav-students",
        navCapability: "nav.students",
        visitPaths: ["students"],
      }),
      step("reg_enrollment", "nav_spotlight", {
        route: "enrollment",
        anchorId: "nav-enrollment",
        navCapability: "nav.enrollment",
        visitPaths: ["enrollment"],
      }),
      step("reg_transcripts", "nav_spotlight", {
        route: "transcripts",
        anchorId: "nav-transcripts",
        navCapability: "nav.transcripts",
        visitPaths: ["transcripts", "student-records"],
      }),
      step("reg_done", "completion"),
    ],
  },
  staff_finance: {
    id: "staff_finance",
    titleKey: "guide.tracks.staff_finance.title",
    subtitleKey: "guide.tracks.staff_finance.subtitle",
    steps: [
      step("fin_intro", "intro"),
      step("fin_fees", "nav_spotlight", {
        route: "fees",
        anchorId: "nav-fees",
        navCapability: "nav.fees",
        visitPaths: ["fees"],
      }),
      step("fin_expenses", "nav_spotlight", {
        route: "expenses",
        anchorId: "nav-expenses",
        navCapability: "nav.expenses",
        visitPaths: ["expenses"],
      }),
      step("fin_payroll", "nav_spotlight", {
        route: "payroll",
        anchorId: "nav-payroll",
        navCapability: "nav.payroll",
        visitPaths: ["payroll"],
      }),
      step("fin_portal", "nav_spotlight", {
        route: "staff-portal",
        anchorId: "nav-staff-portal",
        navCapability: "nav.staff-portal",
        visitPaths: ["staff-portal"],
      }),
      step("fin_done", "completion"),
    ],
  },
  staff_academic_lead: {
    id: "staff_academic_lead",
    titleKey: "guide.tracks.staff_academic_lead.title",
    subtitleKey: "guide.tracks.staff_academic_lead.subtitle",
    steps: [
      step("acad_intro", "intro"),
      step("acad_curriculum", "nav_spotlight", {
        route: "curriculum",
        anchorId: "nav-curriculum",
        navCapability: "nav.curriculum",
        visitPaths: ["curriculum"],
      }),
      step("acad_classrooms", "nav_spotlight", {
        route: "classrooms",
        anchorId: "nav-classrooms",
        navCapability: "nav.classrooms",
        visitPaths: ["classrooms"],
      }),
      step("acad_grade_review", "nav_spotlight", {
        route: "grade-review",
        anchorId: "nav-grade-review",
        navCapability: "nav.grade-review",
        visitPaths: ["grade-review"],
      }),
      step("acad_exams", "nav_spotlight", {
        route: "exam-paper-review",
        anchorId: "nav-exam-paper-review",
        navCapability: "nav.exam-paper-review",
        visitPaths: ["exam-paper-review", "exams"],
      }),
      step("acad_attendance", "nav_spotlight", {
        route: "attendance",
        anchorId: "nav-attendance",
        navCapability: "nav.attendance",
        visitPaths: ["attendance"],
      }),
      step("acad_done", "completion"),
    ],
  },
  staff_admin: {
    id: "staff_admin",
    titleKey: "guide.tracks.staff_admin.title",
    subtitleKey: "guide.tracks.staff_admin.subtitle",
    steps: [
      step("admin_intro", "intro"),
      step("admin_settings", "nav_spotlight", {
        route: "settings",
        anchorId: "nav-settings",
        navCapability: "nav.settings",
        visitPaths: ["settings"],
      }),
      step("admin_roles", "nav_spotlight", {
        route: "roles",
        anchorId: "nav-roles",
        navCapability: "nav.roles",
        visitPaths: ["roles"],
      }),
      step("admin_calendar", "nav_spotlight", {
        route: "academic-calendar",
        anchorId: "nav-academic-calendar",
        navCapability: "nav.academic-calendar",
        visitPaths: ["academic-calendar"],
      }),
      step("admin_staff", "nav_spotlight", {
        route: "staff",
        anchorId: "nav-staff",
        navCapability: "nav.staff",
        visitPaths: ["staff"],
      }),
      step("admin_onboarding", "nav_spotlight", {
        route: "onboarding",
        anchorId: "nav-onboarding",
        navCapability: "nav.onboarding",
        visitPaths: ["onboarding"],
      }),
      step("admin_done", "completion"),
    ],
  },
  staff_ops_lead: {
    id: "staff_ops_lead",
    titleKey: "guide.tracks.staff_ops_lead.title",
    subtitleKey: "guide.tracks.staff_ops_lead.subtitle",
    steps: [
      step("ops_intro", "intro"),
      step("ops_leave", "nav_spotlight", {
        route: "leave-approvals",
        anchorId: "nav-leave-approvals",
        navCapability: "nav.leave-approvals",
        visitPaths: ["leave-approvals"],
      }),
      step("ops_maintenance", "nav_spotlight", {
        route: "maintenance",
        anchorId: "nav-maintenance",
        navCapability: "nav.maintenance",
        visitPaths: ["maintenance", "work-orders"],
      }),
      step("ops_portal", "nav_spotlight", {
        route: "staff-portal",
        anchorId: "nav-staff-portal",
        navCapability: "nav.staff-portal",
        visitPaths: ["staff-portal"],
      }),
      step("ops_done", "completion"),
    ],
  },
  staff_ops_specialist: {
    id: "staff_ops_specialist",
    titleKey: "guide.tracks.staff_ops_specialist.title",
    subtitleKey: "guide.tracks.staff_ops_specialist.subtitle",
    steps: [
      step("spec_intro", "intro"),
      step("spec_hub", "concept"),
      step("spec_live_tools", "concept"),
      step("spec_portal", "nav_spotlight", {
        route: "staff-portal",
        anchorId: "nav-staff-portal",
        navCapability: "nav.staff-portal",
        visitPaths: ["staff-portal"],
      }),
      step("spec_calendar", "nav_spotlight", {
        route: "calendar",
        anchorId: "nav-calendar",
        navCapability: "nav.calendar",
        visitPaths: ["calendar"],
      }),
      step("spec_done", "completion"),
    ],
  },
  staff_care: {
    id: "staff_care",
    titleKey: "guide.tracks.staff_care.title",
    subtitleKey: "guide.tracks.staff_care.subtitle",
    steps: [
      step("care_intro", "intro"),
      step("care_live_tools", "concept"),
      step("care_calendar", "nav_spotlight", {
        route: "calendar",
        anchorId: "nav-calendar",
        navCapability: "nav.calendar",
        visitPaths: ["calendar"],
      }),
      step("care_docs", "nav_spotlight", {
        route: "documents",
        anchorId: "nav-documents",
        navCapability: "nav.documents",
        visitPaths: ["documents"],
      }),
      step("care_portal", "nav_spotlight", {
        route: "staff-portal",
        anchorId: "nav-staff-portal",
        navCapability: "nav.staff-portal",
        visitPaths: ["staff-portal"],
      }),
      step("care_done", "completion"),
    ],
  },
  super_admin: {
    id: "super_admin",
    titleKey: "guide.tracks.super_admin.title",
    subtitleKey: "guide.tracks.super_admin.subtitle",
    steps: [
      step("sa_intro", "intro"),
      step("sa_schools", "nav_spotlight", {
        route: "schools",
        anchorId: "nav-schools",
        visitPaths: ["schools"],
      }),
      step("sa_registrations", "nav_spotlight", {
        route: "registrations",
        anchorId: "nav-registrations",
        visitPaths: ["registrations"],
      }),
      step("sa_users", "nav_spotlight", {
        route: "users",
        anchorId: "nav-users",
        visitPaths: ["users"],
      }),
      step("sa_reports", "nav_spotlight", {
        route: "reports",
        anchorId: "nav-reports",
        visitPaths: ["reports"],
      }),
      step("sa_settings", "nav_spotlight", {
        route: "settings",
        anchorId: "nav-settings",
        visitPaths: ["settings"],
      }),
      step("sa_done", "completion"),
    ],
  },
};

export function filterStepsForCapabilities(
  steps: GuideStepDef[],
  capabilities: string[] | null | undefined
): GuideStepDef[] {
  // Capabilities not loaded yet → show full track (avoid empty checklist flash).
  if (capabilities == null) return steps;
  // Explicit empty matrix → keep ungated steps only (intro / honesty / completion).
  if (capabilities.length === 0) {
    return steps.filter((s) => !s.navCapability);
  }
  return steps.filter((s) => !s.navCapability || capabilities.includes(s.navCapability));
}

export function progressPercent(steps: GuideStepDef[], progress: GuideProgress | null): number {
  if (!steps.length) return 0;
  const done = steps.filter((s) => {
    const st = progress?.steps?.[s.id];
    return st === "done" || st === "skipped";
  }).length;
  return Math.round((done / steps.length) * 100);
}

export function firstIncompleteStep(
  steps: GuideStepDef[],
  progress: GuideProgress | null
): GuideStepDef | null {
  return (
    steps.find((s) => {
      const st = progress?.steps?.[s.id];
      return st !== "done" && st !== "skipped";
    }) || null
  );
}

export function pathMatchesVisit(pathname: string, visitPaths?: string[]): boolean {
  if (!visitPaths?.length) return false;
  const parts = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  if (parts[0] === "super-admin") {
    const under = parts.slice(1).join("/");
    return visitPaths.some((p) => under === p || under.startsWith(`${p}/`));
  }
  const under = parts.slice(1).join("/"); // drop school slug
  return visitPaths.some((p) => under === p || under.startsWith(`${p}/`));
}
