import type { GradeLegendLike } from "../../lib/gradeLegend";

export type ReportCardRegion = "LR" | "US" | "EU" | "AFR" | "AS" | "INTL";

export type ReportCardPageKind = "COVER" | "GRADES" | "GRADING_SYSTEM" | "PROMOTION";

export type CalendarAffinity = "SEMESTER" | "TWO_TERM" | "THREE_TERM" | "ANY";

export type PromotionScheme = "A_D" | "A_E";

export type ReportCardTemplateDef = {
  key: string;
  region: ReportCardRegion;
  label: string;
  description: string;
  audience: "PRIVATE" | "PUBLIC" | "BOTH";
  calendarAffinity: CalendarAffinity[];
  pages: ReportCardPageKind[];
  promotionScheme: PromotionScheme;
  branding: "SCHOOL_LOGO" | "SCHOOL_LOGO_PLUS_MOE" | "MOE_ONLY";
  /** Legacy Identity key e.g. TEMPLATE_1 */
  legacyId?: string;
  divisionTitle?: string;
  documentTitle?: string;
};

export type ReportCardColumn = {
  key: string;
  label: string;
  roman?: string;
};

export type ReportCardSubjectRow = {
  subjectId: string;
  name: string;
  code: string;
  cells: Record<string, { score: number | null; letter?: string | null; incomplete?: boolean }>;
  /** Mean of filled Sem1 period + exam cells */
  sem1Avg: number | null;
  /** Mean of filled Sem2 period + exam cells */
  sem2Avg: number | null;
  /** Mean of the two semester averages */
  yearlyAvg: number | null;
  average: number | null;
  letter: string | null;
  remark: string | null;
};

export type ReportCardPromotion = {
  outcome: string | null;
  toGrade?: string | null;
  conditionedSubjects?: string | null;
  probationWeeks?: number | null;
  remarks?: string | null;
  finalizedAt?: string | null;
};

export type ReportCardPayload = {
  school: {
    id?: string;
    name: string;
    address?: string | null;
    poBox?: string | null;
    logoUrl?: string | null;
    brandColor?: string | null;
    country?: string | null;
    county?: string | null;
    district?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
  };
  student: {
    id: string;
    name: string;
    sex?: string | null;
    classLabel: string;
    gradeLevelLabel: string;
  };
  academicYear: { id: string; label: string };
  calendar: {
    patternType: string;
    periods: Array<{ id: string; label: string; shortCode: string; orderIndex: number }>;
  };
  columns: ReportCardColumn[];
  subjects: ReportCardSubjectRow[];
  legend: Array<{ letter: string; min: number; max: number; detail?: string }>;
  aggregates: {
    overallAverage: number | null;
    gpa: number | null;
    classPosition: string | null;
    attendanceRate: number | null;
  };
  promotion: ReportCardPromotion | null;
  templateKey: string;
  generatedAt: string;
  officialSignatures?: {
    principal?: { name?: string | null; signatureUrl?: string | null } | null;
    registrar?: { name?: string | null; signatureUrl?: string | null } | null;
    academic?: { name?: string | null; signatureUrl?: string | null } | null;
  } | null;
};

export type RawGradeForAssembly = {
  id: string;
  score: number | null;
  isIncomplete?: boolean;
  subjectId?: string;
  subject?: { id?: string; name: string; code?: string } | null;
  examComponent?: { id?: string; label?: string; shortCode?: string | null } | null;
  examComponentId?: string | null;
  classroom?: { name?: string } | null;
  classId?: string;
};

export type AssembleReportCardInput = {
  templateKey: string;
  school: ReportCardPayload["school"];
  student: ReportCardPayload["student"];
  academicYearLabel?: string;
  grades: RawGradeForAssembly[];
  gradeLegends?: GradeLegendLike[] | null;
  patternType?: string;
};
