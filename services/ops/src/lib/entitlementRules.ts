import type { EntitlementRule } from "./entitlements";

export const OPS_ENTITLEMENT_RULES: EntitlementRule[] = [
  { pattern: /^\/api\/schools\/[^/]+\/vehicles/, feature: "transport" },
  { pattern: /^\/api\/schools\/[^/]+\/transport/, feature: "transport" },
  { pattern: /^\/api\/transport/, feature: "transport" },
  { pattern: /^\/api\/schools\/[^/]+\/inventory/, feature: "inventory" },
  { pattern: /^\/api\/inventory/, feature: "inventory" },
  { pattern: /^\/api\/schools\/[^/]+\/work-orders/, feature: "maintenance" },
  { pattern: /^\/api\/work-orders/, feature: "maintenance" },
  { pattern: /^\/api\/schools\/[^/]+\/security-logs/, feature: "security" },
];
