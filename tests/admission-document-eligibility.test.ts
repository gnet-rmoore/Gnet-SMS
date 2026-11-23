/**
 * Admission document eligibility contract.
 * Run: npx tsx tests/admission-document-eligibility.test.ts
 */
import { documentEligibilityFor } from "../services/lifecycle/src/domain/documentEligibility.ts";

let failed = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    failed++;
  } else {
    console.log(`PASSED: ${message}`);
  }
}

const baseApp = {
  status: "ENROLLED",
  schoolId: "school-1",
  studentUserId: "student-1",
  entranceCompletedAt: new Date("2026-11-21T10:00:00Z"),
  entranceResult: "SAT",
  entranceStatus: "COMPLETED",
  admissionDecision: "ADMITTED",
};

const activeStudent = {
  id: "student-1",
  role: "STUDENT",
  schoolId: "school-1",
  isActive: true,
};

console.log("=========================================");
console.log(" Admission document eligibility");
console.log("=========================================\n");

assert(documentEligibilityFor(baseApp, activeStudent).eligible, "enrolled, completed entrance, active same-school student is eligible");

for (const status of ["APPROVED", "FEE_PENDING", "DOCS_PENDING"]) {
  assert(
    documentEligibilityFor({ ...baseApp, status, studentUserId: null }, null).eligible,
    `${status} with completed entrance is eligible without a student record`
  );
}
const reason = documentEligibilityFor({ ...baseApp, status: "PENDING" }, activeStudent);
assert(!reason.eligible && reason.reason === "NOT_APPROVED_YET", "pre-approval status is not eligible (NOT_APPROVED_YET)");
assert(!documentEligibilityFor({ ...baseApp, status: "UNDER_REVIEW" }, activeStudent).eligible, "under review is not eligible");
assert(!documentEligibilityFor({ ...baseApp, status: "WAITLISTED" }, activeStudent).eligible, "waitlisted is not eligible");
assert(!documentEligibilityFor({ ...baseApp, entranceStatus: "BOOKED", entranceCompletedAt: null }, activeStudent).eligible, "booked entrance is not completion");
assert(!documentEligibilityFor({ ...baseApp, entranceCompletedAt: null }, activeStudent).eligible, "missing completion timestamp is not eligible");
assert(!documentEligibilityFor({ ...baseApp, entranceResult: "NOT_PASSED" }, activeStudent).eligible, "failed entrance is not eligible");
assert(!documentEligibilityFor({ ...baseApp, admissionDecision: "NOT_ADMITTED" }, activeStudent).eligible, "negative admission decision is not eligible");
assert(!documentEligibilityFor({ ...baseApp, status: "APPROVED", admissionDecision: "NOT_ADMITTED" }, null).eligible, "admission decision is still checked before enrollment");
assert(!documentEligibilityFor({ ...baseApp, studentUserId: null }, null).eligible, "missing student link is not eligible");
assert(!documentEligibilityFor(baseApp, { ...activeStudent, isActive: false }).eligible, "inactive student is not eligible");
assert(!documentEligibilityFor(baseApp, { ...activeStudent, schoolId: "school-2" }).eligible, "student in another school is not eligible");
assert(!documentEligibilityFor(baseApp, { ...activeStudent, role: "PARENT" }).eligible, "non-student identity is not eligible");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All admission-document-eligibility tests passed");
