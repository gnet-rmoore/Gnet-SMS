/**
 * Graduation certificate assemble + registry.
 * Run: npx tsx tests/certificate-templates.test.ts
 */
import {
  assembleCertificateData,
  parseCertificateDefaults,
} from "../src/features/certificates/assembleCertificate.ts";
import {
  CERTIFICATE_TEMPLATES,
  getCertificateTemplateDef,
  resolveCertificateBrand,
  resolveCertificateTemplateKey,
} from "../src/features/certificates/registry.ts";
import { sampleCertificateData } from "../src/features/certificates/sampleData.ts";

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
console.log(" CERTIFICATE TEMPLATES TESTS");
console.log("=========================================\n");

assert(CERTIFICATE_TEMPLATES.length === 4, "exactly 4 templates");
assert(
  getCertificateTemplateDef("CERT_CLASSIC_BROWN").orientation === "landscape",
  "classic is landscape"
);
assert(
  getCertificateTemplateDef("CERT_GOLD_LAURELS").pdfFormat === "letter",
  "gold is letter"
);
assert(
  getCertificateTemplateDef("CERT_RED_SEAL").cssPageSize.includes("landscape"),
  "red seal landscape page"
);
assert(
  getCertificateTemplateDef("CERT_HERITAGE_TAN").name.includes("Heritage"),
  "heritage label"
);

assert(
  resolveCertificateTemplateKey("CERT_GOLD_LAURELS") === "CERT_GOLD_LAURELS",
  "keep gold key"
);
assert(
  resolveCertificateTemplateKey(null) === "CERT_CLASSIC_BROWN",
  "null → classic"
);
assert(
  resolveCertificateTemplateKey("bogus") === "CERT_CLASSIC_BROWN",
  "unknown → classic"
);

const data = assembleCertificateData({
  schoolName: "Greendale Academy",
  studentName: "Ada Lovelace",
  academicYear: "2025 — 2026",
  signatories: [
    { name: "Jane Principal", title: "School Principal" },
    { name: "John Chair", title: "Education Chairman" },
  ],
});

assert(data.studentName === "ADA LOVELACE", "student name uppercased");
assert(data.school.name === "Greendale Academy", "school name kept");
assert(data.body.includes("Greendale Academy"), "body includes school");
assert(data.signatories[0].name === "Jane Principal", "sig1 name");
assert(data.signatories[1].title === "Education Chairman", "sig2 title");

const branded = assembleCertificateData({
  schoolName: "Brand High",
  studentName: "Test",
  logoUrl: "https://example.com/logo.png",
  address: "1 Main St",
  brandColor: "#2563eb",
});
assert(branded.school.logoUrl === "https://example.com/logo.png", "logo passed");
assert(branded.school.address === "1 Main St", "address passed");
assert(branded.brandColor === "#2563eb", "brand color kept");
assert(resolveCertificateBrand("CERT_CLASSIC_BROWN", "#2563eb") === "#2563eb", "brand wins");
assert(
  resolveCertificateBrand("CERT_GOLD_LAURELS", null) ===
    getCertificateTemplateDef("CERT_GOLD_LAURELS").fallbackBrand,
  "fallback brand when unset"
);

const defs = parseCertificateDefaults({
  sig1Name: "A",
  sig1Title: "Principal",
  sig2Name: "",
  sig2Title: "",
});
assert(defs.sig1Name === "A", "defaults sig1");
assert(defs.sig2Title === "Education Chairman", "defaults sig2 title fallback");

const blank = assembleCertificateData({
  schoolName: "",
  studentName: "",
});
assert(blank.school.name === "School", "empty school → School");
assert(blank.studentName === "—", "empty student → em dash");
assert(blank.signatories[0].name === "", "blank sig name honest empty");
assert(blank.brandColor === null, "no brand when unset");

const sample = sampleCertificateData("Test High", {
  brandColor: "#10b981",
  logoUrl: "/logo.png",
  address: "Campus Rd",
});
assert(sample.studentName === "SAMPLE STUDENT", "sample student");
assert(sample.school.name === "Test High", "sample school");
assert(sample.brandColor === "#10b981", "sample brand");
assert(sample.school.logoUrl === "/logo.png", "sample logo");

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll certificate template tests passed.");
