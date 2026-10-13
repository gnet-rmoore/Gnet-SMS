/**
 * Official signature helpers + role allowlist.
 * Run: npx tsx tests/user-signature.test.ts
 */
import {
  getOfficialSignatureUrl,
  hasOfficialSignature,
} from "../src/lib/userSignature";
import { canManageOfficialSignature } from "../src/constants/roles";

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
console.log(" USER SIGNATURE UNIT TESTS");
console.log("=========================================\n");

assert(getOfficialSignatureUrl(null) === null, "null user → null url");
assert(getOfficialSignatureUrl({}) === null, "missing signature → null");
assert(
  getOfficialSignatureUrl({ signatureUrl: "https://cdn.example/sig.png" }) === null,
  "non-data URL rejected"
);
assert(
  getOfficialSignatureUrl({ signatureUrl: "  data:image/png;base64,abc  " }) ===
    "data:image/png;base64,abc",
  "trims data URL"
);
assert(hasOfficialSignature({ signatureUrl: "data:image/png;base64,x" }), "hasOfficialSignature true");
assert(!hasOfficialSignature({ signatureUrl: "" }), "empty → no signature");

assert(canManageOfficialSignature("SUPER_ADMIN"), "SUPER_ADMIN can manage");
assert(canManageOfficialSignature("SCHOOL_ADMIN"), "SCHOOL_ADMIN can manage");
assert(canManageOfficialSignature("PRINCIPAL"), "PRINCIPAL can manage");
assert(canManageOfficialSignature("REGISTRAR"), "REGISTRAR can manage");
assert(canManageOfficialSignature("VPA"), "VPA can manage");
assert(canManageOfficialSignature("VPI"), "VPI can manage");
assert(canManageOfficialSignature("ACCOUNTANT"), "ACCOUNTANT can manage");
assert(canManageOfficialSignature("NURSE"), "NURSE can manage");
assert(canManageOfficialSignature("TEACHER"), "TEACHER (staff) can manage");
assert(!canManageOfficialSignature("STUDENT"), "STUDENT cannot manage");
assert(!canManageOfficialSignature("PARENT"), "PARENT cannot manage");
assert(!canManageOfficialSignature(null), "null role cannot manage");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All user-signature tests passed");
