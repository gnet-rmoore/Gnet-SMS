import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  School,
  Users,
  BookOpen,
  Settings,
  Megaphone,
  Calendar,
  ClipboardList,
  UserCheck,
  CreditCard,
  Layers,
  UserCog,
  FileText,
  PieChart,
  Wallet,
  Receipt,
  GraduationCap,
  FileSignature,
  BookMarked,
  Briefcase,
  Truck,
  Wrench,
  ClipboardCheck,
  KeyRound,
  ShieldCheck,
  Shield,
  Library,
  HeartPulse,
  MessageSquare,
  CircleHelp,
  Trophy,
  Home,
  Utensils,
  Award,
  CalendarCheck,
  Landmark,
  NotebookPen,
  MonitorPlay,
  CalendarClock,
  ArrowRightLeft,
  FileBarChart,
} from "lucide-react";

export type NavItem = {
  to: string;
  icon: LucideIcon;
  /** i18n key under nav namespace, e.g. items.dashboard */
  labelKey: string;
};

export type NavSection = {
  id: string;
  /** i18n key under nav.sections.*, e.g. overview */
  labelKey: string;
  items: NavItem[];
};

function section(id: string, _legacyLabel: string, items: NavItem[]): NavSection {
  return { id, labelKey: `sections.${id}`, items: items.filter(Boolean) };
}

export function flattenNavSections(sections: NavSection[]): NavItem[] {
  return sections.flatMap((s) => s.items);
}

/** Roles allowed on each school route path segment (relative to /:slug/). */
export const ROUTE_ROLES: Record<string, string[]> = {
  classroom: ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER", "STUDENT", "PARENT", "REGISTRAR"],
  classrooms: ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"],
  exams: ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"],
  "online-exams": ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"],
  "question-bank": ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"],
  "exam-paper-review": ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"],
  documents: [
    "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR", "TEACHER",
    "STUDENT", "PARENT", "ACCOUNTANT", "IT_ADMIN", "LIBRARIAN", "NURSE", "COUNSELOR",
  ],
  calendar: [
    "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR", "TEACHER",
    "STUDENT", "PARENT", "ACCOUNTANT", "IT_ADMIN",
    "TRANSPORTATION", "MAINTENANCE", "LIBRARIAN", "NURSE", "COUNSELOR",
    "SECURITY", "PROCUREMENT", "ATHLETICS_DIRECTOR", "HOSTEL_WARDEN", "CAFETERIA_MANAGER",
  ],
  students: ["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL", "VPI", "VPA", "TEACHER", "COUNSELOR"],
  grades: ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"],
  announcements: ["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "VPI", "VPA", "PARENT", "STUDENT"],
  pta: ["SCHOOL_ADMIN", "PARENT", "PRINCIPAL"],
  gradebook: ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"],
  "grade-review": ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"],
  "grade-access": ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"],
  "lesson-plans": ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"],
  schedules: ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "REGISTRAR"],
  "my-schedule": [
    "TEACHER", "STUDENT", "PARENT", "VPA", "COUNSELOR", "IT_ADMIN",
    "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "REGISTRAR",
  ],
  fees: ["SCHOOL_ADMIN", "ACCOUNTANT", "STUDENT", "PARENT"],
  expenses: ["SCHOOL_ADMIN", "ACCOUNTANT"],
  payroll: ["SCHOOL_ADMIN", "ACCOUNTANT"],
  settings: ["SCHOOL_ADMIN", "IT_ADMIN", "PRINCIPAL", "REGISTRAR", "ACCOUNTANT"],
  roles: ["SCHOOL_ADMIN", "IT_ADMIN"],
  admissions: ["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL"],
  onboarding: ["SCHOOL_ADMIN", "IT_ADMIN", "PRINCIPAL"],
  enrollment: ["SCHOOL_ADMIN", "REGISTRAR"],
  "year-transition": ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR"],
  "promotion-statement": ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR"],
  certificates: ["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL", "VPI"],
  "my-campus": ["PARENT", "STUDENT"],
};

/** Grouped sidebar sections for each role. */
export function getNavSections(role: string | undefined, slug: string | undefined): NavSection[] {
  switch (role) {
    case "SUPER_ADMIN":
      return [
        section("overview", "Overview", [
          { to: "/super-admin", icon: LayoutDashboard, labelKey: "items.dashboard" },
        ]),
        section("platform", "Platform", [
          { to: "/super-admin/schools", icon: School, labelKey: "items.schools" },
          { to: "/super-admin/registrations", icon: FileSignature, labelKey: "items.registrations" },
          { to: "/super-admin/users", icon: Users, labelKey: "items.usersManagement" },
          { to: "/super-admin/plans", icon: CreditCard, labelKey: "items.plans" },
          { to: "/super-admin/operators", icon: ShieldCheck, labelKey: "items.operators" },
        ]),
        section("insights", "Insights", [
          { to: "/super-admin/reports", icon: PieChart, labelKey: "items.globalReports" },
          { to: "/super-admin/logs", icon: FileText, labelKey: "items.systemLogs" },
        ]),
        section("account", "Account", [
          { to: "/super-admin/settings", icon: Settings, labelKey: "items.settings" },
          { to: "/super-admin/help", icon: CircleHelp, labelKey: "items.help" },
        ]),
      ];

    case "SCHOOL_ADMIN":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/onboarding`, icon: ClipboardCheck, labelKey: "items.setup" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.schoolCalendar" },
          { to: `/${slug}/reports`, icon: PieChart, labelKey: "items.reports" },
        ]),
        section("academics", "Academics", [
          { to: `/${slug}/classrooms`, icon: Layers, labelKey: "items.classrooms" },
          { to: `/${slug}/schedules`, icon: CalendarClock, labelKey: "items.classSchedules" },
          { to: `/${slug}/curriculum`, icon: BookMarked, labelKey: "items.curriculum" },
          { to: `/${slug}/lesson-plans`, icon: NotebookPen, labelKey: "items.lessonPlans" },
          { to: `/${slug}/exams`, icon: ClipboardList, labelKey: "items.exams" },
          { to: `/${slug}/online-exams`, icon: MonitorPlay, labelKey: "items.onlineExams" },
          { to: `/${slug}/question-bank`, icon: Library, labelKey: "items.questionBank" },
          { to: `/${slug}/gradebook`, icon: Award, labelKey: "items.gradebook" },
          { to: `/${slug}/grade-review`, icon: ClipboardCheck, labelKey: "items.gradeReview" },
          { to: `/${slug}/grade-access`, icon: KeyRound, labelKey: "items.gradeAccess" },
          { to: `/${slug}/exam-paper-review`, icon: FileSignature, labelKey: "items.examPaperReview" },
          { to: `/${slug}/attendance`, icon: UserCheck, labelKey: "items.attendance" },
          { to: `/${slug}/certificates`, icon: GraduationCap, labelKey: "items.certificates" },
          { to: `/${slug}/settings/academic-calendar`, icon: Calendar, labelKey: "items.academicCalendar" },
        ]),
        section("people", "People", [
          { to: `/${slug}/students`, icon: Users, labelKey: "items.students" },
          { to: `/${slug}/staff`, icon: UserCog, labelKey: "items.schoolStaff" },
          { to: `/${slug}/roles`, icon: ShieldCheck, labelKey: "items.rolesAccess" },
          { to: `/${slug}/admissions`, icon: FileSignature, labelKey: "items.admissions" },
          { to: `/${slug}/enrollment`, icon: ClipboardCheck, labelKey: "items.enrollment" },
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
          { to: `/${slug}/leave-approval`, icon: CalendarCheck, labelKey: "items.leaveApprovals" },
          { to: `/${slug}/staff-tasks`, icon: ClipboardList, labelKey: "items.staffTasks" },
          { to: `/${slug}/year-transition`, icon: ArrowRightLeft, labelKey: "items.yearTransition" },
          { to: `/${slug}/promotion-statement`, icon: FileBarChart, labelKey: "items.promotionStatement" },
        ]),
        section("finance", "Finance", [
          { to: `/${slug}/fees`, icon: CreditCard, labelKey: "items.fees" },
          { to: `/${slug}/expenses`, icon: Receipt, labelKey: "items.expenses" },
          { to: `/${slug}/payroll`, icon: Wallet, labelKey: "items.payroll" },
        ]),
        section("operations", "Operations", [
          { to: `/${slug}/work-orders`, icon: ClipboardList, labelKey: "items.workOrders" },
          { to: `/${slug}/maintenance`, icon: Wrench, labelKey: "items.facilitiesHub" },
        ]),
        section("communication", "Communication", [
          { to: `/${slug}/announcements`, icon: Megaphone, labelKey: "items.announcements" },
          { to: `/${slug}/documents`, icon: FileText, labelKey: "items.documents" },
          { to: `/${slug}/pta`, icon: Landmark, labelKey: "items.pta" },
        ]),
        section("account", "Account", [
          { to: `/${slug}/settings`, icon: Settings, labelKey: "items.settings" },
        ]),
      ];

    case "PRINCIPAL":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.schoolCalendar" },
          { to: `/${slug}/reports`, icon: PieChart, labelKey: "items.reports" },
        ]),
        section("academics", "Academics", [
          { to: `/${slug}/classrooms`, icon: Layers, labelKey: "items.classrooms" },
          { to: `/${slug}/schedules`, icon: CalendarClock, labelKey: "items.classSchedules" },
          { to: `/${slug}/curriculum`, icon: BookMarked, labelKey: "items.curriculum" },
          { to: `/${slug}/lesson-plans`, icon: NotebookPen, labelKey: "items.lessonPlans" },
          { to: `/${slug}/exams`, icon: ClipboardList, labelKey: "items.exams" },
          { to: `/${slug}/online-exams`, icon: MonitorPlay, labelKey: "items.onlineExams" },
          { to: `/${slug}/question-bank`, icon: Library, labelKey: "items.questionBank" },
          { to: `/${slug}/gradebook`, icon: Award, labelKey: "items.gradebook" },
          { to: `/${slug}/grade-review`, icon: ClipboardCheck, labelKey: "items.gradeReview" },
          { to: `/${slug}/grade-access`, icon: KeyRound, labelKey: "items.gradeAccess" },
          { to: `/${slug}/exam-paper-review`, icon: FileSignature, labelKey: "items.examPaperReview" },
          { to: `/${slug}/attendance`, icon: UserCheck, labelKey: "items.attendance" },
          { to: `/${slug}/certificates`, icon: GraduationCap, labelKey: "items.certificates" },
          { to: `/${slug}/settings/academic-calendar`, icon: Calendar, labelKey: "items.academicCalendar" },
        ]),
        section("people", "People", [
          { to: `/${slug}/students`, icon: Users, labelKey: "items.students" },
          { to: `/${slug}/staff`, icon: UserCog, labelKey: "items.staffDirectory" },
          { to: `/${slug}/admissions`, icon: FileSignature, labelKey: "items.admissions" },
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
          { to: `/${slug}/leave-approval`, icon: CalendarCheck, labelKey: "items.leaveApprovals" },
          { to: `/${slug}/staff-tasks`, icon: ClipboardList, labelKey: "items.staffTasks" },
          { to: `/${slug}/year-transition`, icon: ArrowRightLeft, labelKey: "items.yearTransition" },
          { to: `/${slug}/promotion-statement`, icon: FileBarChart, labelKey: "items.promotionStatement" },
        ]),
        section("operations", "Operations", [
          { to: `/${slug}/work-orders`, icon: ClipboardList, labelKey: "items.workOrders" },
          { to: `/${slug}/maintenance`, icon: Wrench, labelKey: "items.facilitiesHub" },
        ]),
        section("communication", "Communication", [
          { to: `/${slug}/announcements`, icon: Megaphone, labelKey: "items.announcements" },
          { to: `/${slug}/documents`, icon: FileText, labelKey: "items.documents" },
          { to: `/${slug}/pta`, icon: Landmark, labelKey: "items.pta" },
        ]),
        section("account", "Account", [
          { to: `/${slug}/settings`, icon: Settings, labelKey: "items.receiptTemplates" },
        ]),
      ];

    case "REGISTRAR":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
        ]),
        section("academics", "Academics", [
          { to: `/${slug}/schedules`, icon: CalendarClock, labelKey: "items.classSchedules" },
        ]),
        section("people", "People", [
          { to: `/${slug}/admissions`, icon: FileSignature, labelKey: "items.admissions" },
          { to: `/${slug}/students`, icon: Users, labelKey: "items.studentRecords" },
          { to: `/${slug}/transcripts`, icon: FileText, labelKey: "items.transcripts" },
          { to: `/${slug}/certificates`, icon: GraduationCap, labelKey: "items.certificates" },
          { to: `/${slug}/enrollment`, icon: ClipboardCheck, labelKey: "items.enrollment" },
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
          { to: `/${slug}/year-transition`, icon: ArrowRightLeft, labelKey: "items.yearTransition" },
          { to: `/${slug}/promotion-statement`, icon: FileBarChart, labelKey: "items.promotionStatement" },
        ]),
        section("account", "Account", [
          { to: `/${slug}/settings`, icon: Settings, labelKey: "items.receiptTemplates" },
        ]),
      ];

    case "VPI":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
          { to: `/${slug}/reports`, icon: PieChart, labelKey: "items.academicReports" },
        ]),
        section("academics", "Academics", [
          { to: `/${slug}/classrooms`, icon: Layers, labelKey: "items.classrooms" },
          { to: `/${slug}/schedules`, icon: CalendarClock, labelKey: "items.classSchedules" },
          { to: `/${slug}/curriculum`, icon: BookMarked, labelKey: "items.curriculum" },
          { to: `/${slug}/lesson-plans`, icon: NotebookPen, labelKey: "items.lessonPlans" },
          { to: `/${slug}/exams`, icon: ClipboardList, labelKey: "items.examsAssessment" },
          { to: `/${slug}/online-exams`, icon: MonitorPlay, labelKey: "items.onlineExams" },
          { to: `/${slug}/question-bank`, icon: Library, labelKey: "items.questionBank" },
          { to: `/${slug}/gradebook`, icon: Award, labelKey: "items.gradebook" },
          { to: `/${slug}/grade-review`, icon: ClipboardCheck, labelKey: "items.gradeReview" },
          { to: `/${slug}/grade-access`, icon: KeyRound, labelKey: "items.gradeAccess" },
          { to: `/${slug}/exam-paper-review`, icon: FileSignature, labelKey: "items.examPaperReview" },
          { to: `/${slug}/attendance`, icon: UserCheck, labelKey: "items.attendance" },
          { to: `/${slug}/certificates`, icon: GraduationCap, labelKey: "items.certificates" },
          { to: `/${slug}/year-transition`, icon: ArrowRightLeft, labelKey: "items.yearTransition" },
          { to: `/${slug}/promotion-statement`, icon: FileBarChart, labelKey: "items.promotionStatement" },
        ]),
        section("people", "People", [
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
          { to: `/${slug}/staff-tasks`, icon: ClipboardList, labelKey: "items.staffTasks" },
        ]),
      ];

    case "VPA":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
          { to: `/${slug}/my-schedule`, icon: CalendarClock, labelKey: "items.classSchedule" },
        ]),
        section("people", "People", [
          { to: `/${slug}/staff`, icon: UserCog, labelKey: "items.hrManagement" },
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
          { to: `/${slug}/leave-approval`, icon: CalendarCheck, labelKey: "items.leaveApprovals" },
          { to: `/${slug}/staff-tasks`, icon: ClipboardList, labelKey: "items.staffTasks" },
          { to: `/${slug}/attendance`, icon: UserCheck, labelKey: "items.attendance" },
          { to: `/${slug}/year-transition`, icon: ArrowRightLeft, labelKey: "items.yearTransition" },
          { to: `/${slug}/promotion-statement`, icon: FileBarChart, labelKey: "items.promotionStatement" },
        ]),
        section("operations", "Operations", [
          { to: `/${slug}/procurement`, icon: Briefcase, labelKey: "items.procurement" },
          { to: `/${slug}/work-orders`, icon: ClipboardList, labelKey: "items.workOrders" },
          { to: `/${slug}/maintenance`, icon: Wrench, labelKey: "items.facilitiesHub" },
          { to: `/${slug}/security`, icon: ShieldCheck, labelKey: "items.securitySurveillance" },
        ]),
      ];

    case "TEACHER":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
          { to: `/${slug}/my-schedule`, icon: CalendarClock, labelKey: "items.mySchedule" },
        ]),
        section("academics", "Academics", [
          { to: `/${slug}/classroom`, icon: BookOpen, labelKey: "items.myClasses" },
          { to: `/${slug}/curriculum`, icon: BookMarked, labelKey: "items.curriculum" },
          { to: `/${slug}/lesson-plans`, icon: NotebookPen, labelKey: "items.lessonPlans" },
          { to: `/${slug}/exams`, icon: ClipboardList, labelKey: "items.exams" },
          { to: `/${slug}/online-exams`, icon: MonitorPlay, labelKey: "items.onlineExams" },
          { to: `/${slug}/question-bank`, icon: Library, labelKey: "items.questionBank" },
          { to: `/${slug}/gradebook`, icon: Award, labelKey: "items.gradebook" },
          { to: `/${slug}/grade-review`, icon: ClipboardCheck, labelKey: "items.mySubmissions" },
          { to: `/${slug}/attendance`, icon: UserCheck, labelKey: "items.attendance" },
        ]),
        section("people", "People", [
          { to: `/${slug}/students`, icon: Users, labelKey: "items.students" },
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
        ]),
      ];

    case "STUDENT":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
          { to: `/${slug}/my-schedule`, icon: CalendarClock, labelKey: "items.mySchedule" },
        ]),
        section("academics", "Academics", [
          { to: `/${slug}/classroom`, icon: BookOpen, labelKey: "items.myClasses" },
          { to: `/${slug}/grades`, icon: Award, labelKey: "items.myGrades" },
          { to: `/${slug}/exams`, icon: ClipboardList, labelKey: "items.exams" },
          { to: `/${slug}/online-exams`, icon: MonitorPlay, labelKey: "items.onlineExams" },
          { to: `/${slug}/attendance`, icon: UserCheck, labelKey: "items.myAttendance" },
        ]),
        section("finance", "Finance", [
          { to: `/${slug}/fees`, icon: CreditCard, labelKey: "items.fees" },
        ]),
        section("campus", "Campus", [
          { to: `/${slug}/my-campus`, icon: Truck, labelKey: "items.myCampus" },
        ]),
      ];

    case "PARENT":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
          { to: `/${slug}/my-schedule`, icon: CalendarClock, labelKey: "items.mySchedule" },
        ]),
        section("family", "Family", [
          { to: `/${slug}/children`, icon: GraduationCap, labelKey: "items.myChildren" },
          { to: `/${slug}/my-applications`, icon: ClipboardList, labelKey: "items.myApplications" },
          { to: `/${slug}/classroom`, icon: BookOpen, labelKey: "items.myClasses" },
          { to: `/${slug}/grades`, icon: Award, labelKey: "items.grades" },
          { to: `/${slug}/online-exams`, icon: MonitorPlay, labelKey: "items.onlineExams" },
          { to: `/${slug}/attendance`, icon: UserCheck, labelKey: "items.attendance" },
          { to: `/${slug}/my-campus`, icon: Truck, labelKey: "items.myCampus" },
        ]),
        section("finance", "Finance", [
          { to: `/${slug}/fees`, icon: CreditCard, labelKey: "items.fees" },
        ]),
        section("communication", "Communication", [
          { to: `/${slug}/announcements`, icon: Megaphone, labelKey: "items.news" },
          { to: `/${slug}/documents`, icon: FileText, labelKey: "items.documents" },
          { to: `/${slug}/pta`, icon: Landmark, labelKey: "items.pta" },
        ]),
      ];

    case "ACCOUNTANT":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
        ]),
        section("finance", "Finance", [
          { to: `/${slug}/fees`, icon: Wallet, labelKey: "items.feeManagement" },
          { to: `/${slug}/expenses`, icon: Receipt, labelKey: "items.expenses" },
          { to: `/${slug}/payroll`, icon: Wallet, labelKey: "items.payroll" },
        ]),
        section("account", "Account", [
          { to: `/${slug}/settings`, icon: Settings, labelKey: "items.receiptTemplates" },
        ]),
        section("people", "People", [
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
        ]),
      ];

    case "TRANSPORTATION":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
        ]),
        section("operations", "Operations", [
          { to: `/${slug}/bus-routes`, icon: Truck, labelKey: "items.busRoutes" },
          { to: `/${slug}/drivers`, icon: Users, labelKey: "items.drivers" },
          { to: `/${slug}/vehicle-maintenance`, icon: Wrench, labelKey: "items.vehicleMaintenance" },
        ]),
        section("people", "People", [
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
        ]),
      ];

    case "MAINTENANCE":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
        ]),
        section("operations", "Operations", [
          { to: `/${slug}/work-orders`, icon: ClipboardList, labelKey: "items.workOrders" },
          { to: `/${slug}/maintenance`, icon: Wrench, labelKey: "items.facilitiesHub" },
        ]),
        section("people", "People", [
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
        ]),
      ];

    case "LIBRARIAN":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
        ]),
        section("operations", "Operations", [
          { to: `/${slug}/library`, icon: Library, labelKey: "items.library" },
          { to: `/${slug}/inventory`, icon: Layers, labelKey: "items.digitalResources" },
        ]),
        section("people", "People", [
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
        ]),
      ];

    case "NURSE":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
        ]),
        section("operations", "Operations", [
          { to: `/${slug}/clinic`, icon: HeartPulse, labelKey: "items.clinic" },
          { to: `/${slug}/inventory`, icon: Layers, labelKey: "items.medicalInventory" },
        ]),
        section("people", "People", [
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
        ]),
      ];

    case "COUNSELOR":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
          { to: `/${slug}/my-schedule`, icon: CalendarClock, labelKey: "items.classSchedule" },
        ]),
        section("people", "People", [
          { to: `/${slug}/counseling`, icon: MessageSquare, labelKey: "items.counseling" },
          { to: `/${slug}/students`, icon: Users, labelKey: "items.studentWellbeing" },
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
        ]),
      ];

    case "SECURITY":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
        ]),
        section("operations", "Operations", [
          { to: `/${slug}/security`, icon: ShieldCheck, labelKey: "items.securityIncidents" },
        ]),
        section("people", "People", [
          { to: `/${slug}/staff`, icon: UserCog, labelKey: "items.staffDirectory" },
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
        ]),
      ];

    case "IT_ADMIN":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
          { to: `/${slug}/my-schedule`, icon: CalendarClock, labelKey: "items.classSchedule" },
          { to: `/${slug}/reports`, icon: PieChart, labelKey: "items.systemLogs" },
        ]),
        section("people", "People", [
          { to: `/${slug}/staff`, icon: UserCog, labelKey: "items.userManagement" },
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
        ]),
        section("security", "Security", [
          { to: `/${slug}/roles`, icon: ShieldCheck, labelKey: "items.rolesAccess" },
          { to: `/${slug}/settings?tab=SECURITY`, icon: Shield, labelKey: "items.securitySettings" },
          { to: `/${slug}/settings?tab=API_KEYS`, icon: KeyRound, labelKey: "items.apiKeys" },
        ]),
        section("account", "Account", [
          { to: `/${slug}/settings`, icon: Settings, labelKey: "items.systemSettings" },
        ]),
      ];

    case "PROCUREMENT":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
        ]),
        section("operations", "Operations", [
          { to: `/${slug}/procurement`, icon: Briefcase, labelKey: "items.purchaseRequests" },
          { to: `/${slug}/inventory`, icon: Layers, labelKey: "items.stockManagement" },
        ]),
        section("people", "People", [
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
        ]),
      ];

    case "ATHLETICS_DIRECTOR":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
        ]),
        section("operations", "Operations", [
          { to: `/${slug}/athletics`, icon: Trophy, labelKey: "items.athletics" },
        ]),
        section("people", "People", [
          { to: `/${slug}/staff`, icon: UserCog, labelKey: "items.coachesDirectory" },
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
        ]),
      ];

    case "HOSTEL_WARDEN":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
        ]),
        section("operations", "Operations", [
          { to: `/${slug}/hostel`, icon: Home, labelKey: "items.hostelManagement" },
          { to: `/${slug}/attendance`, icon: UserCheck, labelKey: "items.attendance" },
        ]),
        section("people", "People", [
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
        ]),
      ];

    case "CAFETERIA_MANAGER":
      return [
        section("overview", "Overview", [
          { to: `/${slug}/dashboard`, icon: LayoutDashboard, labelKey: "items.dashboard" },
          { to: `/${slug}/calendar`, icon: Calendar, labelKey: "items.calendar" },
        ]),
        section("operations", "Operations", [
          { to: `/${slug}/cafeteria`, icon: Utensils, labelKey: "items.cafeteria" },
          { to: `/${slug}/inventory`, icon: Layers, labelKey: "items.foodInventory" },
        ]),
        section("people", "People", [
          { to: `/${slug}/staff-portal`, icon: Briefcase, labelKey: "items.staffPortal" },
        ]),
      ];

    default:
      return [];
  }
}

/** Flat leaf links (search, access checks). Prefer `getNavSections` for the sidebar. */
export function getNavItems(role: string | undefined, slug: string | undefined): NavItem[] {
  return flattenNavSections(getNavSections(role, slug));
}

/** True if this role’s nav includes a path ending with `/${segment}` (or exact segment for super-admin). */
export function roleCanAccessNavPath(role: string | undefined, slug: string | undefined, segment: string): boolean {
  const items = getNavItems(role, slug);
  return items.some((item) => {
    const parts = item.to.split("/").filter(Boolean);
    return parts[parts.length - 1] === segment || parts.includes(segment);
  });
}

/** Roles that may search the school student directory (matches Students route guard). */
export const STUDENT_SEARCH_ROLES = [
  "SCHOOL_ADMIN",
  "REGISTRAR",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "TEACHER",
  "COUNSELOR",
] as const;

/** Roles that may search the staff directory (matches Staff route access). */
export const STAFF_SEARCH_ROLES = [
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPA",
  "VPI",
  "IT_ADMIN",
  "SECURITY",
  "ATHLETICS_DIRECTOR",
] as const;

/** Roles that may search classrooms (school list or own classes). */
export const CLASSROOM_SEARCH_ROLES = [
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
  "TEACHER",
  "STUDENT",
  "PARENT",
] as const;

export function canSearchStudents(role: string | undefined): boolean {
  return Boolean(role && (STUDENT_SEARCH_ROLES as readonly string[]).includes(role));
}

export function canSearchStaff(role: string | undefined): boolean {
  return Boolean(role && (STAFF_SEARCH_ROLES as readonly string[]).includes(role));
}

export function canSearchClassrooms(role: string | undefined): boolean {
  return Boolean(role && (CLASSROOM_SEARCH_ROLES as readonly string[]).includes(role));
}
