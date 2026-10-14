/**
 * Invoice amount reconciliation (Finance).
 * Run: npx tsx tests/fee-invoice-amounts.test.ts
 */
import { computeInvoiceAmounts, serializeFeeInvoice } from "../services/finance/src/lib/feePaymentMath.ts";

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
console.log(" Invoice amount reconciliation");
console.log("=========================================\n");

// only amount → no discount
const onlyAmount = computeInvoiceAmounts({ amount: 100 });
assert(onlyAmount.amount === 100, "only amount → net 100");
assert(onlyAmount.originalAmount === null, "only amount → original null");
assert(onlyAmount.discountPercent === null, "only amount → percent null");

// amount + percent wins
const pct = computeInvoiceAmounts({ amount: 100, discountPercent: 25 });
assert(pct.amount === 75, "amount+25% → net 75");
assert(pct.originalAmount === 100, "amount+25% → original 100");
assert(pct.discountPercent === 25, "amount+25% → percent 25");

// originalAmount as base with percent
const pctFromOriginal = computeInvoiceAmounts({ originalAmount: 200, discountPercent: 10 });
assert(pctFromOriginal.amount === 180, "original 200 -10% → net 180");
assert(pctFromOriginal.originalAmount === 200, "original 200 -10% → original 200");
assert(pctFromOriginal.discountPercent === 10, "original 200 -10% → percent 10");

// amount + originalAmount, no percent → derive percent
const derived = computeInvoiceAmounts({ amount: 90, originalAmount: 100 });
assert(derived.amount === 90, "90/100 → net 90");
assert(derived.originalAmount === 100, "90/100 → original 100");
assert(derived.discountPercent === 10, "90/100 → derived percent 10");

// only originalAmount → treated as net, no discount
const onlyOriginal = computeInvoiceAmounts({ originalAmount: 100 });
assert(onlyOriginal.amount === 100, "only original → net 100");
assert(onlyOriginal.originalAmount === null, "only original → original null");
assert(onlyOriginal.discountPercent === null, "only original → percent null");

// percent 0 → no discount
const zeroPct = computeInvoiceAmounts({ amount: 100, discountPercent: 0 });
assert(zeroPct.amount === 100, "amount+0% → net 100");
assert(zeroPct.originalAmount === null, "amount+0% → original null");
assert(zeroPct.discountPercent === null, "amount+0% → percent null");

// equal amount/original → no derived discount (not > )
const equal = computeInvoiceAmounts({ amount: 100, originalAmount: 100 });
assert(equal.amount === 100 && equal.originalAmount === null, "100/100 → no discount");

// string inputs coerce
const strings = computeInvoiceAmounts({ amount: "50", originalAmount: "100" });
assert(strings.amount === 50 && strings.discountPercent === 50, "string inputs derive 50%");

// invalid: percent without any base
let threwBase = false;
try {
  computeInvoiceAmounts({ discountPercent: 20 });
} catch (e: any) {
  threwBase = e.code === "FEE_DISCOUNT_BASE_REQUIRED";
}
assert(threwBase, "percent without base throws FEE_DISCOUNT_BASE_REQUIRED");

// invalid: non-positive net
let threwInvalid = false;
try {
  computeInvoiceAmounts({ amount: 0 });
} catch (e: any) {
  threwInvalid = e.code === "FEE_INVALID_AMOUNT";
}
assert(threwInvalid, "zero amount throws FEE_INVALID_AMOUNT");

// percent > 100 clamps to 100 → net 0 falls back to base
const clamped = computeInvoiceAmounts({ amount: 100, discountPercent: 150 });
assert(clamped.discountPercent === 100, ">100% clamps to 100");
assert(clamped.amount === 100, "100% discount floors to base (never zero)");

// serializeFeeInvoice exposes balance + receiptCount
const serialized = serializeFeeInvoice({ amount: 100, amountPaid: 40, status: "PARTIAL", receiptCount: 2 });
assert(serialized.balance === 60, "serialize balance");
assert(serialized.receiptCount === 2, "serialize receiptCount from field");
const serializedCount = serializeFeeInvoice({ amount: 100, amountPaid: 0, status: "PENDING", _count: { receipts: 3 } });
assert(serializedCount.receiptCount === 3, "serialize receiptCount from _count");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All invoice-amount tests passed");
