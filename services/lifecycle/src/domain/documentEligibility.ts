export type DocumentEligibilityReason =
  | "NOT_APPROVED_YET"
  | "ENTRANCE_NOT_COMPLETED"
  | "STUDENT_RECORD_MISSING"
  | "STUDENT_INACTIVE"
  | "STUDENT_SCHOOL_MISMATCH";

export type DocumentEligibility =
  | { eligible: true }
  | { eligible: false; reason: DocumentEligibilityReason };

export const DOCUMENT_ELIGIBILITY_MESSAGES: Record<DocumentEligibilityReason, string> = {
  NOT_APPROVED_YET: "Documents can be collected once the application has been approved.",
  ENTRANCE_NOT_COMPLETED: "A completed entrance exam with a positive admission decision is required.",
  STUDENT_RECORD_MISSING: "The linked active student record is missing.",
  STUDENT_INACTIVE: "The linked student record is not active.",
  STUDENT_SCHOOL_MISMATCH: "The linked student belongs to another school.",
};

export type DocumentEligibilityApplication = {
  status: string;
  schoolId: string;
  studentUserId: string | null;
  entranceCompletedAt: Date | string | null;
  entranceResult: string | null;
  entranceStatus: string;
  admissionDecision?: string | null;
};

export type DocumentEligibilityStudent = {
  id: string;
  role: string;
  schoolId: string | null;
  isActive?: boolean;
};

/** Documents can be collected from approval onward; a student record only exists once enrolled. */
const DOCUMENT_ELIGIBLE_STATUSES = ["APPROVED", "FEE_PENDING", "DOCS_PENDING", "ENROLLED"];

export function documentEligibilityFor(
  app: DocumentEligibilityApplication,
  student: DocumentEligibilityStudent | null
): DocumentEligibility {
  const status = String(app.status || "").toUpperCase();
  if (!DOCUMENT_ELIGIBLE_STATUSES.includes(status)) {
    return { eligible: false, reason: "NOT_APPROVED_YET" };
  }
  const completed =
    app.entranceStatus === "COMPLETED" &&
    Boolean(app.entranceCompletedAt) &&
    ["SAT", "EXEMPT", "PASSED"].includes(String(app.entranceResult || "").toUpperCase());
  if (!completed) {
    return { eligible: false, reason: "ENTRANCE_NOT_COMPLETED" };
  }
  if (String(app.admissionDecision || "").toUpperCase() !== "ADMITTED") {
    return { eligible: false, reason: "ENTRANCE_NOT_COMPLETED" };
  }
  if (status !== "ENROLLED") return { eligible: true };
  if (!app.studentUserId || !student) {
    return { eligible: false, reason: "STUDENT_RECORD_MISSING" };
  }
  if (student.role !== "STUDENT") {
    return { eligible: false, reason: "STUDENT_RECORD_MISSING" };
  }
  if (student.schoolId !== app.schoolId) {
    return { eligible: false, reason: "STUDENT_SCHOOL_MISMATCH" };
  }
  if (student.isActive !== true) {
    return { eligible: false, reason: "STUDENT_INACTIVE" };
  }
  return { eligible: true };
}
