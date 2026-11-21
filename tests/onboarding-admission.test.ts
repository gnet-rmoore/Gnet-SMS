/**
 * Unit tests for onboarding + admission domain logic (no DB).
 * Run: npm run test:onboarding
 */
import {
  assertTransition,
  generateApplicationNumber,
} from "../services/lifecycle/src/domain/admissionStates";
import { isEntranceSlotWithinPolicy } from "../services/lifecycle/src/domain/admissionPolicy";
import { normalizeParentEmails } from "../services/lifecycle/src/lib/applicationEmail";
import { isSchoolLoginAllowed } from "../services/identity/src/domain/schoolStatus";
import { hashToken, generateRawToken } from "../services/identity/src/lib/mailer";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    failed++;
  } else {
    console.log(`PASSED: ${message}`);
  }
}

function expectThrow(fn: () => void, message: string) {
  try {
    fn();
    console.error(`FAILED: ${message} (expected throw)`);
    failed++;
  } catch {
    console.log(`PASSED: ${message}`);
  }
}

console.log("=========================================");
console.log(" ONBOARDING & ADMISSION UNIT TESTS       ");
console.log("=========================================\n");

console.log("[School login status]");
assert(isSchoolLoginAllowed("ACTIVE") === true, "ACTIVE school can login");
assert(isSchoolLoginAllowed("TRIAL") === true, "TRIAL school can login");
assert(isSchoolLoginAllowed("SUSPENDED") === false, "SUSPENDED school blocked");
assert(isSchoolLoginAllowed("CLOSED") === false, "CLOSED school blocked");
assert(isSchoolLoginAllowed("DRAFT") === false, "DRAFT school blocked");
assert(isSchoolLoginAllowed("PENDING_REVIEW") === false, "PENDING_REVIEW blocked");
assert(isSchoolLoginAllowed(null) === true, "null status allowed (legacy)");

console.log("\n[Invite token hashing]");
const raw = generateRawToken(16);
const h1 = hashToken(raw);
const h2 = hashToken(raw);
assert(h1 === h2, "hashToken is deterministic");
assert(h1 !== raw, "hashToken does not equal raw token");
assert(h1.length === 64, "sha256 hex length is 64");

console.log("\n[Admission state machine]");
assertTransition("PENDING", "UNDER_REVIEW");
assert(true, "PENDING → UNDER_REVIEW allowed");
assertTransition("UNDER_REVIEW", "APPROVED");
assert(true, "UNDER_REVIEW → APPROVED allowed");
assertTransition("APPROVED", "FEE_PENDING");
assert(true, "APPROVED → FEE_PENDING allowed");
assertTransition("APPROVED", "ENROLLED");
assert(true, "APPROVED → ENROLLED allowed");
assertTransition("FEE_PENDING", "ENROLLED");
assert(true, "FEE_PENDING → ENROLLED allowed");
assertTransition("PENDING", "PENDING");
assert(true, "same status is no-op");

expectThrow(() => assertTransition("PENDING", "ENROLLED"), "PENDING → ENROLLED blocked");
expectThrow(() => assertTransition("ENROLLED", "APPROVED"), "ENROLLED is terminal");
expectThrow(() => assertTransition("WITHDRAWN", "PENDING"), "WITHDRAWN is terminal");
expectThrow(() => assertTransition("REJECTED", "ENROLLED"), "REJECTED → ENROLLED blocked");
expectThrow(() => assertTransition("UNDER_REVIEW", "ENROLLED"), "UNDER_REVIEW → ENROLLED blocked");

console.log("\n[Admission policy helpers]");
const {
  parseAdmissionPolicy,
  isEnrollableStatus,
  DEFAULT_ADMISSION_POLICY,
} = await import("../services/lifecycle/src/domain/admissionPolicy.ts");

assert(isEnrollableStatus("APPROVED") === true, "APPROVED is enrollable");
assert(isEnrollableStatus("FEE_PENDING") === true, "FEE_PENDING is enrollable");
assert(isEnrollableStatus("DOCS_PENDING") === true, "DOCS_PENDING is enrollable");
assert(isEnrollableStatus("UNDER_REVIEW") === false, "UNDER_REVIEW not enrollable");
assert(isEnrollableStatus("PENDING") === false, "PENDING not enrollable");

const merged = parseAdmissionPolicy(
  JSON.stringify({ requireEntranceFee: true, entranceFeeAmount: 50 })
);
assert(merged.requireEntranceFee === true, "policy merges requireEntranceFee");
assert(merged.entranceFeeAmount === 50, "policy merges entranceFeeAmount");
assert(
  merged.publicApplyEnabled === DEFAULT_ADMISSION_POLICY.publicApplyEnabled,
  "policy keeps default publicApplyEnabled"
);
assert(
  Array.isArray(merged.requiredDocTypes) && merged.requiredDocTypes.length === 0,
  "policy keeps documents optional (empty requiredDocTypes)"
);

console.log("\n[Reference numbers and parent contacts]");
const refA = generateApplicationNumber("11111111-1111-1111-1111-111111111111");
const refB = generateApplicationNumber("11111111-1111-1111-1111-111111111111");
assert(refA !== refB, "reference numbers are high-entropy and unique");
assert(refA.startsWith("APP-1111-"), "reference number includes a school prefix");
const contacts = normalizeParentEmails(
  [
    { email: "Father@Example.com", role: "FATHER" },
    { email: "mother@example.com", role: "MOTHER" },
  ],
  "other@example.com"
);
assert(contacts.length === 2, "parent contact list keeps father and mother emails");
assert(contacts[0].role === "FATHER", "parent contacts preserve roles");

const entrancePolicy = parseAdmissionPolicy(
  JSON.stringify({
    entranceSchedulingEnabled: true,
    entranceSlots: [{ id: "slot-1", startAt: "2026-12-01T09:00:00Z", endAt: "2026-12-01T09:30:00Z", capacity: 2 }],
    entranceRescheduleCutoffHours: 12,
  })
);
assert(entrancePolicy.entranceSchedulingEnabled === true, "entrance scheduling parses");
assert(entrancePolicy.entranceSlots.length === 1, "entrance slots parse");
assert(entrancePolicy.entranceRescheduleCutoffHours === 12, "reschedule cutoff parses");

const availabilityPolicy = parseAdmissionPolicy({
  entranceSchedulingEnabled: true,
  entranceAvailableFrom: "2026-11-01",
  entranceAvailableTo: "2026-11-30",
  entranceAvailableWeekdays: [1, 2, 3, 4, 5],
  entranceAvailabilityNote: "Monday to Friday only.",
});
assert(availabilityPolicy.entranceAvailabilityNote === "Monday to Friday only.", "availability note parses");
assert(
  isEntranceSlotWithinPolicy(availabilityPolicy, { startAt: "2026-11-22T09:00:00Z" }) === false,
  "Sunday slots are rejected"
);
assert(
  isEntranceSlotWithinPolicy(availabilityPolicy, { startAt: "2026-11-23T09:00:00Z" }) === true,
  "Monday slots inside the range are accepted"
);
assert(
  isEntranceSlotWithinPolicy(availabilityPolicy, { startAt: "2026-12-01T09:00:00Z" }) === false,
  "slots outside the date range are rejected"
);

console.log("\n=========================================");
if (failed > 0) {
  console.error(` ${failed} TEST(S) FAILED`);
  process.exit(1);
}
console.log(" ALL ONBOARDING/ADMISSION TESTS PASSED");
console.log("=========================================");
