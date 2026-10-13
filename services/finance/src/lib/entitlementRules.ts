import type { EntitlementRule } from "./entitlements";

export const FINANCE_ENTITLEMENT_RULES: EntitlementRule[] = [
  { pattern: /^\/api\/schools\/[^/]+\/fees/, feature: "finance" },
  { pattern: /^\/api\/schools\/[^/]+\/fee-/, feature: "finance" },
  { pattern: /^\/api\/fees/, feature: "finance" },
  { pattern: /^\/api\/my-fees/, feature: "finance" },
  { pattern: /^\/api\/my-fee-payment-txns/, feature: "finance" },
  { pattern: /^\/api\/schools\/[^/]+\/expenses/, feature: "expenses" },
  { pattern: /^\/api\/expenses/, feature: "expenses" },
  { pattern: /^\/api\/schools\/[^/]+\/finance/, feature: "finance" },
  { pattern: /^\/api\/schools\/[^/]+\/receipts/, feature: "receipts" },
  { pattern: /^\/api\/receipts/, feature: "receipts" },
];
