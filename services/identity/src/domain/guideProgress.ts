/** Role-guided wizard progress stored on User.guideProgress (Identity). */

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
  /** Set after one-time “continue your guide” tip email */
  welcomeTipSentAt?: string | null;
};

/** Student DOB → age in full years; null if unknown. */
export function ageYearsFromDob(dob: Date | string | null | undefined, now = new Date()): number | null {
  if (!dob) return null;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age < 0 || age > 120 ? null : age;
}

export function isUnder13(dob: Date | string | null | undefined, now = new Date()): boolean {
  const age = ageYearsFromDob(dob, now);
  return age != null && age < 13;
}

export function emptyGuideProgress(trackId: string): GuideProgress {
  return {
    trackId,
    version: GUIDE_VERSION,
    status: "NOT_STARTED",
    steps: {},
    dismissedAt: null,
    completedAt: null,
    activeStepId: null,
    welcomeTipSentAt: null,
  };
}

export function parseGuideProgress(raw: unknown, fallbackTrackId: string): GuideProgress {
  if (!raw || typeof raw !== "object") return emptyGuideProgress(fallbackTrackId);
  const o = raw as Record<string, unknown>;
  const trackId = typeof o.trackId === "string" && o.trackId ? o.trackId : fallbackTrackId;
  const version = typeof o.version === "number" ? o.version : GUIDE_VERSION;
  const status = (["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "DISMISSED"].includes(String(o.status))
    ? o.status
    : "NOT_STARTED") as GuideStatus;
  const steps =
    o.steps && typeof o.steps === "object" && !Array.isArray(o.steps)
      ? (o.steps as Record<string, GuideStepStatus>)
      : {};
  return {
    trackId,
    version,
    status,
    steps,
    dismissedAt: typeof o.dismissedAt === "string" ? o.dismissedAt : null,
    completedAt: typeof o.completedAt === "string" ? o.completedAt : null,
    activeStepId: typeof o.activeStepId === "string" ? o.activeStepId : null,
    welcomeTipSentAt: typeof o.welcomeTipSentAt === "string" ? o.welcomeTipSentAt : null,
  };
}

/** Map platform role → wizard track (plan §2). */
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

export function mergeGuidePatch(
  current: GuideProgress,
  patch: Partial<GuideProgress> & { restart?: boolean; markStep?: { id: string; status: GuideStepStatus } }
): GuideProgress {
  if (patch.restart) {
    return {
      ...emptyGuideProgress(current.trackId),
      welcomeTipSentAt: current.welcomeTipSentAt ?? null,
    };
  }
  const next: GuideProgress = {
    ...current,
    ...("status" in patch && patch.status ? { status: patch.status } : {}),
    ...("activeStepId" in patch ? { activeStepId: patch.activeStepId ?? null } : {}),
    ...("dismissedAt" in patch ? { dismissedAt: patch.dismissedAt ?? null } : {}),
    ...("completedAt" in patch ? { completedAt: patch.completedAt ?? null } : {}),
    ...("welcomeTipSentAt" in patch ? { welcomeTipSentAt: patch.welcomeTipSentAt ?? null } : {}),
    version: Math.max(GUIDE_VERSION, current.version || GUIDE_VERSION),
    steps: { ...current.steps },
  };
  if (patch.steps && typeof patch.steps === "object") {
    Object.assign(next.steps, patch.steps);
  }
  if (patch.markStep?.id) {
    next.steps[patch.markStep.id] = patch.markStep.status;
    if (next.status === "NOT_STARTED" || next.status === "DISMISSED") {
      next.status = "IN_PROGRESS";
    }
  }
  if (patch.status === "DISMISSED") {
    next.dismissedAt = new Date().toISOString();
  }
  if (patch.status === "COMPLETED") {
    next.completedAt = new Date().toISOString();
  }
  return next;
}
