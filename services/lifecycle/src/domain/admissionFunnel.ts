/**
 * Single source of truth for "what happens next" in the admission → enrollment funnel.
 *
 * Consumed by the services (next-action API, enroll orchestration) and mirrored to the
 * frontend so no UI re-implements the status machine. Pure — no Prisma, no IO.
 */
import { isEnrollableStatus } from "./admissionStates";
import type { AdmissionPolicy } from "./admissionPolicy";

export type OnboardingNextAction =
  | "REVIEW"
  | "APPROVE"
  | "PAY_FEE"
  | "WAIT_DOCS"
  | "ENROLL"
  | "ASSIGN_CLASS"
  | "DONE"
  | "REJECTED"
  | "WITHDRAWN";

export type OnboardingFeeInfo = {
  id?: string | null;
  status?: string | null;
  balance?: number | null;
} | null;

export type OnboardingNextStep = {
  action: OnboardingNextAction;
  /** Machine codes describing why the action is required (e.g. FEE_REQUIRED). */
  blockedBy: string[];
  /** True when the school's policy requires a specific step before enroll. */
  required: boolean;
};

export type NextActionInput = {
  status: string;
  feePaymentId?: string | null;
  classroomId?: string | null;
  fee?: OnboardingFeeInfo;
  policy: Pick<
    AdmissionPolicy,
    "requireEntranceFee" | "requireClassroomOnEnroll" | "entranceFeeAmount"
  >;
};

function feeIsPaid(fee: OnboardingFeeInfo, feePaymentId?: string | null): boolean {
  if (!feePaymentId) return false;
  if (!fee) return false;
  return String(fee.status || "").toUpperCase() === "PAID";
}

/**
 * Resolve the next action for an application. Never contradicts `assertTransition`:
 * a returned ENROLL/ASSIGN_CLASS action implies `isEnrollableStatus(status)`.
 */
export function nextActionFor(input: NextActionInput): OnboardingNextStep {
  const status = String(input.status || "PENDING").toUpperCase();
  const policy = input.policy;
  const feeRequired = Boolean(policy.requireEntranceFee && Number(policy.entranceFeeAmount) > 0);
  const feePaid = feeIsPaid(input.fee, input.feePaymentId);

  const blockedBy: string[] = [];
  if (feeRequired && !feePaid) blockedBy.push("FEE_REQUIRED");
  if (policy.requireClassroomOnEnroll && !input.classroomId) blockedBy.push("CLASSROOM_REQUIRED");

  const enrollStep = (): OnboardingNextStep => {
    if (policy.requireClassroomOnEnroll && !input.classroomId) {
      return { action: "ASSIGN_CLASS", blockedBy, required: true };
    }
    return { action: "ENROLL", blockedBy, required: feeRequired || Boolean(policy.requireClassroomOnEnroll) };
  };

  switch (status) {
    case "ENROLLED":
      return { action: "DONE", blockedBy: [], required: false };
    case "WITHDRAWN":
      return { action: "WITHDRAWN", blockedBy: [], required: false };
    case "REJECTED":
      return { action: "REJECTED", blockedBy: [], required: false };
    case "PENDING":
      return { action: "REVIEW", blockedBy, required: false };
    case "UNDER_REVIEW":
    case "WAITLISTED":
      return { action: "APPROVE", blockedBy, required: false };
    case "APPROVED":
      if (feeRequired && !input.feePaymentId) {
        // Approving auto-raises the entrance invoice; the fee then needs paying.
        return { action: "APPROVE", blockedBy, required: true };
      }
      if (feeRequired && !feePaid) {
        return { action: "PAY_FEE", blockedBy, required: true };
      }
      return enrollStep();
    case "FEE_PENDING":
      if (!feePaid) return { action: "PAY_FEE", blockedBy, required: feeRequired };
      return enrollStep();
    case "DOCS_PENDING":
      return enrollStep();
    default:
      // Unknown status: safest is to send staff to review.
      return { action: "REVIEW", blockedBy, required: false };
  }
}

/** Whether the application can be enrolled right now (gates clear). */
export function canEnrollNow(input: NextActionInput): boolean {
  const { action } = nextActionFor(input);
  return action === "ENROLL" && isEnrollableStatus(String(input.status || "").toUpperCase());
}
