/** Pure school-status helpers (no Prisma) — safe for unit tests. */

const LOGIN_BLOCKED_STATUSES = new Set(["SUSPENDED", "CLOSED", "REJECTED", "DRAFT", "PENDING_REVIEW"]);

export const ALLOWED_SCHOOL_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "TRIAL",
  "ACTIVE",
  "SUSPENDED",
  "REJECTED",
  "CLOSED",
] as const;

export function isTrialExpired(
  status?: string | null,
  trialEndsAt?: Date | string | null
): boolean {
  if (status !== "TRIAL") return false;
  if (!trialEndsAt) return false;
  const at = trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
  if (Number.isNaN(at.getTime())) return false;
  return at.getTime() < Date.now();
}

export function isSchoolLoginAllowed(
  status?: string | null,
  trialEndsAt?: Date | string | null
): boolean {
  if (!status) return true;
  if (isTrialExpired(status, trialEndsAt)) return false;
  return !LOGIN_BLOCKED_STATUSES.has(status);
}
