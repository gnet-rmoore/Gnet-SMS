/**
 * Class organization type helpers.
 * Run: npx tsx tests/class-organization.test.ts
 */
import {
  inferOrganizationType,
  isOrganizationType,
  normalizeOrganizationType,
  resolveOrganizationType,
} from "../services/classroom/src/lib/organizationTypes.ts";

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
console.log(" CLASS ORGANIZATION TESTS");
console.log("=========================================\n");

assert(isOrganizationType("SELF_CONTAINED"), "SELF_CONTAINED valid");
assert(isOrganizationType("DEPARTMENTALIZED"), "DEPARTMENTALIZED valid");
assert(isOrganizationType("MIXED"), "MIXED valid");
assert(!isOrganizationType("PLATOON"), "PLATOON not a stored enum");
assert(normalizeOrganizationType("SELF_CONTAINED") === "SELF_CONTAINED", "normalize known");
assert(normalizeOrganizationType("nope", "MIXED") === "MIXED", "normalize fallback");

assert(
  inferOrganizationType("t1", []) === "SELF_CONTAINED",
  "no subject rooms → self-contained"
);
assert(
  inferOrganizationType("t1", ["t1", "t1"]) === "SELF_CONTAINED",
  "all same teacher → self-contained"
);
assert(
  inferOrganizationType("t1", ["t2", "t3"]) === "DEPARTMENTALIZED",
  "all different → departmentalized"
);
assert(
  inferOrganizationType("t1", ["t1", "t2"]) === "MIXED",
  "partial override → mixed"
);

assert(
  resolveOrganizationType("DEPARTMENTALIZED", "t1", ["t1", "t1"]) === "DEPARTMENTALIZED",
  "stored type wins over inference"
);
assert(
  resolveOrganizationType(null, "t1", ["t2"]) === "DEPARTMENTALIZED",
  "null stored → infer"
);

console.log("");
if (failed) {
  console.error(`${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("All class organization tests passed");
process.exit(0);
