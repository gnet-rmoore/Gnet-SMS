export type GradeSheetPageSize = "a4" | "legal";

export type GradeSheetSubject = {
  name: string;
  max: number;
  obtained: number;
  classAvg: number | null;
  grade: string;
  remark: string;
  /** Continuous assessment portion (0–30 style); null when unknown */
  ca: number | null;
  /** Exam portion (0–70 style); null when unknown */
  exam: number | null;
};

export type GradeSheetData = {
  school: {
    name: string;
    address: string;
    contact: string;
    crestInitials: string;
    logoUrl?: string | null;
  };
  term: {
    label: string;
    examName: string;
    issueDate: string;
    nextTermStart: string;
    academicYear: string;
  };
  student: {
    name: string;
    admissionNo: string;
    classLabel: string;
    section: string;
    dob: string;
    guardian: string;
  };
  subjects: GradeSheetSubject[];
  summary: {
    maxTotal: number;
    obtainedTotal: number;
    percentage: number | null;
    gpa: number | null;
    overallGrade: string;
    rank: string;
    conduct: string;
    promotionStatus: string;
  };
  attendance: {
    present: number | null;
    total: number | null;
    absent: number | null;
    percentage: number | null;
  };
  remarks: {
    teacher: string;
    principal: string;
  };
  signatures?: {
    teacher?: { name?: string | null; signatureUrl?: string | null } | null;
    principal?: { name?: string | null; signatureUrl?: string | null } | null;
  };
};

export type GradeSheetTemplateId = "TEMPLATE_1" | "TEMPLATE_2";

export type GradeSheetTemplateDef = {
  id: GradeSheetTemplateId;
  name: string;
  description: string;
  pageSize: GradeSheetPageSize;
  /** jsPDF format */
  pdfFormat: "a4" | "legal";
  /** CSS @page size token */
  cssPageSize: "A4" | "legal";
  /** Sheet width × height for screen preview */
  sheetMm: { width: number; height: number };
};
