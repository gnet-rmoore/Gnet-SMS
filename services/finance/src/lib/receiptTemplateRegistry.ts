/** Receipt HTML/PDF template registry — shared IDs with frontend `src/features/receipts/registry.ts`. */

export const RECEIPT_TEMPLATE_IDS = [
  "PDFKIT_DEFAULT",
  "CLASSIC_LEDGER",
  "SIDEBAR_RAIL",
  "COMPACT_GRID",
  "BORDERED_FORMAL",
  "MINIMAL_LINE",
] as const;

export type ReceiptTemplateId = (typeof RECEIPT_TEMPLATE_IDS)[number];

export type ReceiptTemplateEngine = "pdfkit" | "html";

export type ReceiptTemplateDef = {
  id: ReceiptTemplateId;
  name: string;
  description: string;
  accent: string;
  slug?: string;
  engine: ReceiptTemplateEngine;
  recommendedFor: Array<"FEE_PAYMENT" | "PAYSLIP" | "EXPENSE" | "TRANSACTION">;
};

export const RECEIPT_TEMPLATES: ReceiptTemplateDef[] = [
  {
    id: "PDFKIT_DEFAULT",
    name: "Classic PDF (built-in)",
    description: "Original server PDF layout — reliable fallback when HTML rendering is unavailable.",
    accent: "#2563EB",
    engine: "pdfkit",
    recommendedFor: ["FEE_PAYMENT", "PAYSLIP", "EXPENSE", "TRANSACTION"],
  },
  {
    id: "CLASSIC_LEDGER",
    name: "Classic Ledger",
    description: "Serif ledger with clean totals and signature line.",
    accent: "#1a1a1a",
    slug: "classic-ledger",
    engine: "html",
    recommendedFor: ["FEE_PAYMENT", "TRANSACTION"],
  },
  {
    id: "SIDEBAR_RAIL",
    name: "Sidebar Rail",
    description: "Brand-color sidebar accent without a heavy header band.",
    accent: "#2563EB",
    slug: "sidebar-rail",
    engine: "html",
    recommendedFor: ["FEE_PAYMENT", "TRANSACTION"],
  },
  {
    id: "COMPACT_GRID",
    name: "Compact Grid",
    description: "Dense grid for payslips and expense receipts with many line items.",
    accent: "#475569",
    slug: "compact-grid",
    engine: "html",
    recommendedFor: ["PAYSLIP", "EXPENSE"],
  },
  {
    id: "BORDERED_FORMAL",
    name: "Bordered Formal",
    description: "Formal bordered layout for official fee receipts.",
    accent: "#0f172a",
    slug: "bordered-formal",
    engine: "html",
    recommendedFor: ["FEE_PAYMENT"],
  },
  {
    id: "MINIMAL_LINE",
    name: "Minimal Line",
    description: "Modern minimal layout with thin rules and bold total.",
    accent: "#64748b",
    slug: "minimal-line",
    engine: "html",
    recommendedFor: ["FEE_PAYMENT", "PAYSLIP", "EXPENSE", "TRANSACTION"],
  },
];

export function resolveReceiptTemplateId(value: unknown): ReceiptTemplateId {
  const id = String(value || "").trim().toUpperCase().replace(/-/g, "_");
  if (id === "CLASSIC_LEDGER") return "CLASSIC_LEDGER";
  return RECEIPT_TEMPLATE_IDS.includes(id as ReceiptTemplateId)
    ? (id as ReceiptTemplateId)
    : "PDFKIT_DEFAULT";
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

export function parseReceiptTemplatesJson(
  rawJson: string | null | undefined,
  legacySingle?: unknown
): ReceiptTemplatesByType {
  if (!rawJson) return mergeReceiptTemplates(null, legacySingle);
  try {
    return mergeReceiptTemplates(JSON.parse(rawJson), legacySingle);
  } catch {
    return mergeReceiptTemplates(null, legacySingle);
  }
}

export function resolveReceiptTemplateForType(
  type: ReceiptTypeKey | string,
  templates: unknown,
  legacySingle?: unknown
): ReceiptTemplateId {
  const map = mergeReceiptTemplates(templates, legacySingle);
  const key = String(type || "").toUpperCase() as ReceiptTypeKey;
  if (RECEIPT_TYPE_KEYS.includes(key)) return map[key];
  return resolveReceiptTemplateId(legacySingle);
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

export const RECEIPT_ISSUE_ROLE_ORDER: Record<ReceiptTypeKey, ReceiptTemplateRoleKey[]> = {
  FEE_PAYMENT: ["REGISTRAR", "PRINCIPAL", "SCHOOL_ADMIN"],
  PAYSLIP: ["ACCOUNTANT", "SCHOOL_ADMIN"],
  EXPENSE: ["ACCOUNTANT", "SCHOOL_ADMIN"],
  TRANSACTION: ["ACCOUNTANT", "SCHOOL_ADMIN"],
};

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

/** Parse role buckets from DB JSON or Identity internal GET object. */
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
      const parsed =
        typeof legacyFlat === "string" ? JSON.parse(legacyFlat) : legacyFlat;
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

export function resolveReceiptTemplateForIssue(
  type: ReceiptTypeKey | string,
  byRole: ReceiptTemplatesByRole,
  legacyFlat?: unknown,
  legacySingle?: unknown
): ReceiptTemplateId {
  const typeKey = String(type || "").toUpperCase() as ReceiptTypeKey;
  if (!RECEIPT_TYPE_KEYS.includes(typeKey)) {
    return resolveReceiptTemplateId(legacySingle);
  }

  for (const role of RECEIPT_ISSUE_ROLE_ORDER[typeKey]) {
    const storage = storageRoleKey(role);
    const val = byRole[storage]?.[typeKey];
    if (val) return resolveReceiptTemplateId(val);
  }

  if (legacyFlat && typeof legacyFlat === "object" && !Array.isArray(legacyFlat)) {
    const flat = legacyFlat as Record<string, unknown>;
    if (flat[typeKey]) return resolveReceiptTemplateId(flat[typeKey]);
  }

  return resolveReceiptTemplateId(legacySingle);
}
