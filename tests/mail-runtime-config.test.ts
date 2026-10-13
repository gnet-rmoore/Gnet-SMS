/**
 * Mail runtime config helpers (no DB).
 * Run: npm run test:mail-runtime-config
 */
import {
  maskSecret,
  parseEmailSecrets,
} from "../services/identity/src/lib/mailRuntimeConfig.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

assert(maskSecret("sg_abcdefghijklmnop") === "********mnop", "maskSecret keeps suffix");
assert(maskSecret("abc") === "****", "maskSecret short value");
assert(Object.keys(parseEmailSecrets('{"sendgridApiKey":"x"}')).length === 1, "parseEmailSecrets");
assert(Object.keys(parseEmailSecrets("")).length === 0, "parseEmailSecrets empty");

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll mail-runtime-config tests passed.");
