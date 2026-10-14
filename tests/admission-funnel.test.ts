/**
 * Admission funnel next-action resolver (Lifecycle).
 * Run: npx tsx tests/admission-funnel.test.ts
 */
import { nextActionFor, canEnrollNow } from "../services/lifecycle/src/domain/admissionFunnel.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

const noFee = {
  requireEntranceFee: false,
  requireClassroomOnEnroll: false,
  entranceFeeAmount: 0,
};
const withFee = {
  requireEntranceFee: true,
  requireClassroomOnEnroll: false,
  entranceFeeAmount: 50,
};
const withClass = {
  requireEntranceFee: false,
  requireClassroomOnEnroll: true,
  entranceFeeAmount: 0,
};

console.log("=========================================");
console.log(" Admission funnel next-action");
console.log("=========================================\n");

// PENDING → REVIEW
assert(nextActionFor({ status: "PENDING", policy: noFee }).action === "REVIEW", "PENDING → REVIEW");
// UNDER_REVIEW → APPROVE
assert(
  nextActionFor({ status: "UNDER_REVIEW", policy: noFee }).action === "APPROVE",
  "UNDER_REVIEW → APPROVE"
);
// WAITLISTED → APPROVE
assert(nextActionFor({ status: "WAITLISTED", policy: noFee }).action === "APPROVE", "WAITLISTED → APPROVE");

// APPROVED with fee required but no invoice yet → APPROVE (raises invoice), required
const appr = nextActionFor({ status: "APPROVED", policy: withFee });
assert(appr.action === "APPROVE" && appr.required === true, "APPROVED/no-invoice+required-fee → APPROVE (required)");

// APPROVED with fee invoice unpaid → PAY_FEE + blocked
const paidPending = nextActionFor({
  status: "APPROVED",
  feePaymentId: "fee1",
  fee: { id: "fee1", status: "PENDING", balance: 50 },
  policy: withFee,
});
assert(paidPending.action === "PAY_FEE", "APPROVED unpaid fee → PAY_FEE");
assert(paidPending.blockedBy.includes("FEE_REQUIRED"), "unpaid fee → blockedBy FEE_REQUIRED");

// APPROVED with fee paid → ENROLL
const feePaid = nextActionFor({
  status: "APPROVED",
  feePaymentId: "fee1",
  fee: { id: "fee1", status: "PAID", balance: 0 },
  policy: withFee,
});
assert(feePaid.action === "ENROLL", "APPROVED paid fee → ENROLL");
assert(feePaid.blockedBy.length === 0, "paid fee → no blockers");

// classroom required, none assigned → ASSIGN_CLASS
const classNeeded = nextActionFor({ status: "APPROVED", policy: withClass });
assert(classNeeded.action === "ASSIGN_CLASS", "class required → ASSIGN_CLASS");
assert(classNeeded.blockedBy.includes("CLASSROOM_REQUIRED"), "class required → blockedBy");

// classroom assigned → ENROLL
const classReady = nextActionFor({ status: "APPROVED", classroomId: "c1", policy: withClass });
assert(classReady.action === "ENROLL", "class assigned → ENROLL");

// FEE_PENDING unpaid → PAY_FEE
assert(
  nextActionFor({ status: "FEE_PENDING", feePaymentId: "f", fee: { status: "PARTIAL" }, policy: withFee }).action ===
    "PAY_FEE",
  "FEE_PENDING unpaid → PAY_FEE"
);
// FEE_PENDING paid → ENROLL
assert(
  nextActionFor({ status: "FEE_PENDING", feePaymentId: "f", fee: { status: "PAID" }, policy: withFee }).action ===
    "ENROLL",
  "FEE_PENDING paid → ENROLL"
);

// terminal states
assert(nextActionFor({ status: "ENROLLED", policy: noFee }).action === "DONE", "ENROLLED → DONE");
assert(nextActionFor({ status: "REJECTED", policy: noFee }).action === "REJECTED", "REJECTED → REJECTED");
assert(nextActionFor({ status: "WITHDRAWN", policy: noFee }).action === "WITHDRAWN", "WITHDRAWN → WITHDRAWN");

// unknown status falls back to REVIEW
assert(nextActionFor({ status: "SOMETHING", policy: noFee }).action === "REVIEW", "unknown → REVIEW");

// canEnrollNow only true when action ENROLL and status enrollable
assert(canEnrollNow({ status: "APPROVED", feePaymentId: "f", fee: { status: "PAID" }, policy: withFee }), "canEnrollNow APPROVED paid");
assert(!canEnrollNow({ status: "PENDING", policy: noFee }), "canEnrollNow PENDING false");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All admission-funnel tests passed");
