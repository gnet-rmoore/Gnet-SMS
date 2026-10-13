/** Mirror of identity platform feature keys used by campus routes (keep in sync). */
export type PlatformFeatureKey =
  | "library"
  | "clinic"
  | "counseling"
  | "athletics"
  | "hostel"
  | "cafeteria"
  | "transport";

export const CAMPUS_FEATURE_KEYS: PlatformFeatureKey[] = [
  "library",
  "clinic",
  "counseling",
  "athletics",
  "hostel",
  "cafeteria",
];

/** Re-export resolveEntitlements logic inline for tests — runtime uses Identity internal API. */
export function resolveEntitlements(
  _planCode: string | null | undefined,
  _override: string | null | undefined
): PlatformFeatureKey[] {
  return [...CAMPUS_FEATURE_KEYS];
}
