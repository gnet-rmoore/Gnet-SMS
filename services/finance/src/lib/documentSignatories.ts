/**
 * Resolve school document-signatory slots for Finance PDFs.
 * Mirrors frontend/identity parse (keep in sync with docs/DOCUMENT_SIGNATURES_PLAN.md).
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

const SLOTS: DocumentSignatorySlot[] = [
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
  for (const slot of SLOTS) {
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

export function isOfficialSignatureDataUrl(url?: string | null): string | null {
  const u = url?.trim();
  if (!u || !u.startsWith("data:image/")) return null;
  return u;
}
