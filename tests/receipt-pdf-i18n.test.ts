/**
 * Receipt PDF i18n catalog helpers.
 * Run: npx tsx tests/receipt-pdf-i18n.test.ts
 */
import {
  receiptChrome,
  resolveReceiptLocale,
  tReceipt,
} from "../services/finance/src/i18n/receiptChrome.ts";

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
console.log(" RECEIPT PDF I18N UNIT TESTS");
console.log("=========================================\n");

const enTitle = tReceipt("en", "officialFeeReceipt");
const frTitle = tReceipt("fr", "officialFeeReceipt");
assert(enTitle !== frTitle, "French officialFeeReceipt differs from English");
assert(enTitle === "Official Fee Receipt", "English officialFeeReceipt");
assert(frTitle === "Reçu officiel de frais", "French officialFeeReceipt");

const arParties = tReceipt("ar", "parties");
assert(arParties.length > 0, "Arabic parties string non-empty");
assert(arParties === "الأطراف", "Arabic parties label");

assert(resolveReceiptLocale("fr") === "fr", "resolveReceiptLocale fr");
assert(resolveReceiptLocale(null) === "en", "resolveReceiptLocale fallback en");
assert(resolveReceiptLocale("zh-CN") === "zh-Hans", "resolveReceiptLocale zh-CN");

const { t: tDe } = receiptChrome("de");
assert(tDe("verifyAuthenticity") === "Echtheit prüfen", "receiptChrome de helper");

assert(
  tReceipt("es", "receiptNumber", { number: "ABC-1" }) === "Recibo ABC-1",
  "Spanish receiptNumber interpolation"
);

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll receipt-pdf-i18n tests passed.");
