import {
  ClipboardList,
  BookOpen,
  FileSpreadsheet,
  UserCheck,
  Landmark,
  Users,
  MessagesSquare,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type PillarId =
  | "admissions"
  | "academics"
  | "assessment"
  | "attendance"
  | "finance"
  | "people"
  | "comms"
  | "operations";

/** Each capability card gets one solid panel color — no gradients, no white fill. */
export type PillarTheme = {
  cardBg: string;
  title: string;
  body: string;
  iconBg: string;
  iconFg: string;
  tag: string;
  chip: string;
  divider: string;
  hover: string;
};

export type PillarMeta = {
  id: PillarId;
  icon: LucideIcon;
  titleKey: string;
  bodyKey: string;
  tagKey: string;
  categoryKey: string;
  pointKeys: string[];
  theme: PillarTheme;
};

export const PILLARS: PillarMeta[] = [
  {
    id: "admissions",
    icon: ClipboardList,
    titleKey: "landing.capAdmissionsTitle",
    bodyKey: "landing.capAdmissionsBody",
    tagKey: "landing.capTagAdmissions",
    categoryKey: "landing.capCatEnrollment",
    pointKeys: ["landing.capAdmissionsP1", "landing.capAdmissionsP2"],
    theme: {
      cardBg: "bg-blue-600",
      title: "text-white",
      body: "text-blue-50",
      iconBg: "bg-white",
      iconFg: "text-blue-700",
      tag: "bg-blue-700 text-white",
      chip: "bg-blue-700 text-blue-50",
      divider: "border-blue-500",
      hover: "group-hover:brightness-105",
    },
  },
  {
    id: "academics",
    icon: BookOpen,
    titleKey: "landing.capAcademicsTitle",
    bodyKey: "landing.capAcademicsBody",
    tagKey: "landing.capTagAcademics",
    categoryKey: "landing.capCatTeaching",
    pointKeys: ["landing.capAcademicsP1", "landing.capAcademicsP2"],
    theme: {
      cardBg: "bg-teal-600",
      title: "text-white",
      body: "text-teal-50",
      iconBg: "bg-white",
      iconFg: "text-teal-700",
      tag: "bg-teal-700 text-white",
      chip: "bg-teal-700 text-teal-50",
      divider: "border-teal-500",
      hover: "group-hover:brightness-105",
    },
  },
  {
    id: "assessment",
    icon: FileSpreadsheet,
    titleKey: "landing.capAssessmentTitle",
    bodyKey: "landing.capAssessmentBody",
    tagKey: "landing.capTagAssessment",
    categoryKey: "landing.capCatAssessment",
    pointKeys: ["landing.capAssessmentP1", "landing.capAssessmentP2"],
    theme: {
      cardBg: "bg-indigo-600",
      title: "text-white",
      body: "text-indigo-50",
      iconBg: "bg-white",
      iconFg: "text-indigo-700",
      tag: "bg-indigo-700 text-white",
      chip: "bg-indigo-700 text-indigo-50",
      divider: "border-indigo-500",
      hover: "group-hover:brightness-105",
    },
  },
  {
    id: "attendance",
    icon: UserCheck,
    titleKey: "landing.capAttendanceTitle",
    bodyKey: "landing.capAttendanceBody",
    tagKey: "landing.capTagAttendance",
    categoryKey: "landing.capCatDaily",
    pointKeys: ["landing.capAttendanceP1", "landing.capAttendanceP2"],
    theme: {
      cardBg: "bg-emerald-600",
      title: "text-white",
      body: "text-emerald-50",
      iconBg: "bg-white",
      iconFg: "text-emerald-700",
      tag: "bg-emerald-700 text-white",
      chip: "bg-emerald-700 text-emerald-50",
      divider: "border-emerald-500",
      hover: "group-hover:brightness-105",
    },
  },
  {
    id: "finance",
    icon: Landmark,
    titleKey: "landing.capFinanceTitle",
    bodyKey: "landing.capFinanceBody",
    tagKey: "landing.capTagFinance",
    categoryKey: "landing.capCatBilling",
    pointKeys: ["landing.capFinanceP1", "landing.capFinanceP2"],
    theme: {
      cardBg: "bg-amber-600",
      title: "text-white",
      body: "text-amber-50",
      iconBg: "bg-white",
      iconFg: "text-amber-800",
      tag: "bg-amber-700 text-white",
      chip: "bg-amber-700 text-amber-50",
      divider: "border-amber-500",
      hover: "group-hover:brightness-105",
    },
  },
  {
    id: "people",
    icon: Users,
    titleKey: "landing.capPeopleTitle",
    bodyKey: "landing.capPeopleBody",
    tagKey: "landing.capTagPeople",
    categoryKey: "landing.capCatWorkforce",
    pointKeys: ["landing.capPeopleP1", "landing.capPeopleP2"],
    theme: {
      cardBg: "bg-sky-600",
      title: "text-white",
      body: "text-sky-50",
      iconBg: "bg-white",
      iconFg: "text-sky-700",
      tag: "bg-sky-700 text-white",
      chip: "bg-sky-700 text-sky-50",
      divider: "border-sky-500",
      hover: "group-hover:brightness-105",
    },
  },
  {
    id: "comms",
    icon: MessagesSquare,
    titleKey: "landing.capCommsTitle",
    bodyKey: "landing.capCommsBody",
    tagKey: "landing.capTagComms",
    categoryKey: "landing.capCatFamily",
    pointKeys: ["landing.capCommsP1", "landing.capCommsP2"],
    theme: {
      cardBg: "bg-rose-600",
      title: "text-white",
      body: "text-rose-50",
      iconBg: "bg-white",
      iconFg: "text-rose-700",
      tag: "bg-rose-700 text-white",
      chip: "bg-rose-700 text-rose-50",
      divider: "border-rose-500",
      hover: "group-hover:brightness-105",
    },
  },
  {
    id: "operations",
    icon: Wrench,
    titleKey: "landing.capOpsTitle",
    bodyKey: "landing.capOpsBody",
    tagKey: "landing.capTagOps",
    categoryKey: "landing.capCatCampus",
    pointKeys: ["landing.capOpsP1", "landing.capOpsP2"],
    theme: {
      cardBg: "bg-orange-600",
      title: "text-white",
      body: "text-orange-50",
      iconBg: "bg-white",
      iconFg: "text-orange-700",
      tag: "bg-orange-700 text-white",
      chip: "bg-orange-700 text-orange-50",
      divider: "border-orange-500",
      hover: "group-hover:brightness-105",
    },
  },
];
