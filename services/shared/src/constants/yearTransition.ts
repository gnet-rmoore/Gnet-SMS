/** Roles allowed to capture census, edit/commit runs, and print statements. */
export const YEAR_TRANSITION_ROLES = [
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
] as const;

export type YearTransitionRole = (typeof YEAR_TRANSITION_ROLES)[number];

/** Roles allowed to activate a brand-new academic year (destructive-ish tenant-wide action). */
export const YEAR_START_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL"] as const;

export type YearStartRole = (typeof YEAR_START_ROLES)[number];

export const PROMOTION_OUTCOMES = [
  "PROMOTED",
  "REPEAT",
  "GRADUATED",
  "DO_NOT_RETURN",
] as const;

export type PromotionOutcome = (typeof PROMOTION_OUTCOMES)[number];

export function canAccessYearTransition(role?: string | null): boolean {
  if (!role) return false;
  return (YEAR_TRANSITION_ROLES as readonly string[]).includes(role);
}
