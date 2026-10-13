/**
 * Client helpers: school document-signatory slots → resolved official signatures.
 * Companion: docs/DOCUMENT_SIGNATURES_PLAN.md
 */

import {
  getOfficialSignatureUrl,
  type SignatureUserRef,
} from "./userSignature";

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

export type StaffSignatureRef = SignatureUserRef & {
  id: string;
  role?: string | null;
  title?: string | null;
};

export type OfficialSignatory = {
  name: string;
  title: string;
  signatureUrl: string | null;
  userId?: string | null;
};

export const DOCUMENT_SIGNATORY_SLOTS: DocumentSignatorySlot[] = [
  "principal",
  "registrar",
  "accountant",
  "vpa",
  "vpi",
  "secondary",
];

export const DOCUMENT_SIGNATORY_SLOT_LABELS: Record<DocumentSignatorySlot, string> = {
  principal: "Principal / Head of School",
  registrar: "Registrar",
  accountant: "Accountant (receipts)",
  vpa: "Vice Principal (Admin)",
  vpi: "Vice Principal (Instruction)",
  secondary: "Secondary signatory (certificates)",
};

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

export function serializeDocumentSignatories(
  map: DocumentSignatories
): string {
  return JSON.stringify(parseDocumentSignatories(map));
}

/** Default title shown under a signature line for a slot. */
export function defaultTitleForSlot(slot: DocumentSignatorySlot): string {
  switch (slot) {
    case "principal":
      return "School Principal";
    case "registrar":
      return "Registrar";
    case "accountant":
      return "Accountant";
    case "vpa":
      return "Vice Principal (Admin)";
    case "vpi":
      return "Vice Principal (Instruction)";
    case "secondary":
      return "Education Chairman";
    default:
      return "";
  }
}

/**
 * Resolve a school slot to name / title / signature image.
 * Soft role fallback is OFF — empty Settings → blank signature.
 */
export function resolveDocumentSignatory(
  slot: DocumentSignatorySlot,
  map: DocumentSignatories | null | undefined,
  staff: StaffSignatureRef[] | null | undefined,
  overrides?: { name?: string | null; title?: string | null; userId?: string | null }
): OfficialSignatory {
  const overrideUserId = overrides?.userId?.trim() || "";
  const mappedUserId = map?.[slot]?.userId?.trim() || "";
  const userId = overrideUserId || mappedUserId || "";
  const user = userId
    ? (staff || []).find((s) => s.id === userId) || null
    : null;

  const name =
    (overrides?.name || "").trim() ||
    (user?.name || "").trim() ||
    "";
  const title =
    (overrides?.title || "").trim() ||
    (user?.title || "").trim() ||
    defaultTitleForSlot(slot);

  return {
    name,
    title,
    signatureUrl: getOfficialSignatureUrl(user),
    userId: user?.id || userId || null,
  };
}

export function resolveSignatoryByUserId(
  userId: string | null | undefined,
  staff: StaffSignatureRef[] | null | undefined,
  overrides?: { name?: string | null; title?: string | null }
): OfficialSignatory {
  const id = (userId || "").trim();
  const user = id ? (staff || []).find((s) => s.id === id) || null : null;
  return {
    name: (overrides?.name || "").trim() || (user?.name || "").trim() || "",
    title: (overrides?.title || "").trim() || (user?.title || "").trim() || "",
    signatureUrl: getOfficialSignatureUrl(user),
    userId: user?.id || id || null,
  };
}

/** Staff eligible for document signature pickers (have a saved data-URL signature). */
export function staffWithOfficialSignatures(
  staff: StaffSignatureRef[] | null | undefined
): StaffSignatureRef[] {
  return (staff || []).filter((s) => Boolean(getOfficialSignatureUrl(s)));
}
