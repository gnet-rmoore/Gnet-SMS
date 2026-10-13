import {
  Shield,
  ClipboardList,
  GraduationCap,
  BookOpen,
  HeartHandshake,
  Landmark,
  Wrench,
  Building2,
  type LucideIcon,
} from "lucide-react";

export type PersonaMeta = {
  id: string;
  icon: LucideIcon;
  titleKey: string;
  bodyKey: string;
};

export const PERSONAS: PersonaMeta[] = [
  {
    id: "leadership",
    icon: Shield,
    titleKey: "landing.audienceLeadTitle",
    bodyKey: "landing.audienceLeadBody",
  },
  {
    id: "registrar",
    icon: ClipboardList,
    titleKey: "landing.audienceRegistrarTitle",
    bodyKey: "landing.audienceRegistrarBody",
  },
  {
    id: "teachers",
    icon: GraduationCap,
    titleKey: "landing.audienceTeachTitle",
    bodyKey: "landing.audienceTeachBody",
  },
  {
    id: "students",
    icon: BookOpen,
    titleKey: "landing.audienceStudentTitle",
    bodyKey: "landing.audienceStudentBody",
  },
  {
    id: "family",
    icon: HeartHandshake,
    titleKey: "landing.audienceFamilyTitle",
    bodyKey: "landing.audienceFamilyBody",
  },
  {
    id: "finance",
    icon: Landmark,
    titleKey: "landing.audienceFinanceTitle",
    bodyKey: "landing.audienceFinanceBody",
  },
  {
    id: "ops",
    icon: Wrench,
    titleKey: "landing.audienceOpsTitle",
    bodyKey: "landing.audienceOpsBody",
  },
  {
    id: "platform",
    icon: Building2,
    titleKey: "landing.audiencePlatformTitle",
    bodyKey: "landing.audiencePlatformBody",
  },
];
