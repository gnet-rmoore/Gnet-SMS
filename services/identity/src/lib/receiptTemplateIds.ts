/** Template ids shared with Finance + frontend — keep in sync with receiptTemplateRegistry. */
export const RECEIPT_TEMPLATE_IDS = [
  "FEE_OFFICIAL_RECEIPT",
  "FEE_PAYMENT_CONFIRMATION",
  "PAYSLIP_EARNINGS_DEDUCTIONS",
  "PAYSLIP_NET_PAY_HERO",
  "EXPENSE_EXECUTIVE_VOUCHER",
  "EXPENSE_CLEAN_LEDGER",
] as const;

export type ReceiptTemplateId = (typeof RECEIPT_TEMPLATE_IDS)[number];

export const DEFAULT_RECEIPT_TEMPLATE_ID: ReceiptTemplateId = "FEE_OFFICIAL_RECEIPT";

export function isKnownReceiptTemplateId(value: unknown): boolean {
  const id = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
  return RECEIPT_TEMPLATE_IDS.includes(id as ReceiptTemplateId);
}

export function resolveReceiptTemplateId(value: unknown): ReceiptTemplateId {
  return isKnownReceiptTemplateId(value)
    ? (String(value).trim().toUpperCase().replace(/-/g, "_") as ReceiptTemplateId)
    : DEFAULT_RECEIPT_TEMPLATE_ID;
}
