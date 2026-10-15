/**
 * Pure rules deciding whether a student may start an online attempt.
 * Kept dependency-free for unit testing; the service maps the result to HTTP errors.
 */

export type PaperStartDecision =
  | { ok: true; code?: undefined; message?: undefined }
  | { ok: false; code: string; message: string };

export function evaluatePaperStart(input: {
  /** Denormalized Exam.paperStatus */
  paperStatus: string;
  /** Latest ExamPaperPackage.status, or null when no package exists */
  latestPackageStatus: string | null;
  /** Exam.deliveryMode */
  deliveryMode: string;
  /** Student leg for HYBRID exams (ONLINE | OFFLINE); ignored otherwise */
  leg?: string;
}): PaperStartDecision {
  if (input.paperStatus !== "APPROVED") {
    return { ok: false, code: "PAPER_NOT_APPROVED", message: "Exam paper is not approved yet" };
  }
  // Strict: the latest package itself must be APPROVED (guards denorm drift).
  if (input.latestPackageStatus && input.latestPackageStatus !== "APPROVED") {
    return {
      ok: false,
      code: "PAPER_NOT_APPROVED",
      message: "Exam paper is not approved yet",
    };
  }
  if (input.deliveryMode === "OFFLINE") {
    return { ok: false, code: "OFFLINE_ONLY", message: "This exam is offline-only" };
  }
  if (input.deliveryMode === "HYBRID" && input.leg !== "ONLINE") {
    return {
      ok: false,
      code: "HYBRID_OFFLINE_LEG",
      message: "You are assigned to the offline leg of this hybrid exam",
    };
  }
  return { ok: true };
}
