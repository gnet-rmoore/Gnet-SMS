import type { EntitlementRule } from "./entitlements";

export const CAMPUS_ENTITLEMENT_RULES: EntitlementRule[] = [
  { pattern: /^\/api\/schools\/[^/]+\/library/, feature: "library" },
  { pattern: /^\/api\/library/, feature: "library" },
  { pattern: /^\/api\/schools\/[^/]+\/clinic/, feature: "clinic" },
  { pattern: /^\/api\/clinic/, feature: "clinic" },
  { pattern: /^\/api\/schools\/[^/]+\/counseling/, feature: "counseling" },
  { pattern: /^\/api\/counseling/, feature: "counseling" },
  { pattern: /^\/api\/schools\/[^/]+\/athletics/, feature: "athletics" },
  { pattern: /^\/api\/athletics/, feature: "athletics" },
  { pattern: /^\/api\/schools\/[^/]+\/hostel/, feature: "hostel" },
  { pattern: /^\/api\/hostel/, feature: "hostel" },
  { pattern: /^\/api\/schools\/[^/]+\/cafeteria/, feature: "cafeteria" },
  { pattern: /^\/api\/cafeteria/, feature: "cafeteria" },
];
