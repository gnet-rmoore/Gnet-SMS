/**
 * Server-owned enroll approval path (Lifecycle state machine).
 * Run: npx tsx tests/enroll-approval-path.test.ts
 */
import { resolveApprovalPath } from "../services/lifecycle/src/domain/admissionStates.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

console.log("=========================================");
console.log(" Enroll approval path");
console.log("=========================================\n");

// Already enrollable → no walk required.
for (const status of ["APPROVED", "FEE_PENDING", "DOCS_PENDING"]) {
  assert(eq(resolveApprovalPath(status), []), `${status} → [] (already enrollable)`);
}

// In-progress statuses → server walks to APPROVED.
assert(eq(resolveApprovalPath("PENDING"), ["UNDER_REVIEW", "APPROVED"]), "PENDING → [UNDER_REVIEW, APPROVED]");
assert(eq(resolveApprovalPath("UNDER_REVIEW"), ["APPROVED"]), "UNDER_REVIEW → [APPROVED]");
assert(eq(resolveApprovalPath("WAITLISTED"), ["APPROVED"]), "WAITLISTED → [APPROVED]");

// Terminal / non-auto statuses → no automatic path.
assert(resolveApprovalPath("REJECTED") === null, "REJECTED → null");
assert(resolveApprovalPath("WITHDRAWN") === null, "WITHDRAWN → null");
assert(resolveApprovalPath("ENROLLED") === null, "ENROLLED → null (terminal)");

// Unknown status → null (nothing we can safely do server-side).
assert(resolveApprovalPath("SOMETHING_ELSE") === null, "unknown → null");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All enroll-approval-path tests passed");
