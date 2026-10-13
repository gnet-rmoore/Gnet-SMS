/**
 * Platform SaaS plans + module entitlements (Super Admin Phase C / G).
 * Code defaults seed the DB; runtime resolve uses an in-memory catalog refreshed from Identity.
 */

/** Major product modules that can be entitled per plan (aligned with landing module catalog). */
export const PLATFORM_FEATURE_CATALOG = [
  // Platform
  { key: "core", label: "Core portal & settings", group: "Platform" },
  { key: "roles_access", label: "Roles & access", group: "Platform" },
  { key: "reports", label: "School reports", group: "Platform" },
  { key: "api_access", label: "API access", group: "Platform" },
  { key: "custom_domain", label: "Custom domain", group: "Platform" },
  // Admissions
  { key: "admissions", label: "Admissions & public apply", group: "Admissions" },
  { key: "enrollment", label: "Enrollment & placement", group: "Admissions" },
  { key: "bulk_import", label: "Bulk roster import", group: "Admissions" },
  { key: "transcripts", label: "Transcripts & student records", group: "Admissions" },
  // Academics
  { key: "curriculum", label: "Curriculum & subjects", group: "Academics" },
  { key: "classrooms", label: "Classrooms & class groups", group: "Academics" },
  { key: "classroom_workspace", label: "Classroom workspace", group: "Academics" },
  { key: "attendance", label: "Attendance & roll call", group: "Academics" },
  { key: "schedules", label: "Schedules & timetables", group: "Academics" },
  { key: "calendar", label: "Academic & school calendar", group: "Academics" },
  { key: "lesson_plans", label: "Lesson plans & syllabi", group: "Academics" },
  // Assessment
  { key: "gradebook", label: "Gradebook", group: "Assessment" },
  { key: "grade_review", label: "Grade review", group: "Assessment" },
  { key: "exams", label: "Exams catalog", group: "Assessment" },
  { key: "exam_paper", label: "Exam paper approval", group: "Assessment" },
  { key: "online_exams", label: "Online exams", group: "Assessment" },
  { key: "report_cards", label: "Report cards", group: "Assessment" },
  // Finance
  { key: "finance", label: "Fees & payments", group: "Finance" },
  { key: "expenses", label: "Expenses", group: "Finance" },
  { key: "payroll", label: "Payroll & payslips", group: "Finance" },
  { key: "receipts", label: "Receipts & public verify", group: "Finance" },
  // People
  { key: "staff", label: "Staff directory & invites", group: "People" },
  { key: "leave", label: "Leave requests & approval", group: "People" },
  { key: "parent_portal", label: "Parent & student portals", group: "People" },
  // Communications
  { key: "communications", label: "Announcements", group: "Communications" },
  { key: "documents", label: "Documents library", group: "Communications" },
  { key: "notifications", label: "In-app notifications", group: "Communications" },
  { key: "pta", label: "PTA", group: "Communications" },
  // Operations
  { key: "maintenance", label: "Maintenance & work orders", group: "Operations" },
  { key: "security", label: "Security incidents", group: "Operations" },
  { key: "procurement", label: "Procurement", group: "Operations" },
  { key: "inventory", label: "Inventory", group: "Operations" },
  // Campus specialists
  { key: "library", label: "Library", group: "Campus specialists" },
  { key: "clinic", label: "Clinic", group: "Campus specialists" },
  { key: "counseling", label: "Counseling", group: "Campus specialists" },
  { key: "athletics", label: "Athletics", group: "Campus specialists" },
  { key: "hostel", label: "Hostel", group: "Campus specialists" },
  { key: "cafeteria", label: "Cafeteria", group: "Campus specialists" },
  { key: "transport", label: "Transport", group: "Campus specialists" },
] as const;

export const PLATFORM_FEATURE_KEYS = PLATFORM_FEATURE_CATALOG.map((f) => f.key);

export type PlatformFeatureKey = (typeof PLATFORM_FEATURE_KEYS)[number];

export const PLATFORM_FEATURE_GROUPS = [
  "Platform",
  "Admissions",
  "Academics",
  "Assessment",
  "Finance",
  "People",
  "Communications",
  "Operations",
  "Campus specialists",
] as const;

export type PlatformFeatureGroup = (typeof PLATFORM_FEATURE_GROUPS)[number];

export function featureLabel(key: string): string {
  const hit = PLATFORM_FEATURE_CATALOG.find((f) => f.key === key);
  return hit?.label || key.replace(/_/g, " ");
}

export function featuresByGroup(): Array<{
  group: PlatformFeatureGroup;
  items: Array<{ key: PlatformFeatureKey; label: string }>;
}> {
  return PLATFORM_FEATURE_GROUPS.map((group) => ({
    group,
    items: PLATFORM_FEATURE_CATALOG.filter((f) => f.group === group).map((f) => ({
      key: f.key as PlatformFeatureKey,
      label: f.label,
    })),
  })).filter((g) => g.items.length > 0);
}

/** Built-in codes used for seed / fallbacks. Custom codes may exist in DB. */
export type PlatformPlanCode = "FREE" | "TRIAL" | "STANDARD" | "PREMIUM" | "ENTERPRISE" | (string & {});

export type PlatformPlan = {
  code: string;
  label: string;
  description: string;
  maxStudents: number | null;
  maxStaff: number | null;
  maxStorageMb: number | null;
  features: PlatformFeatureKey[];
  /** List price USD / month for ledger MRR (FREE/TRIAL = 0). */
  monthlyPriceUsd: number;
  trialDays?: number;
  isActive?: boolean;
  sortOrder?: number;
};

const FREE_FEATURES: PlatformFeatureKey[] = [
  "core",
  "parent_portal",
  "communications",
  "notifications",
  "attendance",
  "classrooms",
  "calendar",
  "documents",
];

const TRIAL_FEATURES: PlatformFeatureKey[] = [
  ...FREE_FEATURES,
  "roles_access",
  "reports",
  "admissions",
  "enrollment",
  "curriculum",
  "classroom_workspace",
  "schedules",
  "lesson_plans",
  "gradebook",
  "grade_review",
  "exams",
  "exam_paper",
  "online_exams",
  "report_cards",
  "finance",
  "expenses",
  "payroll",
  "receipts",
  "staff",
  "leave",
  "bulk_import",
  "transcripts",
  "maintenance",
];

const STANDARD_FEATURES: PlatformFeatureKey[] = [
  ...TRIAL_FEATURES,
  "security",
  "procurement",
  "pta",
];

const PREMIUM_FEATURES: PlatformFeatureKey[] = [
  ...STANDARD_FEATURES,
  "api_access",
  "inventory",
  "library",
  "clinic",
  "counseling",
  "athletics",
  "hostel",
  "cafeteria",
  "transport",
];

const ENTERPRISE_FEATURES: PlatformFeatureKey[] = [...PLATFORM_FEATURE_KEYS];

export const PLATFORM_PLANS: Record<string, PlatformPlan> = {
  FREE: {
    code: "FREE",
    label: "Free",
    description: "Small pilot schools",
    maxStudents: 50,
    maxStaff: 10,
    maxStorageMb: 512,
    features: FREE_FEATURES,
    monthlyPriceUsd: 0,
    isActive: true,
    sortOrder: 0,
  },
  TRIAL: {
    code: "TRIAL",
    label: "Trial",
    description: "Time-boxed evaluation",
    maxStudents: 200,
    maxStaff: 40,
    maxStorageMb: 2048,
    features: TRIAL_FEATURES,
    monthlyPriceUsd: 0,
    trialDays: 30,
    isActive: true,
    sortOrder: 1,
  },
  STANDARD: {
    code: "STANDARD",
    label: "Standard",
    description: "Full school operations",
    maxStudents: 800,
    maxStaff: 120,
    maxStorageMb: 10240,
    features: STANDARD_FEATURES,
    monthlyPriceUsd: 99,
    isActive: true,
    sortOrder: 2,
  },
  PREMIUM: {
    code: "PREMIUM",
    label: "Premium",
    description: "Larger campuses + specialists + API",
    maxStudents: 2500,
    maxStaff: 400,
    maxStorageMb: 51200,
    features: PREMIUM_FEATURES,
    monthlyPriceUsd: 249,
    isActive: true,
    sortOrder: 3,
  },
  ENTERPRISE: {
    code: "ENTERPRISE",
    label: "Enterprise",
    description: "Unlimited seats + custom domain + full catalog",
    maxStudents: null,
    maxStaff: null,
    maxStorageMb: null,
    features: ENTERPRISE_FEATURES,
    monthlyPriceUsd: 599,
    isActive: true,
    sortOrder: 4,
  },
};

/** Platform SaaS billing statuses on School.billingStatus */
export type BillingStatus = "TRIAL" | "ACTIVE_PAID" | "COMP" | "PAST_DUE" | "CANCELLED";

export function isBillingStatus(value: string | null | undefined): value is BillingStatus {
  return (
    value === "TRIAL" ||
    value === "ACTIVE_PAID" ||
    value === "COMP" ||
    value === "PAST_DUE" ||
    value === "CANCELLED"
  );
}

/** Runtime catalog from DB (null = use code defaults). */
let runtimeCatalog: Record<string, PlatformPlan> | null = null;

export function setRuntimePlansCatalog(plans: PlatformPlan[] | null) {
  if (!plans || plans.length === 0) {
    runtimeCatalog = null;
    return;
  }
  runtimeCatalog = Object.fromEntries(plans.map((p) => [p.code, { ...p, code: String(p.code) }]));
}

export function getPlansCatalog(): Record<string, PlatformPlan> {
  return runtimeCatalog || PLATFORM_PLANS;
}

/**
 * Honest ledger MRR: sum of plan list prices for ACTIVE_PAID only.
 * COMP / TRIAL / PAST_DUE / CANCELLED contribute 0.
 */
export function computeLedgerMrrUsd(
  schools: Array<{ planCode?: string | null; billingStatus?: string | null }>
): number {
  let total = 0;
  for (const s of schools) {
    if (s.billingStatus !== "ACTIVE_PAID") continue;
    total += resolvePlan(s.planCode).monthlyPriceUsd;
  }
  return Math.round(total * 100) / 100;
}

export function isPlatformPlanCode(value: string | null | undefined): boolean {
  return Boolean(value && value in getPlansCatalog());
}

export function resolvePlan(planCode: string | null | undefined): PlatformPlan {
  const cat = getPlansCatalog();
  if (planCode && cat[planCode]) return cat[planCode];
  return cat.STANDARD || PLATFORM_PLANS.STANDARD;
}

export function parseFeatureOverride(raw: string | null | undefined): PlatformFeatureKey[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((k): k is PlatformFeatureKey =>
      (PLATFORM_FEATURE_KEYS as readonly string[]).includes(String(k))
    );
  } catch {
    return null;
  }
}

export type QuotaShape = {
  maxStudents: number | null;
  maxStaff: number | null;
  maxStorageMb: number | null;
};

export function parseQuotaOverrides(raw: string | null | undefined): Partial<QuotaShape> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Partial<QuotaShape> = {};
    for (const key of ["maxStudents", "maxStaff", "maxStorageMb"] as const) {
      if (parsed[key] === null) out[key] = null;
      else if (typeof parsed[key] === "number" && Number.isFinite(parsed[key])) out[key] = parsed[key];
    }
    return out;
  } catch {
    return {};
  }
}

export function resolveEntitlements(
  planCode: string | null | undefined,
  entitlementsOverride: string | null | undefined
): PlatformFeatureKey[] {
  const override = parseFeatureOverride(entitlementsOverride);
  if (override && override.length) return Array.from(new Set(override));
  return [...resolvePlan(planCode).features];
}

export function resolveQuotas(
  planCode: string | null | undefined,
  quotaOverrides: string | null | undefined
): QuotaShape {
  const plan = resolvePlan(planCode);
  const o = parseQuotaOverrides(quotaOverrides);
  return {
    maxStudents: o.maxStudents !== undefined ? o.maxStudents : plan.maxStudents,
    maxStaff: o.maxStaff !== undefined ? o.maxStaff : plan.maxStaff,
    maxStorageMb: o.maxStorageMb !== undefined ? o.maxStorageMb : plan.maxStorageMb,
  };
}

export function listPlatformPlans(opts?: { activeOnly?: boolean }): PlatformPlan[] {
  const plans = Object.values(getPlansCatalog());
  const filtered = opts?.activeOnly ? plans.filter((p) => p.isActive !== false) : plans;
  return filtered.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.code.localeCompare(b.code));
}

export function normalizeFeatureKeys(raw: unknown): PlatformFeatureKey[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw
        .map((k) => String(k))
        .filter((k): k is PlatformFeatureKey =>
          (PLATFORM_FEATURE_KEYS as readonly string[]).includes(k)
        )
    )
  );
}

export function sanitizePlanCode(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 32);
}

/** Old 8-key catalog — used to detect one-time feature expansion migration. */
export const LEGACY_PLATFORM_FEATURE_KEYS = [
  "core",
  "finance",
  "payroll",
  "communications",
  "report_cards",
  "online_exams",
  "api_access",
  "custom_domain",
] as const;

/** True when stored features still look like the pre-expansion catalog. */
export function needsFeatureCatalogExpansion(features: string[]): boolean {
  if (!features.length) return true;
  const known = new Set(PLATFORM_FEATURE_KEYS as readonly string[]);
  const expandedHint = features.some(
    (k) => known.has(k) && !(LEGACY_PLATFORM_FEATURE_KEYS as readonly string[]).includes(k)
  );
  return !expandedHint;
}
