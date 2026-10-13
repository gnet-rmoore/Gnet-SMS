/**
 * Static fallback when `GET /api/public/plans` is unavailable.
 * Keep aligned with Identity `PLATFORM_PLANS` defaults.
 */
export type PublicPlanCard = {
  code: string;
  label: string;
  description: string;
  maxStudents: number | null;
  maxStaff: number | null;
  maxStorageMb: number | null;
  features: string[];
  monthlyPriceUsd: number;
  trialDays?: number | null;
  sortOrder: number;
};

const FREE = [
  "core",
  "parent_portal",
  "communications",
  "notifications",
  "attendance",
  "classrooms",
  "calendar",
  "documents",
];

const TRIAL = [
  ...FREE,
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

const STANDARD = [...TRIAL, "security", "procurement", "pta"];

const PREMIUM = [
  ...STANDARD,
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

/** Mirrors catalog feature keys order for Enterprise “full catalog”. */
const ENTERPRISE = [
  "core",
  "roles_access",
  "reports",
  "api_access",
  "custom_domain",
  "admissions",
  "enrollment",
  "bulk_import",
  "transcripts",
  "curriculum",
  "classrooms",
  "classroom_workspace",
  "attendance",
  "schedules",
  "calendar",
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
  "parent_portal",
  "communications",
  "documents",
  "notifications",
  "pta",
  "maintenance",
  "security",
  "procurement",
  "inventory",
  "library",
  "clinic",
  "counseling",
  "athletics",
  "hostel",
  "cafeteria",
  "transport",
];

export const FALLBACK_PUBLIC_PLANS: PublicPlanCard[] = [
  {
    code: "FREE",
    label: "Free",
    description: "Small pilot schools",
    maxStudents: 50,
    maxStaff: 10,
    maxStorageMb: 512,
    features: FREE,
    monthlyPriceUsd: 0,
    sortOrder: 0,
  },
  {
    code: "TRIAL",
    label: "Trial",
    description: "Time-boxed evaluation",
    maxStudents: 200,
    maxStaff: 40,
    maxStorageMb: 2048,
    features: TRIAL,
    monthlyPriceUsd: 0,
    trialDays: 30,
    sortOrder: 1,
  },
  {
    code: "STANDARD",
    label: "Standard",
    description: "Full school operations",
    maxStudents: 800,
    maxStaff: 120,
    maxStorageMb: 10240,
    features: STANDARD,
    monthlyPriceUsd: 99,
    sortOrder: 2,
  },
  {
    code: "PREMIUM",
    label: "Premium",
    description: "Larger campuses + specialists + API",
    maxStudents: 2500,
    maxStaff: 400,
    maxStorageMb: 51200,
    features: PREMIUM,
    monthlyPriceUsd: 249,
    sortOrder: 3,
  },
  {
    code: "ENTERPRISE",
    label: "Enterprise",
    description: "Unlimited seats + custom domain + full catalog",
    maxStudents: null,
    maxStaff: null,
    maxStorageMb: null,
    features: ENTERPRISE,
    monthlyPriceUsd: 599,
    sortOrder: 4,
  },
];

/** Plan code highlighted as “most popular” on the marketing page. */
export const FEATURED_PLAN_CODE = "STANDARD";

/** How many module labels to show before “+N more”. */
export const PRICING_FEATURE_PREVIEW = 6;
