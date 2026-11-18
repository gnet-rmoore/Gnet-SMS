export type ReportCardColumn = { key: string; label: string; roman?: string };

export type ReportCardCell = {
  score: number | null;
  letter?: string | null;
  incomplete?: boolean;
};

export type ReportCardSubject = {
  subjectId: string;
  name: string;
  code: string;
  cells: Record<string, ReportCardCell>;
  sem1Avg: number | null;
  sem2Avg: number | null;
  yearlyAvg: number | null;
  average: number | null;
  letter: string | null;
  remark: string | null;
};

export type ReportCardAssessments = {
  conduct?: Record<string, string>;
  attitude?: Record<string, string>;
  progress?: Record<string, string>;
};

export type ReportCardPayload = {
  school: {
    name: string;
    address?: string | null;
    logoUrl?: string | null;
    brandColor?: string | null;
    branding?: string | null;
    country?: string | null;
    county?: string | null;
    district?: string | null;
    poBox?: string | null;
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
  columns: ReportCardColumn[];
  subjects: ReportCardSubject[];
  legend: Array<{ letter: string; min: number; max: number; detail?: string; gpa?: number }>;
  aggregates: {
    overallAverage: number | null;
    gpa: number | null;
    classPosition: string | null;
    attendanceRate: number | null;
  };
  assessments?: ReportCardAssessments | null;
  promotion: {
    outcome?: string | null;
    toGrade?: string | null;
    remarks?: string | null;
    deficientSubjects?: string | null;
    conditionedSubjects?: Array<string | { name?: string | null }> | null;
    probationWeeks?: number | null;
    finalizedAt?: string | null;
  } | null;
  templateKey: string;
  generatedAt: string;
  officialSignatures?: {
    principal?: ReportCardSignature | null;
    registrar?: ReportCardSignature | null;
    academic?: ReportCardSignature | null;
    vpa?: ReportCardSignature | null;
  } | null;
};

export type ReportCardSignature = {
  name?: string | null;
  signatureUrl?: string | null;
};
