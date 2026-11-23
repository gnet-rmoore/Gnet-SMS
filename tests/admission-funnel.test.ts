/**
 * Admission funnel next-action resolver (Lifecycle).
 * Run: npx tsx tests/admission-funnel.test.ts
 */
import { nextActionFor, canEnrollNow } from "../services/lifecycle/src/domain/admissionFunnel.ts";
import { requiresEntranceFee } from "../services/lifecycle/src/domain/admissionPolicy.ts";
import {
  resolveEntranceFee,
  resolveOrCreateEntranceFee,
} from "../services/lifecycle/src/lib/financeClient.ts";

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

console.log("\n[Entrance fee gate]");
assert(requiresEntranceFee(withFee) === true, "flag enables the fee gate");
assert(requiresEntranceFee({ requireEntranceFee: false, entranceFeeAmount: 50 }) === false, "amount alone does not enable the gate");
assert(requiresEntranceFee({ entranceFeeAmount: 50 } as any) === true, "amount is a fallback when flag is absent");
const zeroAmountFee = { requireEntranceFee: true, requireClassroomOnEnroll: false, entranceFeeAmount: 0 };
const zeroAmountAppr = nextActionFor({ status: "APPROVED", policy: zeroAmountFee });
assert(zeroAmountAppr.action === "APPROVE" && zeroAmountAppr.blockedBy.includes("FEE_REQUIRED"), "requireEntranceFee gates even with amount 0");
assert(!nextActionFor({ status: "APPROVED", policy: { ...withFee, requireEntranceFee: false } }).blockedBy.includes("FEE_REQUIRED"), "disabling the flag clears the gate");

console.log("\n[Entrance fee resolver]");
const originalFetch = globalThis.fetch;
const feeCalls: Array<{ url: string; body: any }> = [];
let nextFeeResponse: any = { applied: true, fee: { id: "resolved-fee" } };
(globalThis as any).fetch = async (input: any, init: any) => {
  const url = String(input);
  feeCalls.push({ url, body: JSON.parse(init?.body || "{}") });
  return {
    ok: true,
    status: 200,
    json: async () => (url.endsWith("/api/internal/fees") ? { id: "flat-fee" } : nextFeeResponse),
    text: async () => "",
  };
};

try {
  const feeInput = {
    schoolId: "school-1",
    applicationId: "app-1",
    gradeLevelId: "grade-1",
    classroomId: "room-1",
    cohort: "RETURNING",
  };
  const resolution = await resolveEntranceFee(feeInput);
  assert(resolution.fee?.id === "resolved-fee", "resolver returns the Finance fee");
  assert(feeCalls[0].url.endsWith("/api/internal/entrance-fees/resolve"), "resolver posts to entrance-fees/resolve");
  assert(
    feeCalls[0].body.applicationId === "app-1" && feeCalls[0].body.cohort === "RETURNING",
    "resolver body carries application and cohort context"
  );

  feeCalls.length = 0;
  const applied = await resolveOrCreateEntranceFee({ ...feeInput, amount: 50 });
  assert(applied?.id === "resolved-fee" && feeCalls.length === 1, "applied fee skips flat fee creation");

  feeCalls.length = 0;
  nextFeeResponse = { applied: false, reason: "EXISTING", fee: { id: "existing-fee" } };
  const existing = await resolveOrCreateEntranceFee({ ...feeInput, amount: 50 });
  assert(existing?.id === "existing-fee" && feeCalls.length === 1, "existing fee is reused without flat creation");

  feeCalls.length = 0;
  nextFeeResponse = { applied: false, reason: "NO_TEMPLATE" };
  const skipped = await resolveOrCreateEntranceFee(feeInput);
  assert(skipped === null && feeCalls.length === 1, "NO_TEMPLATE skips billing without an explicit amount");

  feeCalls.length = 0;
  nextFeeResponse = { applied: false, reason: "DISABLED" };
  const flat = await resolveOrCreateEntranceFee({ ...feeInput, studentId: null, amount: 50 });
  assert(flat?.id === "flat-fee" && feeCalls.length === 2, "explicit amount falls back to a flat fee");
  assert(feeCalls[1].url.endsWith("/api/internal/fees") && feeCalls[1].body.studentId === "application:app-1", "flat fee keeps the placeholder student");
} finally {
  (globalThis as any).fetch = originalFetch;
}

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All admission-funnel tests passed");
