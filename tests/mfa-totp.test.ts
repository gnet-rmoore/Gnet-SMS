/**
 * MFA TOTP unit tests
 * Run: npx tsx tests/mfa-totp.test.ts
 */
import {
  generateBase32Secret,
  totp,
  verifyTotp,
} from "../services/identity/src/lib/totp.ts";
import { encryptMfaSecret, decryptMfaSecret } from "../services/identity/src/lib/mfaCrypto.ts";
import {
  parseSecurityPolicy,
  serializeSecurityPolicy,
} from "../services/identity/src/lib/securityPolicy.ts";
import { mfaRequiredForUser } from "../services/identity/src/services/mfaService.ts";

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
console.log(" MFA TOTP TESTS");
console.log("=========================================\n");

const secret = generateBase32Secret();
assert(secret.length >= 16, "base32 secret generated");

const code = totp(secret);
assert(/^\d{6}$/.test(code), "totp returns 6 digits");
assert(verifyTotp(secret, code), "verify accepts current window");

const enc = encryptMfaSecret(secret);
assert(enc !== secret, "encrypted secret differs from plain");
assert(decryptMfaSecret(enc) === secret, "decrypt round-trip");

const policy = parseSecurityPolicy({
  mfaMode: "REQUIRED",
  mfaRequiredRoles: ["TEACHER"],
});
assert(policy.mfaMode === "REQUIRED", "parse mfaMode");
assert(
  serializeSecurityPolicy({ mfaMode: "OPTIONAL" }).includes('"mfaMode":"OPTIONAL"'),
  "serialize mfaMode"
);

assert(mfaRequiredForUser(policy, "TEACHER", false) === "enroll_required", "required + not enrolled");
assert(mfaRequiredForUser(policy, "TEACHER", true) === "challenge", "required + enrolled");
assert(mfaRequiredForUser(policy, "STUDENT", true) === "none", "student out of role scope");

const emptyRolesPolicy = parseSecurityPolicy({ mfaMode: "REQUIRED", mfaRequiredRoles: [] });
assert(
  mfaRequiredForUser(emptyRolesPolicy, "TEACHER", false) === "enroll_required",
  "required + empty roles defaults to staff"
);
assert(
  mfaRequiredForUser(emptyRolesPolicy, "STUDENT", false) === "none",
  "required + empty roles excludes students"
);

console.log("");
if (failed) {
  console.error(`${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("All MFA TOTP tests passed.");
process.exit(0);
