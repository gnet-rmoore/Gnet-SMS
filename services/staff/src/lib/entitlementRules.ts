import type { EntitlementRule } from "./entitlements";

export const STAFF_ENTITLEMENT_RULES: EntitlementRule[] = [
  { pattern: /^\/api\/schools\/[^/]+\/leave-/, feature: "leave" },
  { pattern: /^\/api\/leave-requests/, feature: "leave" },
  { pattern: /^\/api\/schools\/[^/]+\/staff-tasks/, feature: "staff" },
  { pattern: /^\/api\/staff-tasks/, feature: "staff" },
  { pattern: /^\/api\/schools\/[^/]+\/staff-attendance/, feature: "staff" },
  { pattern: /^\/api\/schools\/[^/]+\/payrolls/, feature: "payroll" },
  { pattern: /^\/api\/payrolls/, feature: "payroll" },
  { pattern: /^\/api\/users\/[^/]+\/payrolls/, feature: "payroll" },
];
