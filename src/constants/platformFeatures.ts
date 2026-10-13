/**
 * SaaS plan entitlement modules (mirrors Identity `PLATFORM_FEATURE_CATALOG`).
 * Keep in sync with `services/identity/src/domain/platformPlans.ts`.
 */

export const PLATFORM_FEATURE_CATALOG = [
  { key: "core", label: "Core portal & settings", group: "Platform" },
  { key: "roles_access", label: "Roles & access", group: "Platform" },
  { key: "reports", label: "School reports", group: "Platform" },
  { key: "api_access", label: "API access", group: "Platform" },
  { key: "custom_domain", label: "Custom domain", group: "Platform" },
  { key: "admissions", label: "Admissions & public apply", group: "Admissions" },
  { key: "enrollment", label: "Enrollment & placement", group: "Admissions" },
  { key: "bulk_import", label: "Bulk roster import", group: "Admissions" },
  { key: "transcripts", label: "Transcripts & student records", group: "Admissions" },
  { key: "curriculum", label: "Curriculum & subjects", group: "Academics" },
  { key: "classrooms", label: "Classrooms & class groups", group: "Academics" },
  { key: "classroom_workspace", label: "Classroom workspace", group: "Academics" },
  { key: "attendance", label: "Attendance & roll call", group: "Academics" },
  { key: "schedules", label: "Schedules & timetables", group: "Academics" },
  { key: "calendar", label: "Academic & school calendar", group: "Academics" },
  { key: "lesson_plans", label: "Lesson plans & syllabi", group: "Academics" },
  { key: "gradebook", label: "Gradebook", group: "Assessment" },
  { key: "grade_review", label: "Grade review", group: "Assessment" },
  { key: "exams", label: "Exams catalog", group: "Assessment" },
  { key: "exam_paper", label: "Exam paper approval", group: "Assessment" },
  { key: "online_exams", label: "Online exams", group: "Assessment" },
  { key: "report_cards", label: "Report cards", group: "Assessment" },
  { key: "finance", label: "Fees & payments", group: "Finance" },
  { key: "expenses", label: "Expenses", group: "Finance" },
  { key: "payroll", label: "Payroll & payslips", group: "Finance" },
  { key: "receipts", label: "Receipts & public verify", group: "Finance" },
  { key: "staff", label: "Staff directory & invites", group: "People" },
  { key: "leave", label: "Leave requests & approval", group: "People" },
  { key: "parent_portal", label: "Parent & student portals", group: "People" },
  { key: "communications", label: "Announcements", group: "Communications" },
  { key: "documents", label: "Documents library", group: "Communications" },
  { key: "notifications", label: "In-app notifications", group: "Communications" },
  { key: "pta", label: "PTA", group: "Communications" },
  { key: "maintenance", label: "Maintenance & work orders", group: "Operations" },
  { key: "security", label: "Security incidents", group: "Operations" },
  { key: "procurement", label: "Procurement", group: "Operations" },
  { key: "inventory", label: "Inventory", group: "Operations" },
  { key: "library", label: "Library", group: "Campus specialists" },
  { key: "clinic", label: "Clinic", group: "Campus specialists" },
  { key: "counseling", label: "Counseling", group: "Campus specialists" },
  { key: "athletics", label: "Athletics", group: "Campus specialists" },
  { key: "hostel", label: "Hostel", group: "Campus specialists" },
  { key: "cafeteria", label: "Cafeteria", group: "Campus specialists" },
  { key: "transport", label: "Transport", group: "Campus specialists" },
] as const;

export const PLATFORM_FEATURE_KEYS = PLATFORM_FEATURE_CATALOG.map((f) => f.key);

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

export function featureLabel(key: string): string {
  return PLATFORM_FEATURE_CATALOG.find((f) => f.key === key)?.label || key.replace(/_/g, " ");
}

export function featuresByGroup() {
  return PLATFORM_FEATURE_GROUPS.map((group) => ({
    group,
    items: PLATFORM_FEATURE_CATALOG.filter((f) => f.group === group).map((f) => ({
      key: f.key,
      label: f.label,
    })),
  })).filter((g) => g.items.length > 0);
}
