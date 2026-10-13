/**
 * Email auth token helpers (no DB).
 * Run: npm run test:email-auth
 */
import { hashToken, generateRawToken } from "../services/identity/src/lib/mailer.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

const raw = generateRawToken(16);
assert(raw.length >= 32, "generateRawToken length");
assert(hashToken(raw) === hashToken(raw), "hashToken stable");
assert(hashToken(raw) !== hashToken(generateRawToken(16)), "hashToken unique per token");

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll email-auth tests passed.");
