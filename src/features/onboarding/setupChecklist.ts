import { APP_BRAND_DEFAULT } from "../../lib/brandPalette";

export type SetupStepId =
  | "branding"
  | "grades"
  | "subjects"
  | "staff"
  | "classrooms"
  | "calendar"
  | "fees"
  | "admissionPolicy";

export type SetupStepStatus = "done" | "todo" | "unknown";

export type SetupStepDef = {
  id: SetupStepId;
  label: string;
  /** Route path segment under `/:slug/` */
  path: string;
  /** Roles that can open the deep link (matches ProtectedRoute). */
  openRoles: readonly string[];
  /** Required steps gate Mark setup complete. Soft steps do not. */
  required: boolean;
};

/** Default platform brand — keeping this color alone without a logo is not “branding done”. */
export const SETUP_DEFAULT_BRAND = APP_BRAND_DEFAULT;

export const SETUP_STEPS: readonly SetupStepDef[] = [
  {
    id: "branding",
    label: "Set school branding (logo / brand color)",
    path: "settings",
    openRoles: ["SCHOOL_ADMIN", "IT_ADMIN"],
    required: true,
  },
  {
    id: "grades",
    label: "Add at least one grade level",
    path: "curriculum",
    openRoles: ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"],
    required: true,
  },
  {
    id: "subjects",
    label: "Add at least one subject",
    path: "curriculum",
    openRoles: ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"],
    required: true,
  },
  {
    id: "staff",
    label: "Add at least one teacher",
    path: "staff",
    openRoles: [
      "SCHOOL_ADMIN",
      "PRINCIPAL",
      "VPA",
      "VPI",
      "SECURITY",
      "IT_ADMIN",
      "ATHLETICS_DIRECTOR",
    ],
    required: true,
  },
  {
    id: "classrooms",
    label: "Create a classroom cohort",
    path: "classrooms",
    openRoles: ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"],
    required: true,
  },
  {
    id: "calendar",
    label: "Set academic calendar with at least one period",
    path: "settings/academic-calendar",
    openRoles: ["SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR"],
    required: true,
  },
  {
    id: "fees",
    label: "Add at least one fee template",
    path: "fees",
    openRoles: ["SCHOOL_ADMIN", "ACCOUNTANT", "STUDENT", "PARENT"],
    required: true,
  },
  {
    id: "admissionPolicy",
    label: "Review online admission / public apply settings",
    path: "admissions",
    openRoles: ["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL"],
    required: false,
  },
] as const;

export const REQUIRED_SETUP_STEPS = SETUP_STEPS.filter((s) => s.required);

/** localStorage key for soft admission-policy review. */
export function admissionPolicyReviewedKey(schoolId: string): string {
  return `sms.setup.admissionPolicyReviewed.${schoolId}`;
}

export function isAdmissionPolicyReviewed(schoolId: string | undefined): boolean {
  if (!schoolId || typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(admissionPolicyReviewedKey(schoolId)) === "1";
  } catch {
    return false;
  }
}

export function markAdmissionPolicyReviewed(schoolId: string): void {
  try {
    localStorage.setItem(admissionPolicyReviewedKey(schoolId), "1");
  } catch {
    /* ignore quota / private mode */
  }
}

/** Normalize hex for comparison (#RGB / #RRGGBB, any case, optional spaces). */
export function normalizeBrandHex(value: string | null | undefined): string | null {
  if (value == null) return null;
  let raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  if (!raw.startsWith("#")) raw = `#${raw}`;
  if (/^#[0-9a-f]{3}$/.test(raw)) {
    const r = raw[1];
    const g = raw[2];
    const b = raw[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  return raw;
}

export function isBrandingDone(input: {
  logoUrl?: string | null;
  brandColor?: string | null;
}): boolean {
  const logo = typeof input.logoUrl === "string" ? input.logoUrl.trim() : "";
  if (logo.length > 0) return true;
  const hex = normalizeBrandHex(input.brandColor);
  if (!hex) return false;
  return hex !== normalizeBrandHex(SETUP_DEFAULT_BRAND);
}

export function isNonEmptyList(data: unknown): boolean {
  return Array.isArray(data) && data.length > 0;
}

/** Map fetch outcome to checklist status — never treat errors as empty todo. */
export function statusFromFetch(ok: boolean, data: unknown): SetupStepStatus {
  if (!ok) return "unknown";
  return isNonEmptyList(data) ? "done" : "todo";
}

export function statusFromPredicate(ok: boolean, done: boolean): SetupStepStatus {
  if (!ok) return "unknown";
  return done ? "done" : "todo";
}

/** True when staff list includes at least one TEACHER (needed to create classrooms). */
export function hasTeacher(staff: unknown): boolean {
  if (!Array.isArray(staff)) return false;
  return staff.some((row) => {
    if (!row || typeof row !== "object") return false;
    const role = (row as { role?: unknown }).role;
    const active = (row as { isActive?: unknown }).isActive;
    if (role !== "TEACHER") return false;
    if (active === false) return false;
    return true;
  });
}

/**
 * Academic calendar is ready when the payload has at least one period
 * (matches gradebook / exams empty-state gates).
 */
export function isCalendarReady(calendar: unknown): boolean {
  if (!calendar || typeof calendar !== "object") return false;
  const periods = (calendar as { periods?: unknown }).periods;
  return Array.isArray(periods) && periods.length > 0;
}

export function canOpenSetupStep(role: string | undefined, stepId: SetupStepId): boolean {
  if (!role) return false;
  const step = SETUP_STEPS.find((s) => s.id === stepId);
  if (!step) return false;
  return step.openRoles.includes(role);
}

export function setupStepHref(slug: string | undefined, path: string): string {
  return `/${slug || ""}/${path}`.replace(/\/+/g, "/");
}

export function allRequiredDone(
  items: Array<{ id: SetupStepId; status: SetupStepStatus }>
): boolean {
  return REQUIRED_SETUP_STEPS.every((step) => {
    const item = items.find((i) => i.id === step.id);
    return item?.status === "done";
  });
}
