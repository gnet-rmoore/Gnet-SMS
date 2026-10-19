/** Template ids shared with Finance + frontend — keep in sync with receiptTemplateRegistry. */
export const RECEIPT_TEMPLATE_IDS = [
  "COMPACT_GRID",
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
    : "MINIMAL_LINE";
}

export function isKnownReceiptTemplateId(value: unknown): boolean {
  const id = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
  return RECEIPT_TEMPLATE_IDS.includes(id as ReceiptTemplateId);
}
