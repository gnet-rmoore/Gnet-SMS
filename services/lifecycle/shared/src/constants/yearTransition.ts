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
  "DROPPED_OUT",
  "DO_NOT_RETURN",
] as const;

export type PromotionOutcome = (typeof PROMOTION_OUTCOMES)[number];

/** Outcomes that keep the student on the roster for the next year (needs a class). */
export const CONTINUING_OUTCOMES = ["PROMOTED", "REPEAT"] as const;

/** Outcomes that remove the student from active enrollment. */
export const EXIT_OUTCOMES = ["GRADUATED", "DROPPED_OUT", "DO_NOT_RETURN"] as const;

/** Outcome categories surfaced separately on the Promotion Statement. */
export const PROMOTION_OUTCOME_LABELS: Record<PromotionOutcome, string> = {
  PROMOTED: "Promoted",
  REPEAT: "Repeating",
  GRADUATED: "Graduated",
  DROPPED_OUT: "Dropped out",
  DO_NOT_RETURN: "Not returning",
};

export function isContinuingOutcome(outcome: string): boolean {
  return (CONTINUING_OUTCOMES as readonly string[]).includes(String(outcome || "").toUpperCase());
}

export function isExitOutcome(outcome: string): boolean {
  return (EXIT_OUTCOMES as readonly string[]).includes(String(outcome || "").toUpperCase());
}

export function canAccessYearTransition(role?: string | null): boolean {
  if (!role) return false;
  return (YEAR_TRANSITION_ROLES as readonly string[]).includes(role);
}
