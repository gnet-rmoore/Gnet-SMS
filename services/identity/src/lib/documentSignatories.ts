/**
 * School-level map of document roles → staff user ids whose Profile
 * signatures are placed on official printouts / PDFs.
 * See docs/DOCUMENT_SIGNATURES_PLAN.md
 */

export type DocumentSignatorySlot =
  | "principal"
  | "registrar"
  | "accountant"
  | "vpa"
  | "vpi"
  | "secondary";

export type DocumentSignatories = Partial<
  Record<DocumentSignatorySlot, { userId: string }>
>;

export const DOCUMENT_SIGNATORY_SLOTS: DocumentSignatorySlot[] = [
  "principal",
  "registrar",
  "accountant",
  "vpa",
  "vpi",
  "secondary",
];

export function parseDocumentSignatories(raw: unknown): DocumentSignatories {
  if (!raw) return {};
  let obj: any = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!obj || typeof obj !== "object") return {};

  const out: DocumentSignatories = {};
  for (const slot of DOCUMENT_SIGNATORY_SLOTS) {
    const entry = obj[slot];
    const userId =
      typeof entry === "string"
        ? entry.trim()
        : entry && typeof entry === "object"
          ? String(entry.userId ?? "").trim()
          : "";
    if (userId) out[slot] = { userId };
  }
  return out;
}

export function serializeDocumentSignatories(raw: unknown): string {
  return JSON.stringify(parseDocumentSignatories(raw));
}
