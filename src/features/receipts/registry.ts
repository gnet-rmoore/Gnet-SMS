/** Receipt template metadata for Settings picker — IDs match Finance registry. */

export const RECEIPT_TEMPLATE_IDS = [
  "COMPACT_GRID",
  "MINIMAL_LINE",
] as const;

export type ReceiptTemplateId = (typeof RECEIPT_TEMPLATE_IDS)[number];

export type ReceiptTemplateDef = {
  id: ReceiptTemplateId;
  name: string;
  description: string;
  accent: string;
  engine: "pdfkit" | "html";
  recommendedFor: Array<"FEE_PAYMENT" | "PAYSLIP" | "EXPENSE" | "TRANSACTION">;
};

export const RECEIPT_TEMPLATES: ReceiptTemplateDef[] = [
  {
    id: "COMPACT_GRID",
    name: "Compact Grid",
    description: "Dense grid for payslips and expense receipts with many line items.",
    accent: "#475569",
    engine: "html",
    recommendedFor: ["PAYSLIP", "EXPENSE"],
  },
  {
    id: "MINIMAL_LINE",
    name: "Minimal Line",
    description: "Modern minimal layout with thin rules and bold total.",
    accent: "#64748b",
    engine: "html",
    recommendedFor: ["FEE_PAYMENT", "PAYSLIP", "EXPENSE", "TRANSACTION"],
  },
];

export function resolveReceiptTemplateId(value: unknown): ReceiptTemplateId {
  const raw = String(value || "").trim();
  const id = raw.toUpperCase().replace(/-/g, "_");
  return RECEIPT_TEMPLATE_IDS.includes(id as ReceiptTemplateId)
    ? (id as ReceiptTemplateId)
    : "MINIMAL_LINE";
}

export function getReceiptTemplateDef(id: ReceiptTemplateId): ReceiptTemplateDef {
  return RECEIPT_TEMPLATES.find((t) => t.id === id) || RECEIPT_TEMPLATES[0];
}

export function isHtmlReceiptTemplate(id: ReceiptTemplateId): boolean {
  return getReceiptTemplateDef(id).engine === "html";
}

export const RECEIPT_TYPE_KEYS = [
  "FEE_PAYMENT",
  "PAYSLIP",
  "EXPENSE",
  "TRANSACTION",
] as const;

export type ReceiptTypeKey = (typeof RECEIPT_TYPE_KEYS)[number];

export type ReceiptTemplatesByType = Record<ReceiptTypeKey, ReceiptTemplateId>;

export function defaultReceiptTemplates(legacySingle?: unknown): ReceiptTemplatesByType {
  const fallback = resolveReceiptTemplateId(legacySingle);
  return {
    FEE_PAYMENT: fallback,
    PAYSLIP: fallback,
    EXPENSE: fallback,
    TRANSACTION: fallback,
  };
}

export function mergeReceiptTemplates(
  raw: unknown,
  legacySingle?: unknown
): ReceiptTemplatesByType {
  const merged = defaultReceiptTemplates(legacySingle);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return merged;
  const obj = raw as Record<string, unknown>;
  for (const key of RECEIPT_TYPE_KEYS) {
    if (obj[key] != null && String(obj[key]).trim()) {
      merged[key] = resolveReceiptTemplateId(obj[key]);
    }
  }
  return merged;
}

export type ReceiptTemplateRoleKey =
  | "SCHOOL_ADMIN"
  | "IT_ADMIN"
  | "PRINCIPAL"
  | "REGISTRAR"
  | "ACCOUNTANT";

export type ReceiptTemplatesByRole = Partial<
  Record<ReceiptTemplateRoleKey, Partial<ReceiptTemplatesByType>>
>;

/** Receipt types each role may configure (private bucket — no cross-role overwrite). */
export const RECEIPT_TYPES_FOR_ROLE: Record<ReceiptTemplateRoleKey, ReceiptTypeKey[]> = {
  SCHOOL_ADMIN: [...RECEIPT_TYPE_KEYS],
  IT_ADMIN: [...RECEIPT_TYPE_KEYS],
  PRINCIPAL: ["FEE_PAYMENT"],
  REGISTRAR: ["FEE_PAYMENT"],
  ACCOUNTANT: ["PAYSLIP", "EXPENSE", "TRANSACTION"],
};

export function receiptTemplateRoleKey(role: string | null | undefined): ReceiptTemplateRoleKey | null {
  const r = String(role || "").toUpperCase();
  if (r === "SCHOOL_ADMIN" || r === "IT_ADMIN" || r === "PRINCIPAL" || r === "REGISTRAR" || r === "ACCOUNTANT") {
    return r;
  }
  return null;
}

export function receiptTypesForRole(role: string | null | undefined): ReceiptTypeKey[] {
  const key = receiptTemplateRoleKey(role);
  return key ? [...RECEIPT_TYPES_FOR_ROLE[key]] : [];
}

function storageRoleKey(role: ReceiptTemplateRoleKey): ReceiptTemplateRoleKey {
  return role === "IT_ADMIN" ? "SCHOOL_ADMIN" : role;
}

function isRoleKey(key: string): key is ReceiptTemplateRoleKey {
  return (
    key === "SCHOOL_ADMIN" ||
    key === "IT_ADMIN" ||
    key === "PRINCIPAL" ||
    key === "REGISTRAR" ||
    key === "ACCOUNTANT"
  );
}

function isFlatTypeMap(obj: Record<string, unknown>): boolean {
  return RECEIPT_TYPE_KEYS.some((k) => k in obj);
}

function mergePartialTypeMap(raw: Record<string, unknown>): Partial<ReceiptTemplatesByType> {
  const partial: Partial<ReceiptTemplatesByType> = {};
  for (const key of RECEIPT_TYPE_KEYS) {
    if (raw[key] != null && String(raw[key]).trim()) {
      partial[key] = resolveReceiptTemplateId(raw[key]);
    }
  }
  return partial;
}

export function parseReceiptTemplatesByRole(
  raw: string | ReceiptTemplatesByRole | null | undefined,
  legacyFlat?: unknown,
  legacySingle?: unknown
): ReceiptTemplatesByRole {
  const legacyFallback = defaultReceiptTemplates(legacySingle);
  const out: ReceiptTemplatesByRole = {};

  const ingestFlat = (rawVal: unknown) => {
    if (!rawVal || typeof rawVal !== "object" || Array.isArray(rawVal)) return;
    const obj = rawVal as Record<string, unknown>;
    if (isFlatTypeMap(obj)) {
      out.SCHOOL_ADMIN = mergeReceiptTemplates(obj, legacySingle);
      return;
    }
    for (const [key, val] of Object.entries(obj)) {
      if (!isRoleKey(key) || !val || typeof val !== "object" || Array.isArray(val)) continue;
      const storage = storageRoleKey(key);
      out[storage] = {
        ...(out[storage] || {}),
        ...mergePartialTypeMap(val as Record<string, unknown>),
      };
    }
  };

  if (typeof raw === "string" && raw.trim()) {
    try {
      ingestFlat(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  } else if (raw && typeof raw === "object") {
    ingestFlat(raw);
  }

  if (legacyFlat) {
    try {
      let parsed = legacyFlat;
      if (typeof legacyFlat === "string") parsed = JSON.parse(legacyFlat);
      if (!out.SCHOOL_ADMIN) ingestFlat(parsed);
    } catch {
      /* ignore */
    }
  }

  if (Object.keys(out).length === 0) {
    out.SCHOOL_ADMIN = { ...legacyFallback };
  }

  return out;
}

export function getReceiptTemplatesForRole(
  byRole: ReceiptTemplatesByRole,
  role: string | null | undefined,
  legacySingle?: unknown
): ReceiptTemplatesByType {
  const roleKey = receiptTemplateRoleKey(role);
  const allowed = roleKey ? RECEIPT_TYPES_FOR_ROLE[roleKey] : [...RECEIPT_TYPE_KEYS];
  const storage = roleKey ? storageRoleKey(roleKey) : "SCHOOL_ADMIN";
  const bucket = byRole[storage];
  const fallback = resolveReceiptTemplateId(legacySingle);
  const result = defaultReceiptTemplates(legacySingle);
  for (const typeKey of allowed) {
    result[typeKey] = resolveReceiptTemplateId(bucket?.[typeKey] ?? fallback);
  }
  return result;
}

export function receiptTemplatesPatchForRole(
  role: string | null | undefined,
  values: ReceiptTemplatesByType
): Partial<ReceiptTemplatesByType> {
  const patch: Partial<ReceiptTemplatesByType> = {};
  for (const typeKey of receiptTypesForRole(role)) {
    patch[typeKey] = values[typeKey];
  }
  return patch;
}

export function parseReceiptTemplatesFromSchool(
  school: {
    receiptTemplatesByRole?: unknown;
    receiptTemplates?: unknown;
    receiptTemplate?: unknown;
  },
  role?: string | null
): ReceiptTemplatesByType {
  let legacyFlat = school.receiptTemplates;
  if (typeof legacyFlat === "string") {
    try {
      legacyFlat = JSON.parse(legacyFlat);
    } catch {
      legacyFlat = null;
    }
  }
  const byRole = parseReceiptTemplatesByRole(
    school.receiptTemplatesByRole as ReceiptTemplatesByRole | string | null | undefined,
    legacyFlat,
    school.receiptTemplate
  );
  return getReceiptTemplatesForRole(byRole, role, school.receiptTemplate);
}

/** Omit data URLs and oversized values — preview uses Identity school logo instead. */
export function previewLogoQueryParam(logoUrl?: string | null): string | undefined {
  if (!logoUrl || typeof logoUrl !== "string") return undefined;
  const trimmed = logoUrl.trim();
  if (!trimmed || trimmed.startsWith("data:")) return undefined;
  if (trimmed.length > 2048) return undefined;
  return trimmed;
}

export function receiptPreviewUrl(
  schoolId: string,
  templateId: ReceiptTemplateId,
  opts?: { logoUrl?: string | null; brandColor?: string | null; schoolName?: string; address?: string }
): string {
  const q = new URLSearchParams({ templateId });
  const logo = previewLogoQueryParam(opts?.logoUrl);
  if (logo) q.set("logoUrl", logo);
  if (opts?.brandColor) q.set("brandColor", opts.brandColor);
  if (opts?.schoolName) q.set("schoolName", opts.schoolName);
  if (opts?.address) q.set("schoolAddress", opts.address);
  return `/api/schools/${schoolId}/receipts/preview?${q.toString()}`;
}
