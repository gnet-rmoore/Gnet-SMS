/** Server-enforced admission status transitions. */

export const ADMISSION_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "WAITLISTED",
  "FEE_PENDING",
  "DOCS_PENDING",
  "ENROLLED",
  "WITHDRAWN",
] as const;

export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];

/** Canonical server-enforced transition map (single source of truth). */
export const ALLOWED: Record<string, string[]> = {
  PENDING: ["UNDER_REVIEW", "WITHDRAWN", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "WAITLISTED", "UNDER_REVIEW", "DOCS_PENDING"],
  APPROVED: ["FEE_PENDING", "DOCS_PENDING", "ENROLLED", "UNDER_REVIEW"],
  FEE_PENDING: ["DOCS_PENDING", "ENROLLED", "APPROVED", "UNDER_REVIEW"],
  DOCS_PENDING: ["ENROLLED", "UNDER_REVIEW", "FEE_PENDING"],
  WAITLISTED: ["UNDER_REVIEW", "REJECTED", "APPROVED"],
  REJECTED: ["UNDER_REVIEW"],
  WITHDRAWN: [],
  ENROLLED: [],
};

/** Statuses the state machine permits a direct transition into ENROLLED. */
export const ENROLLABLE_STATUSES = Object.keys(ALLOWED).filter((from) =>
  (ALLOWED[from] || []).includes("ENROLLED")
) as readonly string[];

export function isEnrollableStatus(status: string): boolean {
  return ENROLLABLE_STATUSES.includes(status);
}

export function canTransition(from: string, to: string): boolean {
  if (from === to) return true;
  return (ALLOWED[from] || []).includes(to);
}

/** In-progress statuses a server-driven enroll may auto-approve from. */
export const AUTO_APPROVE_FROM = ["PENDING", "UNDER_REVIEW", "WAITLISTED"] as const;

/**
 * Ordered statuses to walk so an application becomes enrollable from `from`, resolving the
 * status machine server-side instead of letting the client guess the next transition.
 *
 * Returns `[]` when already enrollable, `null` when no automatic approval path exists
 * (e.g. REJECTED/WITHDRAWN — those must be handled explicitly by staff).
 */
export function resolveApprovalPath(from: string): string[] | null {
  if (isEnrollableStatus(from)) return [];
  if (!(AUTO_APPROVE_FROM as readonly string[]).includes(from)) return null;
  if (canTransition(from, "APPROVED")) return ["APPROVED"];
  if (canTransition(from, "UNDER_REVIEW") && canTransition("UNDER_REVIEW", "APPROVED")) {
    return ["UNDER_REVIEW", "APPROVED"];
  }
  return null;
}

export function assertTransition(from: string, to: string) {
  if (from === to) return;
  const allowed = ALLOWED[from] || [];
  if (!allowed.includes(to)) {
    const err: any = new Error(`Invalid status transition ${from} → ${to}`);
    err.code = "INVALID_STATUS_TRANSITION";
    err.status = 400;
    throw err;
  }
}

export function generateApplicationNumber(schoolId: string): string {
  const short = schoolId.replace(/-/g, "").slice(0, 4).toUpperCase();
  const n = Date.now().toString(36).toUpperCase().slice(-6);
  return `APP-${short}-${n}`;
}
