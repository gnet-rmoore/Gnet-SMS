import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  UserPlus,
  Library,
  School,
  MessagesSquare,
  UserCheck,
  CalendarClock,
  NotebookPen,
  Table2,
  FileSpreadsheet,
  ScrollText,
  Wallet,
  PieChart,
  Banknote,
  Users,
  CalendarOff,
  Wrench,
  Shield,
  Megaphone,
  Bell,
  HeartHandshake,
  KeyRound,
  CalendarDays,
  Palette,
  MonitorPlay,
  BadgeCheck,
  FileCheck2,
  Upload,
  FolderOpen,
  UsersRound,
  BarChart3,
  Receipt,
  BookMarked,
  Stethoscope,
  HeartPulse,
  Dumbbell,
  Building,
  UtensilsCrossed,
  Bus,
  ShoppingCart,
} from "lucide-react";
import type { PillarId } from "./pillars";

export type ModuleStatus = "live" | "stub";

export type ModuleGroupId = PillarId | "specialists";

export type ModuleMeta = {
  id: string;
  group: ModuleGroupId;
  status: ModuleStatus;
  icon: LucideIcon;
  titleKey: string;
  /** Short tagline under the title. */
  bodyKey: string;
  /** Longer honest description of what the module does today. */
  detailKey: string;
  /** Typical school roles that use this module. */
  rolesKey: string;
  /** Concrete capabilities — grounded in shipped product behavior. */
  highlightKeys: readonly [string, string, string] | readonly [string, string, string, string];
};

export const MODULE_GROUP_ORDER: ModuleGroupId[] = [
  "admissions",
  "academics",
  "assessment",
  "attendance",
  "finance",
  "people",
  "comms",
  "operations",
  "specialists",
];

export const MODULE_GROUP_LABEL_KEYS: Record<ModuleGroupId, string> = {
  admissions: "landing.modGroupAdmissions",
  academics: "landing.modGroupAcademics",
  assessment: "landing.modGroupAssessment",
  attendance: "landing.modGroupAttendance",
  finance: "landing.modGroupFinance",
  people: "landing.modGroupPeople",
  comms: "landing.modGroupComms",
  operations: "landing.modGroupOperations",
  specialists: "landing.modGroupSpecialists",
};

/** Representative icon per catalog domain (explorer UI). */
export const MODULE_GROUP_ICONS: Record<ModuleGroupId, LucideIcon> = {
  admissions: ClipboardList,
  academics: Library,
  assessment: Table2,
  attendance: UserCheck,
  finance: Wallet,
  people: Users,
  comms: Megaphone,
  operations: Wrench,
  specialists: Building,
};

function liveModule(
  id: string,
  group: ModuleGroupId,
  icon: LucideIcon,
  keySlug: string
): ModuleMeta {
  const prefix = `landing.mod${keySlug}`;
  return {
    id,
    group,
    status: "live",
    icon,
    titleKey: prefix,
    bodyKey: `${prefix}Body`,
    detailKey: `${prefix}Detail`,
    rolesKey: `${prefix}Roles`,
    highlightKeys: [`${prefix}H1`, `${prefix}H2`, `${prefix}H3`, `${prefix}H4`],
  };
}

export const MODULES: ModuleMeta[] = [
  liveModule("admissions", "admissions", ClipboardList, "Admissions"),
  liveModule("enrollment", "admissions", UserPlus, "Enrollment"),
  liveModule("bulk-import", "admissions", Upload, "BulkImport"),
  liveModule("transcripts", "admissions", ScrollText, "Transcripts"),
  liveModule("curriculum", "academics", Library, "Curriculum"),
  liveModule("classrooms", "academics", School, "Classrooms"),
  liveModule("workspace", "academics", MessagesSquare, "Workspace"),
  liveModule("schedule", "academics", CalendarClock, "Schedule"),
  liveModule("lesson-plans", "academics", NotebookPen, "LessonPlans"),
  liveModule("calendar", "academics", CalendarDays, "Calendar"),
  liveModule("gradebook", "assessment", Table2, "Gradebook"),
  liveModule("grade-review", "assessment", BadgeCheck, "GradeReview"),
  liveModule("exams", "assessment", FileSpreadsheet, "Exams"),
  liveModule("exam-paper", "assessment", FileCheck2, "ExamPaper"),
  liveModule("online-exams", "assessment", MonitorPlay, "OnlineExams"),
  liveModule("report-cards", "assessment", ScrollText, "ReportCards"),
  liveModule("attendance", "attendance", UserCheck, "Attendance"),
  liveModule("fees", "finance", Wallet, "Fees"),
  liveModule("expenses", "finance", PieChart, "Expenses"),
  liveModule("payroll", "finance", Banknote, "Payroll"),
  liveModule("receipts", "finance", Receipt, "Receipts"),
  liveModule("staff", "people", Users, "Staff"),
  liveModule("leave", "people", CalendarOff, "Leave"),
  liveModule("roles", "people", KeyRound, "Roles"),
  liveModule("settings", "people", Palette, "Settings"),
  liveModule("announcements", "comms", Megaphone, "Announcements"),
  liveModule("documents", "comms", FolderOpen, "Documents"),
  liveModule("notifications", "comms", Bell, "Notifications"),
  liveModule("parent", "comms", HeartHandshake, "Parent"),
  liveModule("pta", "comms", UsersRound, "Pta"),
  liveModule("reports", "operations", BarChart3, "Reports"),
  liveModule("maintenance", "operations", Wrench, "Maintenance"),
  liveModule("security", "operations", Shield, "Security"),
  liveModule("procurement", "operations", ShoppingCart, "Procurement"),
  liveModule("library", "specialists", BookMarked, "Library"),
  liveModule("clinic", "specialists", Stethoscope, "Clinic"),
  liveModule("counseling", "specialists", HeartPulse, "Counseling"),
  liveModule("athletics", "specialists", Dumbbell, "Athletics"),
  liveModule("hostel", "specialists", Building, "Hostel"),
  liveModule("cafeteria", "specialists", UtensilsCrossed, "Cafeteria"),
  liveModule("transport", "specialists", Bus, "Transport"),
];
