/** Receipt HTML/PDF template registry — shared IDs with frontend `src/features/receipts/registry.ts`. */

export const RECEIPT_TEMPLATE_IDS = [
  "FEE_OFFICIAL_RECEIPT",
  "FEE_PAYMENT_CONFIRMATION",
  "PAYSLIP_EARNINGS_DEDUCTIONS",
  "PAYSLIP_NET_PAY_HERO",
  "EXPENSE_EXECUTIVE_VOUCHER",
  "EXPENSE_CLEAN_LEDGER",
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

export const DEFAULT_RECEIPT_TEMPLATE_ID: ReceiptTemplateId = "FEE_OFFICIAL_RECEIPT";

export const RECEIPT_TEMPLATES: ReceiptTemplateDef[] = [
  {
    id: "FEE_OFFICIAL_RECEIPT",
    name: "Official Receipt",
    description:
      "Burgundy institutional fee receipt with payment details, balance summary, and verification footer.",
    accent: "#7a1f2b",
    slug: "fee-official-receipt",
    engine: "html",
    recommendedFor: ["FEE_PAYMENT", "TRANSACTION"],
  },
  {
    id: "FEE_PAYMENT_CONFIRMATION",
    name: "Payment Confirmation",
    description:
      "Blue payment confirmation with a success card, balance progress bar, and payer/learner details.",
    accent: "#1d4ed8",
    slug: "fee-payment-confirmation",
    engine: "html",
    recommendedFor: ["FEE_PAYMENT", "TRANSACTION"],
  },
  {
    id: "PAYSLIP_EARNINGS_DEDUCTIONS",
    name: "Earnings & Deductions",
    description:
      "Statement-style payslip with side-by-side earnings and deductions tables and a net-pay hero.",
    accent: "#1e293b",
    slug: "payslip-earnings-deductions",
    engine: "html",
    recommendedFor: ["PAYSLIP"],
  },
  {
    id: "PAYSLIP_NET_PAY_HERO",
    name: "Net Pay Hero",
    description: "Teal payslip with a large net-pay panel and a compact salary breakdown.",
    accent: "#0b5d6b",
    slug: "payslip-net-pay-hero",
    engine: "html",
    recommendedFor: ["PAYSLIP"],
  },
  {
    id: "EXPENSE_EXECUTIVE_VOUCHER",
    name: "Executive Voucher",
    description:
      "A4 expense voucher with a bold amount hero, payee/payer grid, itemised charges, and verification.",
    accent: "#0f3d5e",
    slug: "expense-executive-voucher",
    engine: "html",
    recommendedFor: ["EXPENSE"],
  },
  {
    id: "EXPENSE_CLEAN_LEDGER",
    name: "Clean Ledger",
    description:
      "Green payment voucher with numbered itemised charges, a status panel, and a signature line.",
    accent: "#14532d",
    slug: "expense-clean-ledger",
    engine: "html",
    recommendedFor: ["EXPENSE"],
  },
];

export function normalizeReceiptTemplateId(value: unknown): ReceiptTemplateId | null {
  const id = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
  return RECEIPT_TEMPLATE_IDS.includes(id as ReceiptTemplateId)
    ? (id as ReceiptTemplateId)
    : null;
}

export function resolveReceiptTemplateId(value: unknown): ReceiptTemplateId {
  return normalizeReceiptTemplateId(value) ?? DEFAULT_RECEIPT_TEMPLATE_ID;
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

export const DEFAULT_RECEIPT_TEMPLATES: ReceiptTemplatesByType = {
  FEE_PAYMENT: "FEE_OFFICIAL_RECEIPT",
  PAYSLIP: "PAYSLIP_EARNINGS_DEDUCTIONS",
  EXPENSE: "EXPENSE_EXECUTIVE_VOUCHER",
  TRANSACTION: "FEE_OFFICIAL_RECEIPT",
};

export function defaultReceiptTemplates(_legacySingle?: unknown): ReceiptTemplatesByType {
  return { ...DEFAULT_RECEIPT_TEMPLATES };
}

export function mergeReceiptTemplates(
  raw: unknown,
  legacySingle?: unknown
): ReceiptTemplatesByType {
  const merged = defaultReceiptTemplates(legacySingle);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return merged;
  const obj = raw as Record<string, unknown>;
  for (const key of RECEIPT_TYPE_KEYS) {
    const resolved = normalizeReceiptTemplateId(obj[key]);
    if (resolved) merged[key] = resolved;
  }
  return merged;
}

export function resolveReceiptTemplateForType(
  type: ReceiptTypeKey | string,
  templates: unknown,
  legacySingle?: unknown
): ReceiptTemplateId {
  const map = mergeReceiptTemplates(templates, legacySingle);
  const key = String(type || "").toUpperCase() as ReceiptTypeKey;
  if (RECEIPT_TYPE_KEYS.includes(key)) return map[key];
  return DEFAULT_RECEIPT_TEMPLATE_ID;
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
    const id = normalizeReceiptTemplateId(raw[key]);
    if (id) partial[key] = id;
  }
  return partial;
}

/** Parse role buckets from DB JSON or Identity internal GET object. */
export function parseReceiptTemplatesByRole(
  raw: string | ReceiptTemplatesByRole | null | undefined,
  legacyFlat?: unknown,
  legacySingle?: unknown
): ReceiptTemplatesByRole {
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
      const parsed = typeof legacyFlat === "string" ? JSON.parse(legacyFlat) : legacyFlat;
      if (!out.SCHOOL_ADMIN) ingestFlat(parsed);
    } catch {
      /* ignore */
    }
  }

  if (Object.keys(out).length === 0) {
    out.SCHOOL_ADMIN = { ...DEFAULT_RECEIPT_TEMPLATES };
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
  const fallback = RECEIPT_TYPE_KEYS.includes(typeKey)
    ? DEFAULT_RECEIPT_TEMPLATES[typeKey]
    : DEFAULT_RECEIPT_TEMPLATE_ID;
  if (!RECEIPT_TYPE_KEYS.includes(typeKey)) return fallback;

  for (const role of RECEIPT_ISSUE_ROLE_ORDER[typeKey]) {
    const stored = byRole[storageRoleKey(role)]?.[typeKey];
    const id = normalizeReceiptTemplateId(stored);
    if (id) return id;
  }

  if (legacyFlat && typeof legacyFlat === "object" && !Array.isArray(legacyFlat)) {
    const id = normalizeReceiptTemplateId((legacyFlat as Record<string, unknown>)[typeKey]);
    if (id) return id;
  }

  return fallback;
}
