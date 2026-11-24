/**
 * Graduation certificate assemble + registry + supplied-design contracts.
 * Run: npx tsx tests/certificate-templates.test.ts
 */
import fs from "node:fs";
import path from "node:path";
import {
  assembleCertificateData,
  parseCertificateDefaults,
  parseCertificateRoster,
} from "../src/features/certificates/assembleCertificate.ts";
import {
  CERTIFICATE_TEMPLATES,
  getCertificatePrimaryColor,
  getCertificateTemplateDef,
  resolveCertificateTemplateKey,
} from "../src/features/certificates/registry.ts";
import { sampleCertificateData } from "../src/features/certificates/sampleData.ts";

const root = path.resolve(import.meta.dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file: string) => fs.existsSync(path.join(root, file));

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
  CERTIFICATE_TEMPLATES.map((t) => t.name).join(",") ===
    "Heritage,Meridian,Noir,Atlas",
  "supplied template names replace the old four"
);
assert(
  CERTIFICATE_TEMPLATES.every((t) => t.cssPageSize === "a4 landscape"),
  "all templates use A4 landscape CSS pages"
);
assert(
  CERTIFICATE_TEMPLATES.every((t) => t.pdfFormat === "a4"),
  "all templates export as A4 PDF"
);
assert(
  getCertificateTemplateDef("CERT_CLASSIC_BROWN").orientation === "landscape",
  "heritage is landscape"
);
assert(
  getCertificateTemplateDef("CERT_GOLD_LAURELS").primaryColor === "#0E3B36",
  "meridian supplied palette color"
);
assert(
  getCertificateTemplateDef("CERT_RED_SEAL").name === "Noir",
  "noir label"
);
assert(
  getCertificateTemplateDef("CERT_HERITAGE_TAN").name === "Atlas",
  "atlas label"
);

assert(
  resolveCertificateTemplateKey("heritage") === "CERT_CLASSIC_BROWN",
  "heritage alias resolves"
);
assert(
  resolveCertificateTemplateKey("meridian") === "CERT_GOLD_LAURELS",
  "meridian alias resolves"
);
assert(
  resolveCertificateTemplateKey("noir") === "CERT_RED_SEAL",
  "noir alias resolves"
);
assert(
  resolveCertificateTemplateKey("atlas") === "CERT_HERITAGE_TAN",
  "atlas alias resolves"
);
assert(
  resolveCertificateTemplateKey("CERT_GOLD_LAURELS") === "CERT_GOLD_LAURELS",
  "keep persisted key"
);
assert(
  resolveCertificateTemplateKey(null) === "CERT_CLASSIC_BROWN",
  "null → heritage"
);
assert(
  resolveCertificateTemplateKey("bogus") === "CERT_CLASSIC_BROWN",
  "unknown → heritage"
);

const data = assembleCertificateData({
  schoolName: "Greendale Academy",
  studentName: "Ada Lovelace",
  academicYear: "2025 — 2026",
  certificateId: "GA-2026-04172",
  signatories: [
    { name: "Jane Principal", title: "School Principal" },
    { name: "John Chair", title: "Education Chairman" },
  ],
});

assert(data.studentName === "Ada Lovelace", "student name casing preserved");
assert(data.school.name === "Greendale Academy", "school name kept");
assert(data.body.includes("Greendale Academy"), "body includes school");
assert(data.certificateId === "GA-2026-04172", "certificate id kept");
assert(data.title === "Certificate of Achievement", "supplied title default");
assert(data.signatories[0].name === "Jane Principal", "sig1 name");
assert(data.signatories[1].title === "Education Chairman", "sig2 title");

const branded = assembleCertificateData({
  schoolName: "Brand High",
  studentName: "Test",
  logoUrl: "https://example.com/logo.png",
  address: "1 Main St",
});
assert(branded.school.logoUrl === "https://example.com/logo.png", "logo passed");
assert(branded.school.address === "1 Main St", "address passed");
assert(!("brandColor" in branded), "school brand color not carried into certificate data");
assert(
  getCertificatePrimaryColor("noir") === "#14161A",
  "noir uses supplied palette color"
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
assert(!("brandColor" in blank), "no brand field in certificate data");

const interpolated = assembleCertificateData({
  schoolName: "Greendale Academy",
  studentName: "Ada Lovelace",
  academicYear: "2025 — 2026",
  body: "{{studentName}} studied at {{schoolName}} in {{academicYear}}.",
});
assert(
  interpolated.body ===
    "Ada Lovelace studied at Greendale Academy in 2025 — 2026.",
  "body placeholders interpolate"
);

const fullDefaults = parseCertificateDefaults({
  title: "Diploma",
  leadIn: "Awarded to",
  body: "{{studentName}} completed {{schoolName}}.",
  certificateIdPrefix: "DIP",
  issueDateDefault: "June 2026",
  academicYearDefault: "2025 — 2026",
  certificateRoster: { enabled: true, studentIds: ["s1", "s2", "s1"] },
});
assert(fullDefaults.title === "Diploma", "defaults title parsed");
assert(fullDefaults.leadIn === "Awarded to", "defaults lead-in parsed");
assert(fullDefaults.body.includes("{{studentName}}"), "defaults body preserved");
assert(fullDefaults.certificateIdPrefix === "DIP", "defaults prefix parsed");
assert(fullDefaults.issueDateDefault === "June 2026", "defaults date parsed");
assert(
  fullDefaults.academicYearDefault === "2025 — 2026",
  "defaults year parsed"
);
assert(
  fullDefaults.certificateRoster.studentIds.join(",") === "s1,s2",
  "roster ids dedupe"
);
assert(
  parseCertificateRoster({ enabled: true, studentIds: [1, "s3"] }).studentIds.join(",") ===
    "s3",
  "roster filters invalid ids"
);
assert(
  getCertificateTemplateDef("toString").id === "CERT_CLASSIC_BROWN",
  "malformed id cannot resolve inherited properties"
);

const sample = sampleCertificateData("Test High", {
  logoUrl: "/logo.png",
  address: "Campus Rd",
});
assert(sample.studentName === "Sample Student", "sample student");
assert(sample.school.name === "Test High", "sample school");
assert(!("brandColor" in sample), "sample has no brand color");
assert(sample.school.logoUrl === "/logo.png", "sample logo");

const primitives = read("src/features/certificates/components/CertificatePrimitives.tsx");
const heritage = read("src/features/certificates/components/HeritageCert.tsx");
const meridian = read("src/features/certificates/components/MeridianCert.tsx");
const noir = read("src/features/certificates/components/NoirCert.tsx");
const atlas = read("src/features/certificates/components/AtlasCert.tsx");
const view = read("src/features/certificates/components/CertificateView.tsx");
const fonts = read("src/features/certificates/styles/fonts.css");
const exportHelper = read("src/features/certificates/lib/exportCertificate.ts");
const issuePage = read("src/pages/School/Certificates.tsx");
const previewModal = read("src/features/settings/components/TemplatePreviewModal.tsx");

assert(primitives.includes("CERT_W = 1123") && primitives.includes("CERT_H = 794"), "original 1123×794 canvas");
assert(primitives.includes("feTurbulence") && primitives.includes("rx={rx} ry={ry}"), "paper grain + guilloche preserved");
assert(primitives.includes("maxHeight: 44, maxWidth: 170") && primitives.includes("justifySelf: \"end\""), "signature and footer geometry preserved");
assert(heritage.includes("#FBFAF6") && heritage.includes("letterSpacing: 5") && heritage.includes("inset: 22"), "heritage styling preserved");
assert(meridian.includes("radial-gradient(ellipse at 50% 0%, #EEF4F2 0%, #FFFFFF 55%)") && meridian.includes("strokeWidth=\"5\""), "meridian styling preserved");
assert(noir.includes("linear-gradient(100deg, color-mix(in srgb,") && noir.includes("backgroundClip: \"text\""), "noir gradient title preserved");
assert(atlas.includes("repeating-linear-gradient(90deg") && atlas.includes("14px solid") && atlas.includes("#C8553D"), "atlas ruler frame preserved");
assert(
  getCertificatePrimaryColor("CERT_CLASSIC_BROWN") === "#14264A" &&
    heritage.includes("getCertificatePrimaryColor") &&
    !heritage.includes("data.brandColor"),
  "heritage keeps supplied navy"
);
assert(
  getCertificatePrimaryColor("CERT_GOLD_LAURELS") === "#0E3B36" &&
    meridian.includes("getCertificatePrimaryColor") &&
    !meridian.includes("data.brandColor"),
  "meridian keeps supplied emerald"
);
assert(
  getCertificatePrimaryColor("CERT_RED_SEAL") === "#14161A" &&
    noir.includes("getCertificatePrimaryColor") &&
    !noir.includes("data.brandColor"),
  "noir keeps supplied charcoal"
);
assert(
  getCertificatePrimaryColor("CERT_HERITAGE_TAN") === "#1C2766" &&
    atlas.includes("getCertificatePrimaryColor") &&
    !atlas.includes("data.brandColor"),
  "atlas keeps supplied indigo"
);
assert(!primitives.includes("--cert-brand"), "no brand color CSS variable");
assert(!issuePage.includes("brandColor:"), "generation page does not pass brand color");
assert(
  fonts.includes("Allura") && fonts.includes("Cormorant") && fonts.includes("DM+Serif") && fonts.includes("DM+Sans") && fonts.includes("Instrument+Serif") && fonts.includes("Manrope") && fonts.includes("Playfair") && fonts.includes("Inter"),
  "all supplied font families are loaded"
);
assert(exportHelper.includes("@page { size: A4 landscape; margin: 0; }"), "scoped A4 print rule retained");
assert(exportHelper.includes("cert-capture"), "PDF capture fallbacks injected");
assert(exportHelper.includes("orientation: \"landscape\"") && exportHelper.includes("format: \"a4\""), "PDF uses A4 landscape");
assert(
  ["HeritageCert", "MeridianCert", "NoirCert", "AtlasCert"].every((c) => view.includes(c)),
  "renderer routes to all four supplied designs"
);
assert(!view.includes("certificate-print.css"), "global print CSS no longer imported");
assert(
  previewModal.includes("exportCertificatesPdf") &&
    previewModal.includes("pages:certificates.downloadPdf") &&
    previewModal.includes("certPreviewRef"),
  "certificate preview modal downloads PDF"
);
assert(
  !["ClassicBrownCert", "GoldLaurelsCert", "RedSealCert", "HeritageTanCert", "Seals", "CertChrome"].some((s) => view.includes(s)),
  "renderer no longer references the removed templates"
);
assert(
  !["ClassicBrownCert.tsx", "GoldLaurelsCert.tsx", "RedSealCert.tsx", "HeritageTanCert.tsx", "classic-brown.css", "gold-laurels.css", "red-seal.css", "heritage-tan.css"].some((f) =>
    exists(`src/features/certificates/${f.includes(".css") ? `styles/${f}` : `components/${f}`}`)
  ),
  "old template source files are removed"
);
assert(
  issuePage.includes("generateSelected") &&
    issuePage.includes("printCertificates") &&
    issuePage.includes("exportCertificatesPdf") &&
    issuePage.includes("rosterOnly"),
  "generation page supports roster, bulk print, and PDF export"
);

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll certificate template tests passed.");
