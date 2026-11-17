/**
 * Receipt template context + HTML builder tests.
 * Run: npx tsx tests/receipt-context.test.ts
 */
import {
  buildReceiptContext,
  monroviaAcademySampleInput,
  sampleInputForReceiptTemplate,
} from "../services/finance/src/lib/receiptContext.ts";
import { renderReceiptHtml } from "../services/finance/src/lib/receiptHtmlBuilder.ts";
import {
  RECEIPT_TEMPLATE_IDS,
  DEFAULT_RECEIPT_TEMPLATES,
  resolveReceiptTemplateId,
  resolveReceiptTemplateForType,
  resolveReceiptTemplateForIssue,
  parseReceiptTemplatesByRole,
  mergeReceiptTemplates,
} from "../services/finance/src/lib/receiptTemplateRegistry.ts";
import {
  mergeReceiptTemplates as mergeIdentity,
  mergeRoleReceiptTemplates,
  parseReceiptTemplatesByRole as parseIdentityByRole,
} from "../services/identity/src/lib/receiptTemplates.ts";
import { isKnownReceiptTemplateId } from "../services/identity/src/lib/receiptTemplateIds.ts";
import { previewLogoQueryParam } from "../src/features/receipts/registry.ts";

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
console.log(" RECEIPT TEMPLATE CONTEXT TESTS");
console.log("=========================================\n");

assert(resolveReceiptTemplateId("fee-official-receipt") === "FEE_OFFICIAL_RECEIPT", "kebab id resolves");
assert(resolveReceiptTemplateId(null) === "FEE_OFFICIAL_RECEIPT", "default template");
assert(resolveReceiptTemplateId("MINIMAL_LINE") === "FEE_OFFICIAL_RECEIPT", "removed id falls back");
assert(resolveReceiptTemplateId("BORDERED_FORMAL") === "FEE_OFFICIAL_RECEIPT", "unknown id falls back");
assert(RECEIPT_TEMPLATE_IDS.length === 6, "six templates registered");
assert(DEFAULT_RECEIPT_TEMPLATES.FEE_PAYMENT === "FEE_OFFICIAL_RECEIPT", "fee default");
assert(DEFAULT_RECEIPT_TEMPLATES.PAYSLIP === "PAYSLIP_EARNINGS_DEDUCTIONS", "payslip default");
assert(DEFAULT_RECEIPT_TEMPLATES.EXPENSE === "EXPENSE_EXECUTIVE_VOUCHER", "expense default");
assert(!isKnownReceiptTemplateId("COMPACT_GRID"), "identity rejects cleared template ids");
assert(isKnownReceiptTemplateId("PAYSLIP_NET_PAY_HERO"), "identity accepts new template ids");
assert(previewLogoQueryParam("data:image/png;base64,abc") === undefined, "data URL omitted from preview query");
assert(previewLogoQueryParam("https://cdn.example/logo.png") === "https://cdn.example/logo.png", "http logo kept");
assert(
  resolveReceiptTemplateForType("PAYSLIP", { PAYSLIP: "PAYSLIP_NET_PAY_HERO" }, "MINIMAL_LINE") ===
    "PAYSLIP_NET_PAY_HERO",
  "payslip uses per-type template"
);
assert(
  resolveReceiptTemplateForType("FEE_PAYMENT", { PAYSLIP: "PAYSLIP_NET_PAY_HERO" }, "MINIMAL_LINE") ===
    "FEE_OFFICIAL_RECEIPT",
  "fee falls back to category default, not the legacy cleared id"
);
const perType = mergeIdentity({ FEE_PAYMENT: "FEE_PAYMENT_CONFIRMATION" }, "MINIMAL_LINE");
assert(
  perType.FEE_PAYMENT === "FEE_PAYMENT_CONFIRMATION" && perType.PAYSLIP === "PAYSLIP_EARNINGS_DEDUCTIONS",
  "merge keeps unset types on category defaults"
);
assert(
  mergeReceiptTemplates({ PAYSLIP: "PAYSLIP_NET_PAY_HERO" }, "MINIMAL_LINE").PAYSLIP ===
    "PAYSLIP_NET_PAY_HERO",
  "finance merge partial type"
);

const registrarBucket = mergeRoleReceiptTemplates({}, "REGISTRAR", {
  FEE_PAYMENT: "FEE_PAYMENT_CONFIRMATION",
});
const accountantBucket = mergeRoleReceiptTemplates(registrarBucket, "ACCOUNTANT", {
  PAYSLIP: "PAYSLIP_NET_PAY_HERO",
});
assert(
  resolveReceiptTemplateForIssue("FEE_PAYMENT", accountantBucket, null, "MINIMAL_LINE") ===
    "FEE_PAYMENT_CONFIRMATION",
  "fee receipt uses registrar bucket"
);
assert(
  resolveReceiptTemplateForIssue("PAYSLIP", accountantBucket, null, "MINIMAL_LINE") ===
    "PAYSLIP_NET_PAY_HERO",
  "payslip uses accountant bucket"
);
assert(
  resolveReceiptTemplateForIssue("EXPENSE", accountantBucket, null, "MINIMAL_LINE") ===
    "EXPENSE_EXECUTIVE_VOUCHER",
  "expense falls back to its category default"
);
const migrated = parseIdentityByRole(null, { FEE_PAYMENT: "FEE_OFFICIAL_RECEIPT" }, "MINIMAL_LINE");
assert(
  migrated.SCHOOL_ADMIN?.FEE_PAYMENT === "FEE_OFFICIAL_RECEIPT",
  "legacy flat map migrates to school admin bucket"
);

(async () => {
  const input = monroviaAcademySampleInput();
  const ctx = await buildReceiptContext(input);
  assert(ctx.t.payer.includes("Sarah Johnson"), "payer interpolated");
  assert(ctx.lineItems.length === 4, "four line items");
  assert(ctx.lineItems[0].indexPadded === "01", "line item index padded");
  assert(ctx.pageClass === "page", "issued receipt page class");
  assert(ctx.t.total.includes("USD"), "total includes currency");

  const feeSample = sampleInputForReceiptTemplate("FEE_OFFICIAL_RECEIPT");
  const feeCtx = await buildReceiptContext(feeSample);
  assert(feeCtx.issuedAtDisplay === "17 Nov 2026", "short issue date matches design");
  assert(feeCtx.verifyLabel === "verify.iprep.edu/r/Lw55-Ab19", "verify label is compact");
  assert(feeCtx.fingerprint === "c40d 2e8f 61a7 93b0", "fingerprint is grouped");
  assert(
    feeCtx.amountInWordsLower === "five hundred United States dollars only",
    "fee amount words match design"
  );
  assert(feeCtx.studentDetail === "Grade 8", "student detail available");
  const expenseCtx = await buildReceiptContext(
    sampleInputForReceiptTemplate("EXPENSE_EXECUTIVE_VOUCHER")
  );
  assert(
    expenseCtx.amountInWords === "Four hundred fifty United States dollars only",
    "expense amount words preserve proper nouns"
  );
  const payslipCtx = await buildReceiptContext(
    sampleInputForReceiptTemplate("PAYSLIP_EARNINGS_DEDUCTIONS")
  );
  assert(payslipCtx.methodLabel === "Bank Transfer", "payslip method matches design");

  const voided = await buildReceiptContext({ ...input, status: "VOIDED" });
  assert(voided.pageClass === "page is-voided", "voided page class");

  for (const id of RECEIPT_TEMPLATE_IDS) {
    const sample = sampleInputForReceiptTemplate(id);
    const rendered = await renderReceiptHtml(id, { ...sample, schoolName: "Monrovia Academy" });
    assert(!rendered.includes("{{schoolName}}"), `${id} renders schoolName`);
    assert(rendered.includes("Monrovia Academy"), `${id} includes school name`);
    assert(!/\{\{\s*[\w.]+\s*\}\}/.test(rendered), `${id} has no unrendered placeholders`);
    assert(rendered.includes(sample.receiptNumber), `${id} includes receipt number from data`);
    assert(
      rendered.includes(sample.payeeName) || rendered.includes(sample.payerName),
      `${id} includes party names from data`
    );
    assert(!rendered.includes("Meridian Bank"), `${id} no fake bank`);
  }

  const feeHtml = await renderReceiptHtml("FEE_OFFICIAL_RECEIPT", feeSample);
  assert(feeHtml.includes("Amount (USD)"), "fee table header uses live currency");
  assert(
    feeHtml.includes("Received: five hundred United States dollars only"),
    "fee amount words are design-shaped"
  );
  assert(!feeHtml.includes("Fingerprint:"), "fee footer uses grouped fingerprint");
  const confirmationHtml = await renderReceiptHtml(
    "FEE_PAYMENT_CONFIRMATION",
    sampleInputForReceiptTemplate("FEE_PAYMENT_CONFIRMATION")
  );
  assert(
    confirmationHtml.includes("Paid in cash on 17 November 2026"),
    "confirmation payment phrase matches design"
  );
  const netHeroHtml = await renderReceiptHtml(
    "PAYSLIP_NET_PAY_HERO",
    sampleInputForReceiptTemplate("PAYSLIP_NET_PAY_HERO")
  );
  assert(
    !netHeroHtml.includes("Total deductions"),
    "net-pay hero breakdown matches design"
  );

  if (failed) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log("\nAll receipt-context tests passed.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
