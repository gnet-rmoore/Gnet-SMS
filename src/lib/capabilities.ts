/** Auto-derived catalog + role defaults for school capability matrix. Keep Identity + SPA copies in sync. */
export type CapabilityDef = {
  key: string;
  label: string;
  category: string;
  lockedForSchoolAdmin?: boolean;
};

export const CAPABILITY_CATALOG: CapabilityDef[] = [
  {
    "key": "action.admissions.manage",
    "label": "Manage / approve admissions",
    "category": "Actions \u00b7 Admissions",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "action.bulk_import.roster",
    "label": "Bulk import students or staff",
    "category": "Actions \u00b7 Directory",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "action.exam_paper.approve",
    "label": "Approve exam paper packages",
    "category": "Actions \u00b7 Academics",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "action.fees.manage",
    "label": "Manage fees, invoices, and payments",
    "category": "Actions \u00b7 Finance",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "action.grade_review.decide",
    "label": "Accept or return submitted grade sheets",
    "category": "Actions \u00b7 Academics",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "action.leave.approve",
    "label": "Approve staff leave requests",
    "category": "Actions \u00b7 Staff",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "action.lesson_plans.approve",
    "label": "Approve or return lesson plans",
    "category": "Actions \u00b7 Academics",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "action.payroll.run",
    "label": "Run and finalize payroll",
    "category": "Actions \u00b7 Finance",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "action.roles.assign",
    "label": "Assign user roles",
    "category": "Actions \u00b7 Admin",
    "lockedForSchoolAdmin": true
  },
  {
    "key": "action.roles.customize",
    "label": "Customize role capabilities",
    "category": "Actions \u00b7 Admin",
    "lockedForSchoolAdmin": true
  },
  {
    "key": "action.schedules.manage",
    "label": "Create and edit class schedules",
    "category": "Actions \u00b7 Academics",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "action.settings.templates",
    "label": "Manage report card / document templates",
    "category": "Actions \u00b7 Settings",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.admissions",
    "label": "Admissions",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.api-docs",
    "label": "API documentation",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.announcements",
    "label": "Announcements",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.athletics",
    "label": "Athletics",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.attendance",
    "label": "Attendance",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.bus-routes",
    "label": "Bus Routes",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.cafeteria",
    "label": "Cafeteria",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.calendar",
    "label": "Calendar",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.children",
    "label": "My Children",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.classroom",
    "label": "My Classes",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.classrooms",
    "label": "Classrooms",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.clinic",
    "label": "Clinic",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.counseling",
    "label": "Counseling",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.curriculum",
    "label": "Curriculum",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.dashboard",
    "label": "Dashboard",
    "category": "Navigation",
    "lockedForSchoolAdmin": true
  },
  {
    "key": "nav.documents",
    "label": "Documents",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.drivers",
    "label": "Drivers",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.enrollment",
    "label": "Enrollment",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.promotion-statement",
    "label": "Promotion Statement",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.year-transition",
    "label": "Year Transition",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.exam-paper-review",
    "label": "Exam paper review",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.exams",
    "label": "Exams",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.expenses",
    "label": "Expenses",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.fees",
    "label": "Fees",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.grade-review",
    "label": "Grade Review",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.gradebook",
    "label": "Gradebook",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.grades",
    "label": "Grades",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.hostel",
    "label": "Hostel",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.inventory",
    "label": "Inventory",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.leave-approval",
    "label": "Leave Approvals",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.lesson-plans",
    "label": "Lesson Plans",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.library",
    "label": "Library",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.maintenance",
    "label": "Facilities Hub",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.my-schedule",
    "label": "My Schedule",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.notifications",
    "label": "Notifications",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.onboarding",
    "label": "Setup",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.online-exams",
    "label": "Online exams",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.payroll",
    "label": "Payroll",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.procurement",
    "label": "Procurement",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.pta",
    "label": "PTA",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.reports",
    "label": "Reports",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.roles",
    "label": "Roles & Access",
    "category": "Navigation",
    "lockedForSchoolAdmin": true
  },
  {
    "key": "nav.schedules",
    "label": "Class Schedules",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.security",
    "label": "Security",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.settings",
    "label": "Settings",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.settings/academic-calendar",
    "label": "Academic Calendar",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.staff",
    "label": "Staff",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.staff-portal",
    "label": "Staff Portal",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.student-records",
    "label": "Student Records",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.students",
    "label": "Students",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.transcripts",
    "label": "Transcripts",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.vehicle-maintenance",
    "label": "Vehicle Maintenance",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  },
  {
    "key": "nav.work-orders",
    "label": "Work Orders",
    "category": "Navigation",
    "lockedForSchoolAdmin": false
  }
];

export const DEFAULT_ROLE_CAPABILITIES: Record<string, string[]> = {
  "SCHOOL_ADMIN": [
    "action.admissions.manage",
    "action.bulk_import.roster",
    "action.exam_paper.approve",
    "action.fees.manage",
    "action.grade_review.decide",
    "action.leave.approve",
    "action.lesson_plans.approve",
    "action.payroll.run",
    "action.roles.assign",
    "action.roles.customize",
    "action.schedules.manage",
    "action.settings.templates",
    "nav.admissions",
    "nav.api-docs",
    "nav.announcements",
    "nav.athletics",
    "nav.attendance",
    "nav.bus-routes",
    "nav.cafeteria",
    "nav.calendar",
    "nav.classroom",
    "nav.classrooms",
    "nav.clinic",
    "nav.counseling",
    "nav.curriculum",
    "nav.dashboard",
    "nav.documents",
    "nav.drivers",
    "nav.enrollment",
    "nav.exam-paper-review",
    "nav.exams",
    "nav.expenses",
    "nav.fees",
    "nav.grade-review",
    "nav.gradebook",
    "nav.grades",
    "nav.hostel",
    "nav.inventory",
    "nav.leave-approval",
    "nav.lesson-plans",
    "nav.library",
    "nav.maintenance",
    "nav.my-schedule",
    "nav.notifications",
    "nav.onboarding",
    "nav.online-exams",
    "nav.payroll",
    "nav.procurement",
    "nav.promotion-statement",
    "nav.pta",
    "nav.reports",
    "nav.roles",
    "nav.schedules",
    "nav.security",
    "nav.settings",
    "nav.settings/academic-calendar",
    "nav.staff",
    "nav.staff-portal",
    "nav.student-records",
    "nav.students",
    "nav.transcripts",
    "nav.vehicle-maintenance",
    "nav.work-orders",
    "nav.year-transition"
  ],
  "PRINCIPAL": [
    "action.admissions.manage",
    "action.bulk_import.roster",
    "action.exam_paper.approve",
    "action.grade_review.decide",
    "action.leave.approve",
    "action.lesson_plans.approve",
    "action.schedules.manage",
    "action.settings.templates",
    "nav.admissions",
    "nav.api-docs",
    "nav.announcements",
    "nav.athletics",
    "nav.attendance",
    "nav.bus-routes",
    "nav.cafeteria",
    "nav.calendar",
    "nav.classroom",
    "nav.classrooms",
    "nav.clinic",
    "nav.counseling",
    "nav.curriculum",
    "nav.dashboard",
    "nav.documents",
    "nav.drivers",
    "nav.exam-paper-review",
    "nav.exams",
    "nav.grade-review",
    "nav.gradebook",
    "nav.grades",
    "nav.hostel",
    "nav.inventory",
    "nav.leave-approval",
    "nav.lesson-plans",
    "nav.library",
    "nav.maintenance",
    "nav.my-schedule",
    "nav.notifications",
    "nav.online-exams",
    "nav.procurement",
    "nav.pta",
    "nav.reports",
    "nav.schedules",
    "nav.security",
    "nav.settings",
    "nav.settings/academic-calendar",
    "nav.staff",
    "nav.staff-portal",
    "nav.student-records",
    "nav.students",
    "nav.transcripts",
    "nav.vehicle-maintenance",
    "nav.work-orders",
    "nav.year-transition",
    "nav.promotion-statement"
  ],
  "REGISTRAR": [
    "action.admissions.manage",
    "action.bulk_import.roster",
    "action.settings.templates",
    "nav.admissions",
    "nav.calendar",
    "nav.dashboard",
    "nav.enrollment",
    "nav.notifications",
    "nav.promotion-statement",
    "nav.schedules",
    "nav.settings",
    "nav.staff-portal",
    "nav.student-records",
    "nav.students",
    "nav.transcripts",
    "nav.year-transition"
  ],
  "VPI": [
    "action.exam_paper.approve",
    "action.grade_review.decide",
    "action.lesson_plans.approve",
    "action.schedules.manage",
    "nav.attendance",
    "nav.calendar",
    "nav.classroom",
    "nav.classrooms",
    "nav.curriculum",
    "nav.dashboard",
    "nav.exam-paper-review",
    "nav.exams",
    "nav.grade-review",
    "nav.gradebook",
    "nav.grades",
    "nav.lesson-plans",
    "nav.my-schedule",
    "nav.notifications",
    "nav.online-exams",
    "nav.reports",
    "nav.schedules",
    "nav.staff-portal",
    "nav.year-transition",
    "nav.promotion-statement"
  ],
  "VPA": [
    "action.bulk_import.roster",
    "action.leave.approve",
    "nav.attendance",
    "nav.bus-routes",
    "nav.calendar",
    "nav.dashboard",
    "nav.drivers",
    "nav.inventory",
    "nav.leave-approval",
    "nav.maintenance",
    "nav.my-schedule",
    "nav.notifications",
    "nav.procurement",
    "nav.security",
    "nav.staff",
    "nav.staff-portal",
    "nav.vehicle-maintenance",
    "nav.work-orders",
    "nav.year-transition",
    "nav.promotion-statement"
  ],
  "TEACHER": [
    "nav.attendance",
    "nav.calendar",
    "nav.classroom",
    "nav.curriculum",
    "nav.dashboard",
    "nav.exams",
    "nav.grade-review",
    "nav.gradebook",
    "nav.lesson-plans",
    "nav.my-schedule",
    "nav.notifications",
    "nav.online-exams",
    "nav.staff-portal",
    "nav.students"
  ],
  "STUDENT": [
    "nav.attendance",
    "nav.calendar",
    "nav.classroom",
    "nav.dashboard",
    "nav.exams",
    "nav.fees",
    "nav.grades",
    "nav.my-schedule",
    "nav.notifications",
    "nav.online-exams"
  ],
  "PARENT": [
    "nav.announcements",
    "nav.attendance",
    "nav.calendar",
    "nav.children",
    "nav.classroom",
    "nav.dashboard",
    "nav.documents",
    "nav.fees",
    "nav.grades",
    "nav.my-schedule",
    "nav.notifications",
    "nav.online-exams",
    "nav.pta"
  ],
  "ACCOUNTANT": [
    "action.fees.manage",
    "action.payroll.run",
    "action.settings.templates",
    "nav.calendar",
    "nav.dashboard",
    "nav.expenses",
    "nav.fees",
    "nav.notifications",
    "nav.payroll",
    "nav.settings",
    "nav.staff-portal"
  ],
  "TRANSPORTATION": [
    "nav.bus-routes",
    "nav.calendar",
    "nav.dashboard",
    "nav.drivers",
    "nav.notifications",
    "nav.staff-portal",
    "nav.vehicle-maintenance"
  ],
  "MAINTENANCE": [
    "nav.calendar",
    "nav.dashboard",
    "nav.maintenance",
    "nav.notifications",
    "nav.staff-portal",
    "nav.work-orders"
  ],
  "LIBRARIAN": [
    "nav.calendar",
    "nav.dashboard",
    "nav.inventory",
    "nav.library",
    "nav.notifications",
    "nav.staff-portal"
  ],
  "NURSE": [
    "nav.calendar",
    "nav.clinic",
    "nav.dashboard",
    "nav.inventory",
    "nav.notifications",
    "nav.staff-portal"
  ],
  "COUNSELOR": [
    "nav.calendar",
    "nav.counseling",
    "nav.dashboard",
    "nav.my-schedule",
    "nav.notifications",
    "nav.staff-portal",
    "nav.students"
  ],
  "SECURITY": [
    "nav.calendar",
    "nav.dashboard",
    "nav.notifications",
    "nav.security",
    "nav.staff",
    "nav.staff-portal"
  ],
  "IT_ADMIN": [
    "action.settings.templates",
    "nav.api-docs",
    "nav.calendar",
    "nav.dashboard",
    "nav.my-schedule",
    "nav.notifications",
    "nav.onboarding",
    "nav.reports",
    "nav.roles",
    "nav.settings",
    "nav.staff",
    "nav.staff-portal"
  ],
  "PROCUREMENT": [
    "nav.calendar",
    "nav.dashboard",
    "nav.inventory",
    "nav.notifications",
    "nav.procurement",
    "nav.staff-portal"
  ],
  "ATHLETICS_DIRECTOR": [
    "nav.athletics",
    "nav.calendar",
    "nav.dashboard",
    "nav.notifications",
    "nav.staff",
    "nav.staff-portal"
  ],
  "HOSTEL_WARDEN": [
    "nav.attendance",
    "nav.calendar",
    "nav.dashboard",
    "nav.hostel",
    "nav.notifications",
    "nav.staff-portal"
  ],
  "CAFETERIA_MANAGER": [
    "nav.cafeteria",
    "nav.calendar",
    "nav.dashboard",
    "nav.inventory",
    "nav.notifications",
    "nav.staff-portal"
  ]
};

export const LOCKED_KEYS_FOR_SCHOOL_ADMIN: readonly string[] = [
  "action.roles.assign",
  "action.roles.customize",
  "nav.roles",
  "nav.dashboard"
];

export function defaultCapabilitiesForRole(role: string): string[] {
  if (role === "SUPER_ADMIN") return CAPABILITY_CATALOG.map((c) => c.key);
  return [...(DEFAULT_ROLE_CAPABILITIES[role] || [])];
}

export function mergeCapabilities(
  role: string,
  overrides: Array<{ capabilityKey: string; allowed: boolean }>
): string[] {
  const set = new Set(defaultCapabilitiesForRole(role));
  for (const row of overrides) {
    if (!isKnownCapability(row.capabilityKey)) continue;
    if (row.allowed) set.add(row.capabilityKey);
    else set.delete(row.capabilityKey);
  }
  if (role === "SCHOOL_ADMIN") {
    for (const k of LOCKED_KEYS_FOR_SCHOOL_ADMIN) set.add(k);
  }
  return [...set].sort();
}

export function hasCapability(capabilities: string[] | undefined | null, key: string): boolean {
  return Array.isArray(capabilities) && capabilities.includes(key);
}

export function isKnownCapability(key: string): boolean {
  return CAPABILITY_CATALOG.some((c) => c.key === key);
}

/** Map a school route path (relative to /:slug/) to a nav.* capability key. */
export function navCapabilityKey(routeKey: string): string {
  const cleaned = routeKey.replace(/^\/+|\/+$/g, "");
  if (!cleaned) return "nav.dashboard";
  return `nav.${cleaned}`;
}
