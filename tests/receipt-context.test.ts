/**
 * Receipt template context + HTML builder tests.
 * Run: npx tsx tests/receipt-context.test.ts
 */
import {
  buildReceiptContext,
  monroviaAcademySampleInput,
} from "../services/finance/src/lib/receiptContext.ts";
import { renderReceiptHtml } from "../services/finance/src/lib/receiptHtmlBuilder.ts";
import {
  RECEIPT_TEMPLATE_IDS,
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

assert(resolveReceiptTemplateId("classic-ledger") === "CLASSIC_LEDGER", "kebab id resolves");
assert(resolveReceiptTemplateId(null) === "PDFKIT_DEFAULT", "default template");
assert(RECEIPT_TEMPLATE_IDS.length === 6, "six templates registered");
assert(previewLogoQueryParam("data:image/png;base64,abc") === undefined, "data URL omitted from preview query");
assert(previewLogoQueryParam("https://cdn.example/logo.png") === "https://cdn.example/logo.png", "http logo kept");
assert(
  resolveReceiptTemplateForType("PAYSLIP", { PAYSLIP: "COMPACT_GRID", FEE_PAYMENT: "BORDERED_FORMAL" }, "PDFKIT_DEFAULT") === "COMPACT_GRID",
  "payslip uses per-type template"
);
assert(
  resolveReceiptTemplateForType("FEE_PAYMENT", { PAYSLIP: "COMPACT_GRID" }, "MINIMAL_LINE") === "MINIMAL_LINE",
  "fee falls back to legacy single template"
);
const perType = mergeIdentity({ FEE_PAYMENT: "BORDERED_FORMAL", EXPENSE: "MINIMAL_LINE" }, "PDFKIT_DEFAULT");
assert(perType.FEE_PAYMENT === "BORDERED_FORMAL" && perType.PAYSLIP === "PDFKIT_DEFAULT", "merge keeps unset types on legacy default");
assert(mergeReceiptTemplates({ PAYSLIP: "SIDEBAR_RAIL" }, "PDFKIT_DEFAULT").PAYSLIP === "SIDEBAR_RAIL", "finance merge partial type");

const registrarBucket = mergeRoleReceiptTemplates({}, "REGISTRAR", { FEE_PAYMENT: "BORDERED_FORMAL" });
const accountantBucket = mergeRoleReceiptTemplates(registrarBucket, "ACCOUNTANT", {
  PAYSLIP: "COMPACT_GRID",
});
assert(
  resolveReceiptTemplateForIssue("FEE_PAYMENT", accountantBucket, null, "PDFKIT_DEFAULT") === "BORDERED_FORMAL",
  "fee receipt uses registrar bucket"
);
assert(
  resolveReceiptTemplateForIssue("PAYSLIP", accountantBucket, null, "PDFKIT_DEFAULT") === "COMPACT_GRID",
  "payslip uses accountant bucket"
);
const migrated = parseIdentityByRole(null, { FEE_PAYMENT: "MINIMAL_LINE" }, "PDFKIT_DEFAULT");
assert(migrated.SCHOOL_ADMIN?.FEE_PAYMENT === "MINIMAL_LINE", "legacy flat map migrates to school admin bucket");

(async () => {
  const input = monroviaAcademySampleInput();
  const ctx = await buildReceiptContext(input);
  assert(ctx.t.payer.includes("Sarah Johnson"), "payer interpolated");
  assert(ctx.lineItems.length === 4, "four line items");
  assert(ctx.pageClass === "page", "issued receipt page class");
  assert(ctx.t.total.includes("USD"), "total includes currency");

  const voided = await buildReceiptContext({ ...input, status: "VOIDED" });
  assert(voided.pageClass === "page is-voided", "voided page class");

  for (const id of RECEIPT_TEMPLATE_IDS) {
    if (id === "PDFKIT_DEFAULT") continue;
    const rendered = await renderReceiptHtml(id, input);
    assert(!rendered.includes("{{schoolName}}"), `${id} renders schoolName`);
    assert(rendered.includes("Monrovia Academy"), `${id} includes school name`);
    assert(!rendered.includes("Meridian Bank"), `${id} no fake bank`);
  }

  if (failed) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log("\nAll receipt-context tests passed.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
