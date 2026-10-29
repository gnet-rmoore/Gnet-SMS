export type SearchPageMeta = {
  title?: string;
  keywords: string[];
};

/**
 * Extra searchable metadata for app pages. Nav labels alone miss page titles,
 * tab names, and the labels people actually see once they open a page.
 * Keyed by final path segment, with full keys for ambiguous Super Admin routes.
 */
export const GLOBAL_SEARCH_PAGE_META: Record<string, SearchPageMeta> = {
  dashboard: {
    title: "Dashboard",
    keywords: ["overview", "home", "quick actions", "announcements", "schedule"],
  },
  onboarding: {
    title: "Setup checklist",
    keywords: ["onboarding", "getting started", "checklist", "setup"],
  },
  calendar: {
    title: "School calendar",
    keywords: ["events", "holidays", "exams", "calendar"],
  },
  "academic-calendar": {
    title: "Academic calendar",
    keywords: ["terms", "semesters", "holidays", "school year", "academic year"],
  },
  reports: {
    title: "Reports",
    keywords: ["analytics", "insights", "statistics", "exports"],
  },
  classrooms: {
    title: "Classrooms",
    keywords: ["classes", "sections", "homerooms", "grade levels"],
  },
  classroom: {
    title: "My classes",
    keywords: ["classroom feed", "assignments", "posts", "class"],
  },
  schedules: {
    title: "Class schedules",
    keywords: ["timetable", "periods", "rooms", "teachers", "subjects"],
  },
  "my-schedule": {
    title: "My schedule",
    keywords: ["timetable", "classes", "teacher schedule", "student schedule"],
  },
  curriculum: {
    title: "Curriculum",
    keywords: ["subjects", "units", "lessons", "syllabus", "standards"],
  },
  "lesson-plans": {
    title: "Lesson plans",
    keywords: ["planning", "approvals", "teachers", "review"],
  },
  exams: {
    title: "Exams",
    keywords: ["assessments", "grades", "results", "exam schedule"],
  },
  "online-exams": {
    title: "Online exams",
    keywords: ["digital exams", "attempts", "proctoring", "results"],
  },
  "question-bank": {
    title: "Question bank",
    keywords: ["questions", "items", "tags", "difficulty"],
  },
  gradebook: {
    title: "Gradebook",
    keywords: ["grades", "marks", "assessments", "columns", "periods"],
  },
  "grade-review": {
    title: "Grade review",
    keywords: ["approval", "return to teacher", "grade sheets", "submissions"],
  },
  "grade-access": {
    title: "Grade edit access",
    keywords: ["permissions", "grants", "deadline", "corrections"],
  },
  "exam-paper-review": {
    title: "Exam paper review",
    keywords: ["approval", "papers", "packages"],
  },
  attendance: {
    title: "Attendance",
    keywords: ["absence", "present", "late", "daily register", "homeroom"],
  },
  grades: {
    title: "Student grades",
    keywords: [
      "grades",
      "marks",
      "results",
      "exams",
      "report card",
      "performance",
      "academic performance",
    ],
  },
  certificates: {
    title: "Certificates",
    keywords: ["templates", "awards", "diplomas", "generation"],
  },
  students: {
    title: "Students",
    keywords: [
      "directory",
      "admissions",
      "profiles",
      "guardians",
      "parents",
      "student records",
      "assign to class",
    ],
  },
  transcripts: {
    title: "Transcripts",
    keywords: ["academic record", "grades", "requests", "approval"],
  },
  staff: {
    title: "Staff directory",
    keywords: [
      "teachers",
      "employees",
      "staff management",
      "add staff",
      "roles",
      "assignments",
      "photo",
    ],
  },
  roles: {
    title: "Roles & access",
    keywords: [
      "permissions",
      "capabilities",
      "customize staff roles",
      "role catalog",
      "access control",
    ],
  },
  admissions: {
    title: "Admissions",
    keywords: ["applications", "registrar", "enrollment", "approve admissions"],
  },
  enrollment: {
    title: "Enrollment",
    keywords: ["register students", "class assignment", "placements"],
  },
  "staff-portal": {
    title: "Staff portal",
    keywords: ["my profile", "payslips", "leave", "tasks", "documents"],
  },
  "leave-approval": {
    title: "Leave approvals",
    keywords: ["staff leave", "time off", "requests", "approve"],
  },
  "staff-tasks": {
    title: "Staff tasks",
    keywords: ["assignments", "todo", "delegation"],
  },
  "year-transition": {
    title: "Year transition",
    keywords: ["promotion", "rollover", "next academic year"],
  },
  "promotion-statement": {
    title: "Promotion statement",
    keywords: ["promotion", "student progression", "report"],
  },
  fees: {
    title: "Fees",
    keywords: [
      "finance",
      "invoices",
      "payments",
      "ledger",
      "receipts",
      "templates",
      "batch",
      "billing",
      "overview",
      "history",
    ],
  },
  expenses: {
    title: "Expenses",
    keywords: ["spending", "finance", "vendors", "records"],
  },
  payroll: {
    title: "Payroll",
    keywords: ["salaries", "staff pay", "payslips", "finance"],
  },
  "work-orders": {
    title: "Work orders",
    keywords: ["maintenance requests", "facilities", "repairs", "tickets"],
  },
  maintenance: {
    title: "Facilities hub",
    keywords: ["maintenance", "inventory", "work orders", "repairs", "facilities"],
  },
  announcements: {
    title: "Announcements",
    keywords: ["notices", "broadcast", "communication", "audience"],
  },
  documents: {
    title: "Documents",
    keywords: ["files", "sharing", "storage", "attachments"],
  },
  pta: {
    title: "PTA",
    keywords: ["parents", "parent teacher association", "meetings", "communication"],
  },
  settings: {
    title: "Settings",
    keywords: [
      "general",
      "appearance",
      "grading",
      "security",
      "api keys",
      "notifications",
      "plan",
      "school profile",
      "language",
      "receipt templates",
    ],
  },
  notifications: {
    title: "Notifications",
    keywords: ["alerts", "inbox", "updates"],
  },
  library: {
    title: "Library",
    keywords: ["catalog", "books", "loans", "check out", "fines"],
  },
  clinic: {
    title: "Clinic",
    keywords: ["health", "visits", "medical", "nurse", "student health"],
  },
  counseling: {
    title: "Counseling",
    keywords: ["sessions", "wellbeing", "student support", "counselor"],
  },
  athletics: {
    title: "Athletics",
    keywords: ["teams", "rosters", "fixtures", "sports", "events"],
  },
  hostel: {
    title: "Hostel",
    keywords: ["boarding", "buildings", "rooms", "beds", "warden"],
  },
  cafeteria: {
    title: "Cafeteria",
    keywords: ["menus", "meals", "meal counts", "food service"],
  },
  "bus-routes": {
    title: "Bus routes",
    keywords: ["transport", "stops", "riders", "vehicles", "drivers"],
  },
  drivers: {
    title: "Drivers",
    keywords: ["transport", "fleet", "assign driver", "vehicles"],
  },
  "vehicle-maintenance": {
    title: "Vehicle maintenance",
    keywords: ["fleet", "service history", "transport", "vehicles"],
  },
  inventory: {
    title: "Inventory",
    keywords: ["stock", "items", "supplies", "procurement"],
  },
  procurement: {
    title: "Procurement & inventory",
    keywords: ["purchase orders", "suppliers", "requisitions", "stock"],
  },
  security: {
    title: "Security",
    keywords: ["visitors", "incidents", "gate", "campus safety"],
  },
  "my-campus": {
    title: "My campus services",
    keywords: ["transport", "library", "clinic", "hostel", "student services"],
  },
  children: {
    title: "My children",
    keywords: ["parent", "students", "children", "grades", "attendance"],
  },
  "my-applications": {
    title: "My applications",
    keywords: ["admissions", "application status", "parent"],
  },
  profile: {
    title: "My profile",
    keywords: ["account", "personal information", "password", "photo"],
  },
  guide: {
    title: "Platform guide",
    keywords: ["help", "walkthrough", "tutorial"],
  },
  help: {
    title: "Help & guide",
    keywords: ["support", "documentation", "faq", "glossary"],
  },
  "super-admin": {
    title: "Super Admin dashboard",
    keywords: ["overview", "platform metrics", "mrr", "schools", "registrations"],
  },
  schools: {
    title: "Schools",
    keywords: [
      "all schools",
      "directory",
      "suspend",
      "activate",
      "delete",
      "impersonate",
      "view directory",
    ],
  },
  registrations: {
    title: "School registrations",
    keywords: ["applications", "approve", "review", "onboarding", "pending"],
  },
  users: {
    title: "Users",
    keywords: [
      "platform users",
      "accounts",
      "reset password",
      "disable",
      "impersonate",
      "directory",
    ],
  },
  plans: {
    title: "Plans & entitlements",
    keywords: ["pricing", "catalog", "mrr", "features", "quotas", "subscriptions", "billing"],
  },
  operators: {
    title: "Operators & dual-control",
    keywords: [
      "platform operators",
      "super admins",
      "add operator",
      "owner",
      "support",
      "billing",
      "analyst",
      "reset password",
      "deactivate",
      "pending school deletes",
      "dual control",
      "delete requests",
    ],
  },
  logs: {
    title: "System logs",
    keywords: ["audit", "activity", "events", "security"],
  },
  "super-admin/settings": {
    title: "Platform settings",
    keywords: ["configuration", "global settings", "security", "email", "billing"],
  },
  "super-admin/reports": {
    title: "Global reports",
    keywords: ["analytics", "usage", "mrr", "exports", "insights"],
  },
  "super-admin/help": {
    title: "Super Admin help",
    keywords: ["guide", "glossary", "documentation", "support"],
  },
};

export function pageMetaForPath(path: string): SearchPageMeta | undefined {
  const cleanPath = path.split(/[?#]/)[0];
  const parts = cleanPath.split("/").filter(Boolean);
  if (parts[0] === "super-admin") {
    const superAdminKey = parts.join("/");
    return (
      GLOBAL_SEARCH_PAGE_META[superAdminKey] ??
      GLOBAL_SEARCH_PAGE_META[parts[parts.length - 1]]
    );
  }
  const segment = parts.pop();
  return segment ? GLOBAL_SEARCH_PAGE_META[segment] : undefined;
}
