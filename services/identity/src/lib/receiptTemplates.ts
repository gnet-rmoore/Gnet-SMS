import {
  isKnownReceiptTemplateId,
  resolveReceiptTemplateId,
  type ReceiptTemplateId,
} from "./receiptTemplateIds";

export const RECEIPT_TYPE_KEYS = [
  "FEE_PAYMENT",
  "PAYSLIP",
  "EXPENSE",
  "TRANSACTION",
] as const;

export type ReceiptTypeKey = (typeof RECEIPT_TYPE_KEYS)[number];

export type ReceiptTemplatesByType = Record<ReceiptTypeKey, string>;

export type ReceiptTemplateRoleKey =
  | "SCHOOL_ADMIN"
  | "IT_ADMIN"
  | "PRINCIPAL"
  | "REGISTRAR"
  | "ACCOUNTANT";

/** Receipt types each role may configure (private bucket — no cross-role overwrite). */
export const RECEIPT_TYPES_FOR_ROLE: Record<ReceiptTemplateRoleKey, ReceiptTypeKey[]> = {
  SCHOOL_ADMIN: [...RECEIPT_TYPE_KEYS],
  IT_ADMIN: [...RECEIPT_TYPE_KEYS],
  PRINCIPAL: ["FEE_PAYMENT"],
  REGISTRAR: ["FEE_PAYMENT"],
  ACCOUNTANT: ["PAYSLIP", "EXPENSE", "TRANSACTION"],
};

/** Role priority when issuing a receipt of a given type. */
export const RECEIPT_ISSUE_ROLE_ORDER: Record<ReceiptTypeKey, ReceiptTemplateRoleKey[]> = {
  FEE_PAYMENT: ["REGISTRAR", "PRINCIPAL", "SCHOOL_ADMIN"],
  PAYSLIP: ["ACCOUNTANT", "SCHOOL_ADMIN"],
  EXPENSE: ["ACCOUNTANT", "SCHOOL_ADMIN"],
  TRANSACTION: ["ACCOUNTANT", "SCHOOL_ADMIN"],
};

export type ReceiptTemplatesByRole = Partial<
  Record<ReceiptTemplateRoleKey, Partial<ReceiptTemplatesByType>>
>;

export function receiptTemplateRoleKey(role: string | null | undefined): ReceiptTemplateRoleKey | null {
  const r = String(role || "").toUpperCase();
  if (r === "SCHOOL_ADMIN" || r === "IT_ADMIN" || r === "PRINCIPAL" || r === "REGISTRAR" || r === "ACCOUNTANT") {
    return r;
  }
  return null;
}

export function storageRoleKey(role: ReceiptTemplateRoleKey): ReceiptTemplateRoleKey {
  return role === "IT_ADMIN" ? "SCHOOL_ADMIN" : role;
}

export const DEFAULT_RECEIPT_TEMPLATES: ReceiptTemplatesByType = {
  FEE_PAYMENT: "FEE_OFFICIAL_RECEIPT",
  PAYSLIP: "PAYSLIP_EARNINGS_DEDUCTIONS",
  EXPENSE: "EXPENSE_EXECUTIVE_VOUCHER",
  TRANSACTION: "FEE_OFFICIAL_RECEIPT",
};

export function defaultReceiptTemplates(_legacySingle?: unknown): ReceiptTemplatesByType {
  return { ...DEFAULT_RECEIPT_TEMPLATES };
}

function normalizeTemplate(value: unknown): ReceiptTemplateId | null {
  if (!isKnownReceiptTemplateId(value)) return null;
  return resolveReceiptTemplateId(value);
}

export function mergeReceiptTemplates(
  raw: unknown,
  legacySingle?: unknown
): ReceiptTemplatesByType {
  const merged = defaultReceiptTemplates(legacySingle);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return merged;
  const obj = raw as Record<string, unknown>;
  for (const key of RECEIPT_TYPE_KEYS) {
    const id = normalizeTemplate(obj[key]);
    if (id) merged[key] = id;
  }
  return merged;
}

function isFlatTypeMap(obj: Record<string, unknown>): boolean {
  return RECEIPT_TYPE_KEYS.some((k) => k in obj);
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

/** Parse DB JSON — supports legacy flat map and role-keyed buckets. */
export function parseReceiptTemplatesByRole(
  rawJson: string | ReceiptTemplatesByRole | null | undefined,
  legacyFlatJson?: string | Record<string, unknown> | null,
  legacySingle?: unknown
): ReceiptTemplatesByRole {
  const legacyFallback = defaultReceiptTemplates(legacySingle);
  const out: ReceiptTemplatesByRole = {};

  const ingestFlat = (raw: unknown) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const obj = raw as Record<string, unknown>;
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

  if (typeof rawJson === "string" && rawJson.trim()) {
    try {
      ingestFlat(JSON.parse(rawJson));
    } catch {
      /* ignore */
    }
  } else if (rawJson && typeof rawJson === "object") {
    ingestFlat(rawJson);
  }
  if (legacyFlatJson) {
    try {
      const flat =
        typeof legacyFlatJson === "string" ? JSON.parse(legacyFlatJson) : legacyFlatJson;
      if (!out.SCHOOL_ADMIN) ingestFlat(flat);
    } catch {
      /* ignore */
    }
  }

  if (Object.keys(out).length === 0) {
    out.SCHOOL_ADMIN = { ...legacyFallback };
  }

  return out;
}

function mergePartialTypeMap(raw: Record<string, unknown>): Partial<ReceiptTemplatesByType> {
  const partial: Partial<ReceiptTemplatesByType> = {};
  for (const key of RECEIPT_TYPE_KEYS) {
    const id = normalizeTemplate(raw[key]);
    if (id) partial[key] = id;
  }
  return partial;
}

export function getReceiptTemplatesForRole(
  byRole: ReceiptTemplatesByRole,
  role: ReceiptTemplateRoleKey,
  legacySingle?: unknown
): Partial<ReceiptTemplatesByType> {
  const storage = storageRoleKey(role);
  const bucket = byRole[storage];
  const allowed = RECEIPT_TYPES_FOR_ROLE[role];
  const defaults = defaultReceiptTemplates(legacySingle);
  const result: Partial<ReceiptTemplatesByType> = {};
  for (const typeKey of allowed) {
    result[typeKey] = normalizeTemplate(bucket?.[typeKey]) ?? defaults[typeKey];
  }
  return result;
}

export function resolveReceiptTemplateForIssue(
  type: ReceiptTypeKey | string,
  byRole: ReceiptTemplatesByRole,
  legacyFlat?: unknown,
  legacySingle?: unknown
): string {
  const typeKey = String(type || "").toUpperCase() as ReceiptTypeKey;
  const defaults = defaultReceiptTemplates(legacySingle);
  if (!RECEIPT_TYPE_KEYS.includes(typeKey)) return defaults.FEE_PAYMENT;

  for (const role of RECEIPT_ISSUE_ROLE_ORDER[typeKey]) {
    const stored = byRole[storageRoleKey(role)]?.[typeKey];
    const id = normalizeTemplate(stored);
    if (id) return id;
  }

  if (legacyFlat && typeof legacyFlat === "object" && !Array.isArray(legacyFlat)) {
    const id = normalizeTemplate((legacyFlat as Record<string, unknown>)[typeKey]);
    if (id) return id;
  }

  return defaults[typeKey];
}

export function mergeRoleReceiptTemplates(
  existing: ReceiptTemplatesByRole,
  role: ReceiptTemplateRoleKey,
  patch: Partial<ReceiptTemplatesByType>
): ReceiptTemplatesByRole {
  const storage = storageRoleKey(role);
  const allowed = new Set(RECEIPT_TYPES_FOR_ROLE[role]);
  const nextBucket: Partial<ReceiptTemplatesByType> = { ...(existing[storage] || {}) };
  for (const [key, val] of Object.entries(patch)) {
    const typeKey = key as ReceiptTypeKey;
    if (!allowed.has(typeKey)) continue;
    const id = normalizeTemplate(val);
    if (id) nextBucket[typeKey] = id;
  }
  return { ...existing, [storage]: nextBucket };
}

export function serializeReceiptTemplatesByRole(byRole: ReceiptTemplatesByRole): string {
  const out: ReceiptTemplatesByRole = {};
  for (const [role, bucket] of Object.entries(byRole)) {
    if (!isRoleKey(role) || !bucket) continue;
    const storage = storageRoleKey(role);
    out[storage] = { ...(out[storage] || {}), ...mergePartialTypeMap(bucket as Record<string, unknown>) };
  }
  return JSON.stringify(out);
}

/** @deprecated flat school-level map — use parseReceiptTemplatesByRole */
export function parseReceiptTemplates(
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

/** @deprecated */
export function serializeReceiptTemplates(map: ReceiptTemplatesByType): string {
  return JSON.stringify(map);
}
