/**
 * Admission policy / public apply helpers.
 * Run: npx tsx tests/public-apply-policy.test.ts
 */
import {
  parseAdmissionPolicy,
  applicantTypeFromNotes,
  DEFAULT_ADMISSION_POLICY,
} from "../services/lifecycle/src/domain/admissionPolicy.ts";
import {
  parseAdmissionPolicy as parseIdentityPolicy,
  mergeAdmissionPolicy,
} from "../services/identity/src/lib/admissionPolicy.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

console.log("=========================================");
console.log(" PUBLIC APPLY POLICY TESTS");
console.log("=========================================\n");

const d = parseAdmissionPolicy(null);
assert(d.publicApplyEnabled === true, "default public apply on");
assert(d.returningApplyEnabled === true, "default returning apply on");

const off = parseAdmissionPolicy({ publicApplyEnabled: false, returningApplyEnabled: false });
assert(off.publicApplyEnabled === false, "can disable public apply");
assert(off.returningApplyEnabled === false, "can disable returning");

assert(applicantTypeFromNotes(null) === "NEW", "notes null → NEW");
assert(
  applicantTypeFromNotes(JSON.stringify({ applicantType: "RETURNING" })) === "RETURNING",
  "notes RETURNING"
);

const merged = mergeAdmissionPolicy(null, { publicApplyEnabled: false });
const parsed = parseIdentityPolicy(merged);
assert(parsed.publicApplyEnabled === false, "identity merge disables public");
assert(parsed.returningApplyEnabled === DEFAULT_ADMISSION_POLICY.returningApplyEnabled, "merge keeps returning default");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All public-apply-policy tests passed");
