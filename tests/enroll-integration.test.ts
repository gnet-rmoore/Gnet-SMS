/**
 * Cross-service enroll orchestration tests (mocked HTTP clients).
 * Run: npm run test:enroll
 */
import { assertTransition } from "../services/lifecycle/src/domain/admissionStates";
import { assertAllowedMime, storageConfigured } from "../services/lifecycle/src/lib/storageMime";
import { stripeEnabled, createEntranceCheckout, resolveConsoleSession } from "../services/finance/src/lib/stripeCheckout";

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

function expectThrow(fn: () => void, msg: string) {
  try {
    fn();
    console.error(`FAILED: ${msg}`);
    failed++;
  } catch {
    console.log(`PASSED: ${msg}`);
  }
}

console.log("=========================================");
console.log(" ENROLL / CHECKOUT / STORAGE UNIT TESTS  ");
console.log("=========================================\n");

console.log("[State machine for enroll path]");
assertTransition("UNDER_REVIEW", "WAITLISTED");
assert(true, "UNDER_REVIEW → WAITLISTED");
assertTransition("WAITLISTED", "APPROVED");
assert(true, "WAITLISTED → APPROVED");
assertTransition("APPROVED", "FEE_PENDING");
assert(true, "APPROVED → FEE_PENDING");
assertTransition("FEE_PENDING", "DOCS_PENDING");
assert(true, "FEE_PENDING → DOCS_PENDING");
assertTransition("DOCS_PENDING", "ENROLLED");
assert(true, "DOCS_PENDING → ENROLLED");

console.log("\n[MIME allowlist]");
assertAllowedMime("application/pdf");
assert(true, "pdf allowed");
assertAllowedMime("image/jpeg");
assert(true, "jpeg allowed");
expectThrow(() => assertAllowedMime("application/x-msdownload"), "exe blocked");

console.log("\n[Storage]");
assert(typeof storageConfigured() === "boolean", "storageConfigured returns boolean");

console.log("\n[Stripe console checkout]");
assert(stripeEnabled() === false || stripeEnabled() === true, "stripeEnabled is boolean");

const session = await createEntranceCheckout({
  feeId: "fee-test-1",
  amount: 100,
  successUrl: "http://localhost/ok",
  cancelUrl: "http://localhost/cancel",
});
assert(session.provider === "console" || session.provider === "stripe", "checkout has provider");
assert(Boolean(session.url), "checkout has url");
assert(Boolean(session.id), "checkout has id");

if (session.provider === "console") {
  const resolved = resolveConsoleSession(session.id);
  assert(resolved?.feeId === "fee-test-1", "console session resolves to feeId");
  assert(resolved?.amount === 100, "console session stores amount");
  assert(resolveConsoleSession(session.id) === null, "console session is single-use");
}

console.log("\n[Funnel / CSV / rate limit]");
const {
  countByStatus,
  applicationsToCsv,
  allowPublicApply,
  _resetPublicApplyRateLimit,
} = await import("../services/lifecycle/src/domain/admissionReporting");

const funnel = countByStatus([
  { status: "PENDING" },
  { status: "PENDING" },
  { status: "WAITLISTED" },
  { status: "ENROLLED" },
]);
assert(funnel.PENDING === 2, "funnel pending count");
assert(funnel.WAITLISTED === 1, "funnel waitlisted count");
assert(funnel.ENROLLED === 1, "funnel enrolled count");

const csv = applicationsToCsv([
  {
    applicationNumber: "APP-1",
    studentName: "Ada, Lovelace",
    parentName: "Parent",
    status: "PENDING",
    appliedAt: "2026-01-01T00:00:00.000Z",
  },
]);
assert(csv.includes("Application #"), "csv has header");
assert(csv.includes('"Ada, Lovelace"'), "csv escapes commas");

_resetPublicApplyRateLimit();
for (let i = 0; i < 15; i++) assert(allowPublicApply("test-ip"), `rate allow ${i}`);
assert(allowPublicApply("test-ip") === false, "rate limit trips at 16");

console.log("\n=========================================");
if (failed) {
  console.error(` ${failed} FAILED`);
  process.exit(1);
}
console.log(" ALL ENROLL/CHECKOUT/STORAGE TESTS PASSED");
console.log("=========================================");
