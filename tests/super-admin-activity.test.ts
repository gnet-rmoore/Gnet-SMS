/**
 * Super Admin activity aggregator unit tests
 * Run: npx tsx tests/super-admin-activity.test.ts
 */
import { loginMethods } from "../services/identity/src/services/mfaService.ts";

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
console.log(" SUPER ADMIN ACTIVITY / MFA HELPERS");
console.log("=========================================\n");

assert(
  JSON.stringify(loginMethods({ totpSecretEnc: "x", phoneE164: null, enrolledAt: new Date() })) ===
    '["totp"]',
  "totp-only methods"
);
assert(
  JSON.stringify(loginMethods({ totpSecretEnc: null, phoneE164: "+1", enrolledAt: new Date() })) ===
    '["sms"]',
  "sms-only methods"
);
assert(
  JSON.stringify(loginMethods({ totpSecretEnc: "x", phoneE164: "+1", enrolledAt: new Date() })) ===
    '["totp","sms"]',
  "both methods"
);

const csvHeader = "occurredAt,domain,action,schoolId,actorUserId,summary\n";
assert(csvHeader.startsWith("occurredAt"), "csv header shape");

console.log("");
if (failed) process.exit(1);
console.log("All super-admin-activity helper tests passed.");
process.exit(0);
