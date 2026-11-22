export type DocumentEligibility =
  | { eligible: true }
  | {
      eligible: false;
      reason:
        | "NOT_ENROLLED"
        | "ENTRANCE_NOT_COMPLETED"
        | "STUDENT_RECORD_MISSING"
        | "STUDENT_INACTIVE"
        | "STUDENT_SCHOOL_MISMATCH";
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

export function documentEligibilityFor(
  app: DocumentEligibilityApplication,
  student: DocumentEligibilityStudent | null
): DocumentEligibility {
  if (String(app.status || "").toUpperCase() !== "ENROLLED") {
    return { eligible: false, reason: "NOT_ENROLLED" };
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
