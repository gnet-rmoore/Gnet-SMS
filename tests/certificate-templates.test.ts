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

assert(CERTIFICATE_TEMPLATES.length === 8, "exactly 8 templates");
assert(
  CERTIFICATE_TEMPLATES.map((t) => t.name).join(",") ===
    "Heritage,Meridian,Noir,Atlas,Sovereign,Regent,Deco,Imperial",
  "supplied template names include the royal collection"
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
  getCertificateTemplateDef("CERT_SOVEREIGN").name === "Sovereign",
  "sovereign label"
);
assert(
  getCertificateTemplateDef("CERT_REGENT").name === "Regent",
  "regent label"
);
assert(
  getCertificateTemplateDef("CERT_DECO").name === "Deco",
  "deco label"
);
assert(
  getCertificateTemplateDef("CERT_IMPERIAL").name === "Imperial",
  "imperial label"
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
  resolveCertificateTemplateKey("sovereign") === "CERT_SOVEREIGN",
  "sovereign alias resolves"
);
assert(
  resolveCertificateTemplateKey("regent") === "CERT_REGENT",
  "regent alias resolves"
);
assert(
  resolveCertificateTemplateKey("deco") === "CERT_DECO",
  "deco alias resolves"
);
assert(
  resolveCertificateTemplateKey("imperial") === "CERT_IMPERIAL",
  "imperial alias resolves"
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
const sovereign = read("src/features/certificates/components/SovereignCert.tsx");
const regent = read("src/features/certificates/components/RegentCert.tsx");
const deco = read("src/features/certificates/components/DecoCert.tsx");
const imperial = read("src/features/certificates/components/ImperialCert.tsx");
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
assert(
  getCertificatePrimaryColor("CERT_SOVEREIGN") === "#5B1226" &&
    sovereign.includes("28px solid ${wine}") &&
    !sovereign.includes("data.brandColor"),
  "sovereign keeps supplied burgundy"
);
assert(
  getCertificatePrimaryColor("CERT_REGENT") === "#10224A" &&
    regent.includes("regent-lattice-${uid}") &&
    !regent.includes("data.brandColor"),
  "regent keeps supplied navy"
);
assert(
  getCertificatePrimaryColor("CERT_DECO") === "#0A2B25" &&
    deco.includes("stepped(26, 12)") &&
    !deco.includes("data.brandColor"),
  "deco keeps supplied emerald-black"
);
assert(
  getCertificatePrimaryColor("CERT_IMPERIAL") === "#33195F" &&
    imperial.includes("<Lace") &&
    !imperial.includes("data.brandColor"),
  "imperial keeps supplied purple"
);
assert(!primitives.includes("--cert-brand"), "no brand color CSS variable");
assert(!issuePage.includes("brandColor:"), "generation page does not pass brand color");
assert(
  fonts.includes("Allura") && fonts.includes("Bodoni+Moda") && fonts.includes("Cinzel") && fonts.includes("Cormorant") && fonts.includes("DM+Serif") && fonts.includes("DM+Sans") && fonts.includes("Instrument+Serif") && fonts.includes("Italiana") && fonts.includes("Josefin+Sans") && fonts.includes("Manrope") && fonts.includes("Marcellus") && fonts.includes("Playfair") && fonts.includes("Inter"),
  "all thirteen supplied font families are loaded"
);
assert(
  ["--font-cormorant", "--font-inter", "--font-dm-serif", "--font-dm-sans", "--font-playfair", "--font-manrope", "--font-instrument", "--font-signature", "--font-cinzel", "--font-bodoni", "--font-italiana", "--font-josefin", "--font-marcellus"].every((v) => fonts.includes(v)),
  "all thirteen supplied CSS font variables are defined"
);
assert(
  primitives.includes("SCRIPT = f(\"--font-signature\""),
  "supplied Allura script font is available"
);
assert(
  heritage.includes("SERIF_CORM") && heritage.includes("SANS_INTER") &&
    meridian.includes("SERIF_DM") && meridian.includes("SANS_DM") &&
    noir.includes("SERIF_PLAY") && noir.includes("SANS_MANROPE") &&
    atlas.includes("SERIF_INSTR") && atlas.includes("SANS_MANROPE") &&
    sovereign.includes("SERIF_CINZEL") && sovereign.includes("SERIF_CORM") && sovereign.includes("SANS_INTER") &&
    regent.includes("SERIF_BODONI") && regent.includes("SANS_DM") &&
    deco.includes("SERIF_ITALIANA") && deco.includes("SANS_JOSEFIN") &&
    imperial.includes("SERIF_MARCELLUS") && imperial.includes("SANS_MANROPE"),
  "each template keeps its supplied font pair"
);
assert(exportHelper.includes("@page { size: A4 landscape; margin: 0; }"), "scoped A4 print rule retained");
assert(exportHelper.includes("cert-capture"), "PDF capture fallbacks injected");
assert(
  exportHelper.includes(".cert-capture .cert-regent-bg") &&
    exportHelper.includes(".cert-capture .cert-deco-bg"),
  "PDF capture fallbacks cover new dark templates"
);
assert(
  exportHelper.includes("CERT_W = 1123") &&
    exportHelper.includes("CERT_H = 794") &&
    exportHelper.includes("createCaptureSheet") &&
    exportHelper.includes("data-cert-pdf-capture"),
  "PDF capture uses a dedicated full-size certificate clone"
);
assert(
  exportHelper.includes("transform: none !important") &&
    exportHelper.includes("position: relative !important") &&
    !exportHelper.includes("position: static !important"),
  "PDF capture preserves absolute certificate positioning"
);
assert(
  exportHelper.includes("background: #ffffff !important") &&
    exportHelper.includes("backgroundColor: \"#ffffff\"") &&
    exportHelper.includes("pdf.setFillColor(255, 255, 255)") &&
    exportHelper.includes("pdf.rect(0, 0, PDF_W_MM, PDF_H_MM, \"F\")"),
  "PDF page background is white"
);
assert(
  exportHelper.includes("radial-gradient(ellipse at 50% 40%, #3A3B3F 0%, #14161A 75%)") &&
    exportHelper.includes("radial-gradient(ellipse at 50% 35%, #3B5551 0%, #0A2B25 80%)") &&
    exportHelper.includes(".cert-capture .cert-meridian-bg") &&
    exportHelper.includes("background: #ffffff !important"),
  "PDF capture keeps supplied certificate colors"
);
assert(
  exportHelper.includes("canvas.toDataURL(\"image/png\")") &&
    exportHelper.includes("\"PNG\", 0, 0, PDF_W_MM, PDF_H_MM"),
  "PDF embeds the full certificate losslessly"
);
assert(exportHelper.includes("orientation: \"landscape\"") && exportHelper.includes("format: \"a4\""), "PDF uses A4 landscape");
assert(
  ["HeritageCert", "MeridianCert", "NoirCert", "AtlasCert", "SovereignCert", "RegentCert", "DecoCert", "ImperialCert"].every((c) => view.includes(c)),
  "renderer routes to all eight supplied designs"
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
