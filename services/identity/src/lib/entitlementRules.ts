import type { EntitlementRule } from "./entitlements";

/** Identity-owned routes gated by SaaS plan entitlements. */
export const IDENTITY_ENTITLEMENT_RULES: EntitlementRule[] = [
  { pattern: /^\/api\/schools\/[^/]+\/students\/import/, feature: "bulk_import" },
  { pattern: /^\/api\/schools\/[^/]+\/students$/, method: "POST", feature: "enrollment" },
  { pattern: /^\/api\/schools\/[^/]+\/staff$/, method: "POST", feature: "staff" },
  { pattern: /^\/api\/schools\/[^/]+\/staff/, feature: "staff" },
  { pattern: /^\/api\/schools\/[^/]+\/role-capabilities/, feature: "roles_access" },
  { pattern: /^\/api\/schools\/[^/]+\/users/, feature: "roles_access" },
  { pattern: /^\/api\/schools\/[^/]+\/role-audit/, feature: "roles_access" },
  { pattern: /^\/api\/schools\/[^/]+\/guide-stats/, feature: "reports" },
  { pattern: /^\/api\/schools\/[^/]+\/api-keys/, feature: "api_access" },
];
