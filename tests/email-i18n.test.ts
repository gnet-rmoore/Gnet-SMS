/**
 * Identity email i18n helpers.
 * Run: npm run test:email-i18n
 */
import {
  resolveEmailLocale,
  tEmail,
} from "../services/identity/src/i18n/emailCatalogs.ts";

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
console.log(" EMAIL I18N UNIT TESTS");
console.log("=========================================\n");

const frConfirm = tEmail("fr", "registrationConfirm", { confirmUrl: "http://x" });
assert(
  frConfirm.subject.includes("Confirmez") && !frConfirm.subject.includes("Confirm your"),
  "tEmail('fr','registrationConfirm') subject is French (not English)"
);
assert(
  frConfirm.text.includes("http://x"),
  "tEmail interpolates confirmUrl"
);

assert(resolveEmailLocale("fr", "en") === "fr", "resolveEmailLocale('fr','en') === 'fr'");
assert(resolveEmailLocale(null, "ar") === "ar", "resolveEmailLocale(null,'ar') === 'ar'");
const frReset = tEmail("fr", "passwordReset", { name: "A", resetUrl: "http://x" });
assert(
  frReset.subject.includes("mot de passe") || frReset.subject.includes("Mot de passe"),
  "tEmail('fr','passwordReset') subject is French"
);

const enVerify = tEmail("en", "emailVerify", { name: "Sam", verifyUrl: "http://v" });
assert(enVerify.text.includes("http://v"), "tEmail emailVerify interpolates verifyUrl");

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll email-i18n tests passed.");
