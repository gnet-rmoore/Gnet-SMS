import type { EntitlementRule } from "./entitlements";

export const COMMS_ENTITLEMENT_RULES: EntitlementRule[] = [
  { pattern: /^\/api\/schools\/[^/]+\/announcements/, feature: "communications" },
  { pattern: /^\/api\/announcements/, feature: "communications" },
  { pattern: /^\/api\/schools\/[^/]+\/documents/, feature: "documents" },
  { pattern: /^\/api\/documents/, feature: "documents" },
  { pattern: /^\/api\/schools\/[^/]+\/notification-preferences/, feature: "notifications" },
  { pattern: /^\/api\/notifications/, feature: "notifications" },
  { pattern: /^\/api\/schools\/[^/]+\/pta/, feature: "pta" },
  { pattern: /^\/api\/pta/, feature: "pta" },
];
