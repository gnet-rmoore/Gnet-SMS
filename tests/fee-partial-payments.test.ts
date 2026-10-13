/**
 * Fee partial / installment balance helpers (Finance).
 * Run: npx tsx tests/fee-partial-payments.test.ts
 */
import {
  assertMinPaymentAmount,
  effectiveAmountPaid,
  invoiceBalance,
  normalizePaymentMethod,
  roundMoney,
  serializeFeeInvoice,
  statusFromBalances,
} from "../services/finance/src/lib/feePaymentMath.ts";

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
console.log(" FEE PARTIAL PAYMENTS UNIT TESTS");
console.log("=========================================\n");

assert(roundMoney(20.005) === 20.01, "roundMoney cents");
assert(invoiceBalance(150, 20) === 130, "balance after $20 of $150");
assert(invoiceBalance(150, 150) === 0, "zero balance when paid");
assert(invoiceBalance(150, 40, "WRITTEN_OFF") === 0, "WRITTEN_OFF balance 0");
assert(statusFromBalances(150, 0) === "PENDING", "PENDING when unpaid");
assert(statusFromBalances(150, 20) === "PARTIAL", "PARTIAL when some paid");
assert(statusFromBalances(150, 150) === "PAID", "PAID when settled");
assert(statusFromBalances(150, 0, "VOIDED") === "VOIDED", "VOIDED preserved");
assert(
  effectiveAmountPaid({ amount: 100, amountPaid: 0, status: "PAID" }) === 100,
  "legacy PAID treats amountPaid as full amount"
);
assert(
  effectiveAmountPaid({ amount: 100, amountPaid: 40, status: "PARTIAL" }) === 40,
  "effectiveAmountPaid for PARTIAL"
);
assert(normalizePaymentMethod("cash") === "CASH", "normalize CASH");
assert(normalizePaymentMethod("weird") === "OTHER", "unknown method → OTHER");

let threw = false;
try {
  assertMinPaymentAmount(0.5, 100, 1);
} catch (e: any) {
  threw = e?.code === "FEE_PAYMENT_BELOW_MINIMUM";
}
assert(threw, "below minimum rejected");
try {
  assertMinPaymentAmount(0.5, 0.5, 1);
  assert(true, "full remaining balance allowed below min");
} catch {
  assert(false, "full remaining balance allowed below min");
}

const ser = serializeFeeInvoice({ amount: 150, amountPaid: 40, status: "PARTIAL" });
assert(ser.balance === 110, "serializeFeeInvoice balance");
assert(ser.amountPaid === 40, "serializeFeeInvoice amountPaid");
assert(
  serializeFeeInvoice({ amount: 150, amountPaid: 40, status: "WRITTEN_OFF" }).balance === 0,
  "WRITTEN_OFF serialize balance 0"
);

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll fee-partial-payments tests passed.");
