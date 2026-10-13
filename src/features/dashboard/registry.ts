import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookMarked,
  BookOpen,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  HeartPulse,
  Home,
  Layers,
  Library,
  MonitorPlay,
  PieChart,
  Settings,
  ShieldCheck,
  Trophy,
  Truck,
  UserCheck,
  UserCog,
  Users,
  Utensils,
  Wallet,
  Wrench,
  CalendarClock,
  Calendar,
  MessageSquare,
  Terminal,
} from "lucide-react";
import { SCHOOL_ROLES, type Role } from "../../constants/roles";

/** Dashboard body composition for a school role. */
export type DashboardBodyKind =
  | "parent"
  | "accountant"
  | "teacher"
  | "student"
  | "leadership"
  | "specialty"
  | "minimal";

export type QuickActionDef = {
  /** i18n key under pages:dashboard.actions.* */
  labelKey: string;
  /** Path segment under /:slug/ */
  path: string;
  icon?: LucideIcon;
};

export type HubCardDef = {
  /** i18n key under pages:dashboard.hubs.* or nav items */
  labelKey: string;
  path: string;
  icon: LucideIcon;
  /** Optional hint under pages:dashboard.hubs.* */
  hintKey?: string;
};

export type RoleDashboardDef = {
  role: Role;
  titleKey: string;
  subtitleKey: string;
  quickActions: QuickActionDef[];
  body: DashboardBodyKind;
  /** Specialty / IT hub cards (specialty + some leadership). */
  hubs?: HubCardDef[];
  /** Leadership KPI preset. */
  leadershipKpis?: "school" | "registrar" | "academic" | "ops" | "admin";
};

const schoolRoles = SCHOOL_ROLES as readonly Role[];

function def(partial: RoleDashboardDef): RoleDashboardDef {
  return partial;
}

/** Per-role home dashboard — every school role must appear here. */
export const ROLE_DASHBOARD_REGISTRY: Record<string, RoleDashboardDef> = {
  SCHOOL_ADMIN: def({
    role: "SCHOOL_ADMIN",
    titleKey: "dashboard.titles.admin",
    subtitleKey: "dashboard.subtitles.admin",
    leadershipKpis: "admin",
    quickActions: [
      { labelKey: "dashboard.actions.setup", path: "onboarding", icon: ClipboardCheck },
      { labelKey: "dashboard.actions.classroomsStream", path: "classrooms", icon: Layers },
      { labelKey: "dashboard.actions.collectFee", path: "fees", icon: CreditCard },
      { labelKey: "dashboard.actions.personnelHub", path: "staff", icon: UserCog },
      { labelKey: "dashboard.actions.dailyReport", path: "reports", icon: PieChart },
      { labelKey: "dashboard.actions.systemSettings", path: "settings", icon: Settings },
      { labelKey: "dashboard.actions.apiDocs", path: "api-docs", icon: Terminal },
    ],
    body: "leadership",
  }),
  PRINCIPAL: def({
    role: "PRINCIPAL",
    titleKey: "dashboard.titles.principal",
    subtitleKey: "dashboard.subtitles.principal",
    leadershipKpis: "school",
    quickActions: [
      { labelKey: "dashboard.actions.gradeReview", path: "grade-review", icon: ClipboardCheck },
      { labelKey: "dashboard.actions.curriculum", path: "curriculum", icon: BookMarked },
      { labelKey: "dashboard.actions.newAdmission", path: "admissions", icon: Users },
      { labelKey: "dashboard.actions.dailyReport", path: "reports", icon: PieChart },
      { labelKey: "dashboard.actions.leave", path: "leave-approval", icon: ClipboardList },
    ],
    body: "leadership",
  }),
  VPI: def({
    role: "VPI",
    titleKey: "dashboard.titles.vpi",
    subtitleKey: "dashboard.subtitles.vpi",
    leadershipKpis: "academic",
    quickActions: [
      { labelKey: "dashboard.actions.curriculumMap", path: "curriculum", icon: BookMarked },
      { labelKey: "dashboard.actions.classroomsStream", path: "classrooms", icon: Layers },
      { labelKey: "dashboard.actions.examsAssessments", path: "exams", icon: ClipboardList },
      { labelKey: "dashboard.actions.gradeReview", path: "grade-review", icon: ClipboardCheck },
      { labelKey: "dashboard.actions.lessonPlans", path: "lesson-plans", icon: BookOpen },
    ],
    body: "leadership",
  }),
  VPA: def({
    role: "VPA",
    titleKey: "dashboard.titles.vpa",
    subtitleKey: "dashboard.subtitles.vpa",
    leadershipKpis: "ops",
    quickActions: [
      { labelKey: "dashboard.actions.personnelHub", path: "staff", icon: UserCog },
      { labelKey: "dashboard.actions.leave", path: "leave-approval", icon: ClipboardList },
      { labelKey: "dashboard.actions.facilitiesMaintenance", path: "maintenance", icon: Wrench },
      { labelKey: "dashboard.actions.supplyProcurement", path: "procurement", icon: Briefcase },
      { labelKey: "dashboard.actions.accessSecurity", path: "security", icon: ShieldCheck },
    ],
    body: "leadership",
  }),
  REGISTRAR: def({
    role: "REGISTRAR",
    titleKey: "dashboard.titles.registrar",
    subtitleKey: "dashboard.subtitles.registrar",
    leadershipKpis: "registrar",
    quickActions: [
      { labelKey: "dashboard.actions.newAdmission", path: "admissions", icon: Users },
      { labelKey: "dashboard.actions.enrollStudent", path: "students", icon: UserCheck },
      { labelKey: "dashboard.actions.issueTranscript", path: "transcripts", icon: FileText },
      { labelKey: "dashboard.actions.certificates", path: "certificates", icon: Award },
      { labelKey: "dashboard.actions.enrollment", path: "enrollment", icon: Layers },
    ],
    body: "leadership",
  }),
  TEACHER: def({
    role: "TEACHER",
    titleKey: "dashboard.titles.teacher",
    subtitleKey: "dashboard.subtitles.teacher",
    quickActions: [
      { labelKey: "dashboard.actions.takeAttendance", path: "attendance", icon: UserCheck },
      { labelKey: "dashboard.actions.myClasses", path: "classroom", icon: BookOpen },
      { labelKey: "dashboard.actions.gradebook", path: "gradebook", icon: Award },
      { labelKey: "dashboard.actions.lessonPlans", path: "lesson-plans", icon: BookOpen },
      { labelKey: "dashboard.actions.examsAssessments", path: "exams", icon: ClipboardList },
    ],
    body: "teacher",
  }),
  STUDENT: def({
    role: "STUDENT",
    titleKey: "dashboard.titles.student",
    subtitleKey: "dashboard.subtitles.student",
    quickActions: [
      { labelKey: "dashboard.actions.myClasses", path: "classroom", icon: BookOpen },
      { labelKey: "dashboard.actions.myGrades", path: "grades", icon: Award },
      { labelKey: "dashboard.actions.onlineExams", path: "online-exams", icon: MonitorPlay },
      { labelKey: "dashboard.actions.myFees", path: "fees", icon: CreditCard },
      { labelKey: "dashboard.actions.mySchedule", path: "my-schedule", icon: CalendarClock },
    ],
    body: "student",
  }),
  PARENT: def({
    role: "PARENT",
    titleKey: "dashboard.titles.parent",
    subtitleKey: "dashboard.subtitles.parent",
    quickActions: [],
    body: "parent",
  }),
  ACCOUNTANT: def({
    role: "ACCOUNTANT",
    titleKey: "dashboard.titles.accountant",
    subtitleKey: "dashboard.subtitles.accountant",
    quickActions: [
      { labelKey: "dashboard.actions.collectFee", path: "fees", icon: CreditCard },
      { labelKey: "dashboard.actions.recordExpense", path: "expenses", icon: Briefcase },
      { labelKey: "dashboard.actions.processPayroll", path: "payroll", icon: Wallet },
    ],
    body: "accountant",
  }),
  TRANSPORTATION: def({
    role: "TRANSPORTATION",
    titleKey: "dashboard.titles.transportation",
    subtitleKey: "dashboard.subtitles.specialty",
    quickActions: [
      { labelKey: "dashboard.actions.calendar", path: "calendar", icon: Calendar },
      { labelKey: "dashboard.actions.staffPortal", path: "staff-portal", icon: Briefcase },
    ],
    hubs: [
      { labelKey: "dashboard.hubs.busRoutes", path: "bus-routes", icon: Truck, hintKey: "dashboard.hubs.busRoutesHint" },
      { labelKey: "dashboard.hubs.drivers", path: "drivers", icon: Users, hintKey: "dashboard.hubs.driversHint" },
      { labelKey: "dashboard.hubs.vehicleMaintenance", path: "vehicle-maintenance", icon: Wrench, hintKey: "dashboard.hubs.vehicleHint" },
    ],
    body: "specialty",
  }),
  MAINTENANCE: def({
    role: "MAINTENANCE",
    titleKey: "dashboard.titles.maintenance",
    subtitleKey: "dashboard.subtitles.specialty",
    quickActions: [
      { labelKey: "dashboard.actions.calendar", path: "calendar", icon: Calendar },
      { labelKey: "dashboard.actions.staffPortal", path: "staff-portal", icon: Briefcase },
    ],
    hubs: [
      { labelKey: "dashboard.hubs.workOrders", path: "work-orders", icon: ClipboardList, hintKey: "dashboard.hubs.workOrdersHint" },
      { labelKey: "dashboard.hubs.facilities", path: "maintenance", icon: Wrench, hintKey: "dashboard.hubs.facilitiesHint" },
    ],
    body: "specialty",
  }),
  LIBRARIAN: def({
    role: "LIBRARIAN",
    titleKey: "dashboard.titles.librarian",
    subtitleKey: "dashboard.subtitles.specialty",
    quickActions: [
      { labelKey: "dashboard.actions.calendar", path: "calendar", icon: Calendar },
      { labelKey: "dashboard.actions.staffPortal", path: "staff-portal", icon: Briefcase },
    ],
    hubs: [
      { labelKey: "dashboard.hubs.library", path: "library", icon: Library, hintKey: "dashboard.hubs.libraryHint" },
      { labelKey: "dashboard.hubs.digitalResources", path: "inventory", icon: Layers, hintKey: "dashboard.hubs.digitalHint" },
    ],
    body: "specialty",
  }),
  NURSE: def({
    role: "NURSE",
    titleKey: "dashboard.titles.nurse",
    subtitleKey: "dashboard.subtitles.specialty",
    quickActions: [
      { labelKey: "dashboard.actions.calendar", path: "calendar", icon: Calendar },
      { labelKey: "dashboard.actions.staffPortal", path: "staff-portal", icon: Briefcase },
    ],
    hubs: [
      { labelKey: "dashboard.hubs.clinic", path: "clinic", icon: HeartPulse, hintKey: "dashboard.hubs.clinicHint" },
      { labelKey: "dashboard.hubs.medicalInventory", path: "inventory", icon: Layers, hintKey: "dashboard.hubs.medicalHint" },
    ],
    body: "specialty",
  }),
  COUNSELOR: def({
    role: "COUNSELOR",
    titleKey: "dashboard.titles.counselor",
    subtitleKey: "dashboard.subtitles.specialty",
    quickActions: [
      { labelKey: "dashboard.actions.calendar", path: "calendar", icon: Calendar },
      { labelKey: "dashboard.actions.mySchedule", path: "my-schedule", icon: CalendarClock },
      { labelKey: "dashboard.actions.staffPortal", path: "staff-portal", icon: Briefcase },
    ],
    hubs: [
      { labelKey: "dashboard.hubs.counseling", path: "counseling", icon: MessageSquare, hintKey: "dashboard.hubs.counselingHint" },
      { labelKey: "dashboard.hubs.students", path: "students", icon: Users, hintKey: "dashboard.hubs.studentsHint" },
    ],
    body: "specialty",
  }),
  SECURITY: def({
    role: "SECURITY",
    titleKey: "dashboard.titles.security",
    subtitleKey: "dashboard.subtitles.specialty",
    quickActions: [
      { labelKey: "dashboard.actions.calendar", path: "calendar", icon: Calendar },
      { labelKey: "dashboard.actions.staffPortal", path: "staff-portal", icon: Briefcase },
    ],
    hubs: [
      { labelKey: "dashboard.hubs.security", path: "security", icon: ShieldCheck, hintKey: "dashboard.hubs.securityHint" },
      { labelKey: "dashboard.hubs.staffDirectory", path: "staff", icon: UserCog, hintKey: "dashboard.hubs.staffHint" },
    ],
    body: "specialty",
  }),
  IT_ADMIN: def({
    role: "IT_ADMIN",
    titleKey: "dashboard.titles.itAdmin",
    subtitleKey: "dashboard.subtitles.itAdmin",
    quickActions: [
      { labelKey: "dashboard.actions.apiDocs", path: "api-docs", icon: Terminal },
      { labelKey: "dashboard.actions.systemSettings", path: "settings", icon: Settings },
      { labelKey: "dashboard.actions.dailyReport", path: "reports", icon: PieChart },
      { labelKey: "dashboard.actions.personnelHub", path: "staff", icon: UserCog },
      { labelKey: "dashboard.actions.staffPortal", path: "staff-portal", icon: Briefcase },
    ],
    hubs: [
      { labelKey: "dashboard.hubs.settings", path: "settings", icon: Settings, hintKey: "dashboard.hubs.settingsHint" },
      { labelKey: "dashboard.hubs.reports", path: "reports", icon: PieChart, hintKey: "dashboard.hubs.reportsHint" },
      { labelKey: "dashboard.hubs.users", path: "staff", icon: UserCog, hintKey: "dashboard.hubs.usersHint" },
    ],
    body: "specialty",
  }),
  PROCUREMENT: def({
    role: "PROCUREMENT",
    titleKey: "dashboard.titles.procurement",
    subtitleKey: "dashboard.subtitles.specialty",
    quickActions: [
      { labelKey: "dashboard.actions.calendar", path: "calendar", icon: Calendar },
      { labelKey: "dashboard.actions.staffPortal", path: "staff-portal", icon: Briefcase },
    ],
    hubs: [
      { labelKey: "dashboard.hubs.procurement", path: "procurement", icon: Briefcase, hintKey: "dashboard.hubs.procurementHint" },
      { labelKey: "dashboard.hubs.inventory", path: "inventory", icon: Layers, hintKey: "dashboard.hubs.inventoryHint" },
    ],
    body: "specialty",
  }),
  ATHLETICS_DIRECTOR: def({
    role: "ATHLETICS_DIRECTOR",
    titleKey: "dashboard.titles.athletics",
    subtitleKey: "dashboard.subtitles.specialty",
    quickActions: [
      { labelKey: "dashboard.actions.calendar", path: "calendar", icon: Calendar },
      { labelKey: "dashboard.actions.staffPortal", path: "staff-portal", icon: Briefcase },
    ],
    hubs: [
      { labelKey: "dashboard.hubs.athletics", path: "athletics", icon: Trophy, hintKey: "dashboard.hubs.athleticsHint" },
      { labelKey: "dashboard.hubs.coaches", path: "staff", icon: UserCog, hintKey: "dashboard.hubs.coachesHint" },
    ],
    body: "specialty",
  }),
  HOSTEL_WARDEN: def({
    role: "HOSTEL_WARDEN",
    titleKey: "dashboard.titles.hostel",
    subtitleKey: "dashboard.subtitles.specialty",
    quickActions: [
      { labelKey: "dashboard.actions.calendar", path: "calendar", icon: Calendar },
      { labelKey: "dashboard.actions.takeAttendance", path: "attendance", icon: UserCheck },
      { labelKey: "dashboard.actions.staffPortal", path: "staff-portal", icon: Briefcase },
    ],
    hubs: [
      { labelKey: "dashboard.hubs.hostel", path: "hostel", icon: Home, hintKey: "dashboard.hubs.hostelHint" },
      { labelKey: "dashboard.hubs.attendance", path: "attendance", icon: UserCheck, hintKey: "dashboard.hubs.attendanceHint" },
    ],
    body: "specialty",
  }),
  CAFETERIA_MANAGER: def({
    role: "CAFETERIA_MANAGER",
    titleKey: "dashboard.titles.cafeteria",
    subtitleKey: "dashboard.subtitles.specialty",
    quickActions: [
      { labelKey: "dashboard.actions.calendar", path: "calendar", icon: Calendar },
      { labelKey: "dashboard.actions.staffPortal", path: "staff-portal", icon: Briefcase },
    ],
    hubs: [
      { labelKey: "dashboard.hubs.cafeteria", path: "cafeteria", icon: Utensils, hintKey: "dashboard.hubs.cafeteriaHint" },
      { labelKey: "dashboard.hubs.foodInventory", path: "inventory", icon: Layers, hintKey: "dashboard.hubs.foodHint" },
    ],
    body: "specialty",
  }),
};

const FALLBACK: RoleDashboardDef = {
  role: "SCHOOL_ADMIN",
  titleKey: "dashboard.title",
  subtitleKey: "dashboard.subtitle",
  quickActions: [
    { labelKey: "dashboard.actions.curriculum", path: "curriculum", icon: BookMarked },
    { labelKey: "dashboard.actions.dailyReport", path: "reports", icon: PieChart },
  ],
  body: "minimal",
  leadershipKpis: "school",
};

export function getRoleDashboard(role: string | undefined | null): RoleDashboardDef {
  if (!role) return FALLBACK;
  return ROLE_DASHBOARD_REGISTRY[role] ?? FALLBACK;
}

/** School roles missing from the registry (should be empty). */
export function missingDashboardRoles(): string[] {
  return schoolRoles.filter((r) => !ROLE_DASHBOARD_REGISTRY[r]);
}
