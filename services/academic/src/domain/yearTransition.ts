export {
  YEAR_TRANSITION_ROLES,
  type YearTransitionRole,
  YEAR_START_ROLES,
  type YearStartRole,
  PROMOTION_OUTCOMES,
  type PromotionOutcome,
  canAccessYearTransition,
} from "../../../shared/src/constants/yearTransition";

export const PROMOTION_RUN_STATUSES = ["DRAFT", "COMMITTED", "CANCELLED"] as const;

export function normalizeGender(raw: string | null | undefined): "Male" | "Female" | "Other" | "Unknown" {
  const g = String(raw || "")
    .trim()
    .toLowerCase();
  if (!g) return "Unknown";
  if (g === "male" || g === "m" || g === "boy" || g === "boys") return "Male";
  if (g === "female" || g === "f" || g === "girl" || g === "girls") return "Female";
  if (g === "other" || g === "non-binary" || g === "nonbinary") return "Other";
  return "Unknown";
}
