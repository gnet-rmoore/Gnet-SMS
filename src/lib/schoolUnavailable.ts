/** Client-side school status gates (mirrors Identity `domain/schoolStatus`). */

const LOGIN_BLOCKED_STATUSES = new Set([
  "SUSPENDED",
  "CLOSED",
  "REJECTED",
  "DRAFT",
  "PENDING_REVIEW",
]);

export function isTrialExpired(
  status?: string | null,
  trialEndsAt?: string | null
): boolean {
  if (status !== "TRIAL") return false;
  if (!trialEndsAt) return false;
  const at = new Date(trialEndsAt);
  if (Number.isNaN(at.getTime())) return false;
  return at.getTime() < Date.now();
}

export function isSchoolLoginAllowed(
  status?: string | null,
  trialEndsAt?: string | null
): boolean {
  if (!status) return true;
  if (isTrialExpired(status, trialEndsAt)) return false;
  return !LOGIN_BLOCKED_STATUSES.has(status);
}

export const SCHOOL_UNAVAILABLE_PATH = "/school-unavailable";
export const SCHOOL_UNAVAILABLE_STORAGE_KEY = "sms-school-unavailable";

export type SchoolUnavailablePayload = {
  schoolStatus: string;
  schoolName?: string | null;
  schoolSlug?: string | null;
  trialEndsAt?: string | null;
};

export function buildSchoolUnavailableUrl(payload: SchoolUnavailablePayload): string {
  const params = new URLSearchParams();
  if (payload.schoolStatus) params.set("status", payload.schoolStatus);
  if (payload.schoolName) params.set("name", payload.schoolName);
  const qs = params.toString();
  return qs ? `${SCHOOL_UNAVAILABLE_PATH}?${qs}` : SCHOOL_UNAVAILABLE_PATH;
}

export function rememberSchoolUnavailable(payload: SchoolUnavailablePayload) {
  try {
    sessionStorage.setItem(SCHOOL_UNAVAILABLE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readSchoolUnavailable(): SchoolUnavailablePayload | null {
  try {
    const raw = sessionStorage.getItem(SCHOOL_UNAVAILABLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SchoolUnavailablePayload;
    if (!parsed?.schoolStatus) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSchoolUnavailable() {
  try {
    sessionStorage.removeItem(SCHOOL_UNAVAILABLE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Full navigation after logout — used from API client. */
export function redirectToSchoolUnavailable(payload: SchoolUnavailablePayload) {
  rememberSchoolUnavailable(payload);
  window.location.href = buildSchoolUnavailableUrl(payload);
}
