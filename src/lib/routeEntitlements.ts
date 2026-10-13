/**
 * Maps school SPA route segments to SaaS plan entitlement keys.
 * Keep aligned with `services/identity/src/domain/platformPlans.ts`.
 */

/** Routes always available when `core` is entitled (all plans include core). */
export const CORE_ROUTE_SEGMENTS = new Set([
  "dashboard",
  "profile",
  "guide",
  "onboarding",
  "settings",
  "notifications",
]);

/** First path segment(s) under /:slug/ → entitlement key. Longer keys checked first in code. */
export const ROUTE_ENTITLEMENTS: Record<string, string> = {
  // Admissions
  admissions: "admissions",
  enrollment: "enrollment",
  "year-transition": "enrollment",
  "promotion-statement": "enrollment",
  transcripts: "transcripts",
  // Academics
  calendar: "calendar",
  curriculum: "curriculum",
  "lesson-plans": "lesson_plans",
  schedules: "schedules",
  "my-schedule": "schedules",
  classrooms: "classrooms",
  classroom: "classroom_workspace",
  attendance: "attendance",
  // Assessment
  exams: "exams",
  "online-exams": "online_exams",
  gradebook: "gradebook",
  "grade-review": "grade_review",
  "grade-access": "grade_review",
  "exam-paper-review": "exam_paper",
  grades: "report_cards",
  gradesheet: "report_cards",
  "report-card": "report_cards",
  certificates: "transcripts",
  // People
  students: "core",
  staff: "staff",
  roles: "roles_access",
  "staff-portal": "staff",
  "staff-tasks": "staff",
  "leave-approval": "leave",
  children: "parent_portal",
  // Finance
  fees: "finance",
  expenses: "expenses",
  payroll: "payroll",
  // Comms
  announcements: "communications",
  documents: "documents",
  pta: "pta",
  // Ops
  "work-orders": "maintenance",
  maintenance: "maintenance",
  security: "security",
  procurement: "procurement",
  inventory: "inventory",
  "bus-routes": "transport",
  drivers: "transport",
  "vehicle-maintenance": "transport",
  // Campus
  library: "library",
  clinic: "clinic",
  counseling: "counseling",
  athletics: "athletics",
  hostel: "hostel",
  cafeteria: "cafeteria",
  // Insights
  reports: "reports",
};

export function routeSegmentFromPath(pathname: string, slug: string | undefined): string | null {
  if (!slug) return null;
  const prefix = `/${slug}/`;
  if (!pathname.startsWith(prefix) && pathname !== `/${slug}`) return null;
  const rest = pathname.slice(pathname.startsWith(prefix) ? prefix.length : 1).split("/").filter(Boolean);
  if (rest.length === 0) return "dashboard";
  if (rest[0] === "settings") return "settings";
  if (rest.length >= 2 && rest[0] === "settings") return "settings";
  return rest[0];
}

export function entitlementForRouteSegment(segment: string | null): string | null {
  if (!segment) return null;
  if (CORE_ROUTE_SEGMENTS.has(segment)) return "core";
  if (segment.startsWith("settings")) return "core";
  return ROUTE_ENTITLEMENTS[segment] ?? null;
}

export function entitlementForPath(pathname: string, slug: string | undefined): string | null {
  return entitlementForRouteSegment(routeSegmentFromPath(pathname, slug));
}
