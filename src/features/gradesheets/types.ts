export type GradeSheetPageSize = "a4" | "legal";

export type GradeSheetColumn = {
  code: string;
  name?: string;
  weightPct: number;
};

export type GradeSheetLegendBand = {
  min: number;
  max: number;
  letter: string;
  remark?: string;
};

export type GradeSheetSubject = {
  name: string;
  code?: string;
  /** Percent (0-100) per column code. Missing/null = no grade for that column. */
  scores: Record<string, number | null>;
  total: number | null;
  letter: string | null;
  remark: string | null;
  position: number | null;
  /** legacy/compat fields */
  max: number;
  obtained: number;
  classAvg: number | null;
  grade: string;
  ca: number | null;
  exam: number | null;
};

export type GradeSheetData = {
  school: {
    name: string;
    address: string;
    contact: string;
    phone?: string;
    email?: string;
    motto?: string;
    crestInitials: string;
    logoUrl?: string | null;
  };
  term: {
    label: string;
    periodLabel?: string;
    examName: string;
    issueDate: string;
    nextTermStart: string;
    academicYear: string;
    schoolYear?: string;
  };
  student: {
    name: string;
    id?: string;
    admissionNo: string;
    classLabel: string;
    gradeLevel?: string;
    section: string;
    dob: string;
    guardian: string;
  };
  columns: GradeSheetColumn[];
  legend: GradeSheetLegendBand[];
  subjects: GradeSheetSubject[];
  summary: {
    average: number | null;
    rank: number | null;
    classSize: number | null;
    gpa: number | null;
    promotionStatus: string | null;
    maxTotal: number;
    obtainedTotal: number;
    percentage: number | null;
    overallGrade: string;
    rankLabel: string;
    conduct: string;
  };
  attendance: {
    present: number | null;
    total: number | null;
    absent: number | null;
    percentage: number | null;
  } | null;
  remarks: {
    educator: string | null;
    principal: string | null;
    teacher: string;
  };
  signatures?: {
    teacher?: { name?: string | null; signatureUrl?: string | null } | null;
    principal?: { name?: string | null; signatureUrl?: string | null } | null;
  };
  issuedOn?: string;
};

export type GradeSheetTemplateId = "TEMPLATE_1" | "TEMPLATE_2";

export type GradeSheetTemplateDef = {
  id: GradeSheetTemplateId;
  name: string;
  description: string;
  pageSize: GradeSheetPageSize;
  pdfFormat: "a4" | "legal";
  cssPageSize: "A4" | "legal";
  sheetMm: { width: number; height: number };
};
