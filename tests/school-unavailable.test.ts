/**
 * Suspended-school redirect helpers.
 * Run: npx tsx tests/school-unavailable.test.ts
 */
import assert from "node:assert/strict";
import {
  buildSchoolUnavailableUrl,
  isSchoolLoginAllowed,
  SCHOOL_UNAVAILABLE_PATH,
} from "../src/lib/schoolUnavailable";

assert.equal(isSchoolLoginAllowed("ACTIVE"), true);
assert.equal(isSchoolLoginAllowed("TRIAL"), true);
assert.equal(isSchoolLoginAllowed("TRIAL", new Date(Date.now() - 86_400_000).toISOString()), false);
assert.equal(isSchoolLoginAllowed("SUSPENDED"), false);
assert.equal(isSchoolLoginAllowed("CLOSED"), false);

const url = buildSchoolUnavailableUrl({
  schoolStatus: "SUSPENDED",
  schoolName: "Demo High",
});
assert.ok(url.startsWith(SCHOOL_UNAVAILABLE_PATH));
assert.ok(url.includes("status=SUSPENDED"));
assert.ok(url.includes("name=Demo"));

console.log("school-unavailable: ok");
