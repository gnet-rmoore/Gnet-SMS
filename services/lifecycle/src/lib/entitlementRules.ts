import type { EntitlementRule } from "./entitlements";

export const LIFECYCLE_ENTITLEMENT_RULES: EntitlementRule[] = [
  { pattern: /^\/api\/schools\/[^/]+\/applications/, feature: "admissions" },
  { pattern: /^\/api\/applications/, feature: "admissions" },
  { pattern: /^\/api\/public\/applications/, feature: "admissions" },
  { pattern: /^\/api\/schools\/[^/]+\/attendance/, feature: "attendance" },
  { pattern: /^\/api\/attendance/, feature: "attendance" },
];
