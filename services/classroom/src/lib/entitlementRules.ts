import type { EntitlementRule } from "./entitlements";

export const CLASSROOM_ENTITLEMENT_RULES: EntitlementRule[] = [
  { pattern: /^\/api\/schools\/[^/]+\/classrooms/, feature: "classrooms" },
  { pattern: /^\/api\/classrooms/, feature: "classroom_workspace" },
  { pattern: /^\/api\/(posts|submissions|topics|comments)/, feature: "classroom_workspace" },
];
