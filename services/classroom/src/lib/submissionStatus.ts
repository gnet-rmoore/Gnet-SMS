/** Classroom assignment submission statuses (MVP). */
export const SUBMISSION_STATUS = {
  SUBMITTED: "SUBMITTED",
  RETURNED: "RETURNED",
  REOPENED: "REOPENED",
} as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];

export function canStudentEditSubmission(status: string | null | undefined): boolean {
  if (!status) return true;
  return status === SUBMISSION_STATUS.SUBMITTED || status === SUBMISSION_STATUS.REOPENED;
}

export function normalizePostType(type: string | undefined): string {
  const t = (type || "ANNOUNCEMENT").toUpperCase();
  if (["ANNOUNCEMENT", "ASSIGNMENT", "MATERIAL"].includes(t)) return t;
  return "ANNOUNCEMENT";
}
