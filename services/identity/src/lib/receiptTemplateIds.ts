/** Template ids shared with Finance + frontend — keep in sync with receiptTemplateRegistry. */
export const RECEIPT_TEMPLATE_IDS = [
  "PDFKIT_DEFAULT",
  "CLASSIC_LEDGER",
  "SIDEBAR_RAIL",
  "COMPACT_GRID",
  "BORDERED_FORMAL",
  "MINIMAL_LINE",
] as const;

export type ReceiptTemplateId = (typeof RECEIPT_TEMPLATE_IDS)[number];

export function resolveReceiptTemplateId(value: unknown): ReceiptTemplateId {
  const id = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
  return RECEIPT_TEMPLATE_IDS.includes(id as ReceiptTemplateId)
    ? (id as ReceiptTemplateId)
    : "PDFKIT_DEFAULT";
}

export function isKnownReceiptTemplateId(value: unknown): boolean {
  const id = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
  return RECEIPT_TEMPLATE_IDS.includes(id as ReceiptTemplateId);
}
