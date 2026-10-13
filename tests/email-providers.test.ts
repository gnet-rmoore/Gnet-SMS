/**
 * Mail provider registry smoke tests.
 * Run: npm run test:email-providers
 */
import { MAIL_PROVIDERS, resolveMailProvider } from "../services/identity/src/lib/mailProviders/index.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

const prev = process.env.EMAIL_PROVIDER;

assert(MAIL_PROVIDERS.length === 6, "six providers including console");
assert(MAIL_PROVIDERS.includes("smtp"), "includes smtp");
assert(MAIL_PROVIDERS.includes("sendgrid"), "includes sendgrid");
assert(MAIL_PROVIDERS.includes("ses"), "includes ses");
assert(MAIL_PROVIDERS.includes("mailgun"), "includes mailgun");
assert(MAIL_PROVIDERS.includes("resend"), "includes resend");

process.env.EMAIL_PROVIDER = "sendgrid";
assert(resolveMailProvider().name === "sendgrid", "resolves sendgrid");

process.env.EMAIL_PROVIDER = "unknown";
assert(resolveMailProvider().name === "console", "unknown falls back to console");

process.env.EMAIL_PROVIDER = prev;

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll email-providers tests passed.");
