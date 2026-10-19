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

assert(resolveReceiptTemplateId("minimal-line") === "MINIMAL_LINE", "kebab id resolves");
assert(resolveReceiptTemplateId(null) === "MINIMAL_LINE", "default template");
assert(resolveReceiptTemplateId("BORDERED_FORMAL") === "MINIMAL_LINE", "removed id falls back");
assert(resolveReceiptTemplateId("PDFKIT_DEFAULT") === "MINIMAL_LINE", "legacy PDFKIT_DEFAULT falls back");
assert(RECEIPT_TEMPLATE_IDS.length === 2, "two templates registered");
assert(previewLogoQueryParam("data:image/png;base64,abc") === undefined, "data URL omitted from preview query");
assert(previewLogoQueryParam("https://cdn.example/logo.png") === "https://cdn.example/logo.png", "http logo kept");
assert(
  resolveReceiptTemplateForType("PAYSLIP", { PAYSLIP: "COMPACT_GRID", FEE_PAYMENT: "MINIMAL_LINE" }, "MINIMAL_LINE") === "COMPACT_GRID",
  "payslip uses per-type template"
);
assert(
  resolveReceiptTemplateForType("FEE_PAYMENT", { PAYSLIP: "COMPACT_GRID" }, "MINIMAL_LINE") === "MINIMAL_LINE",
  "fee falls back to legacy single template"
);
const perType = mergeIdentity({ FEE_PAYMENT: "MINIMAL_LINE", EXPENSE: "COMPACT_GRID" }, "MINIMAL_LINE");
assert(perType.FEE_PAYMENT === "MINIMAL_LINE" && perType.PAYSLIP === "MINIMAL_LINE", "merge keeps unset types on legacy default");
assert(mergeReceiptTemplates({ PAYSLIP: "COMPACT_GRID" }, "MINIMAL_LINE").PAYSLIP === "COMPACT_GRID", "finance merge partial type");

const registrarBucket = mergeRoleReceiptTemplates({}, "REGISTRAR", { FEE_PAYMENT: "MINIMAL_LINE" });
const accountantBucket = mergeRoleReceiptTemplates(registrarBucket, "ACCOUNTANT", {
  PAYSLIP: "COMPACT_GRID",
});
assert(
  resolveReceiptTemplateForIssue("FEE_PAYMENT", accountantBucket, null, "MINIMAL_LINE") === "MINIMAL_LINE",
  "fee receipt uses registrar bucket"
);
assert(
  resolveReceiptTemplateForIssue("PAYSLIP", accountantBucket, null, "MINIMAL_LINE") === "COMPACT_GRID",
  "payslip uses accountant bucket"
);
const migrated = parseIdentityByRole(null, { FEE_PAYMENT: "MINIMAL_LINE" }, "MINIMAL_LINE");
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
