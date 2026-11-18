/**
 * Settings helpers: grade legends + security policy + notification defaults.
 * Run: npx tsx tests/school-settings.test.ts
 */
import { letterFromScore, pickLegendScales } from "../src/lib/gradeLegend";
import {
  defaultNotificationPrefs,
  mergeNotificationPrefsFromApi,
  normalizeCustomEventKey,
  isSystemNotificationKey,
} from "../src/lib/notificationPrefs";
import {
  normalizeCustomEventKey as normalizeServerKey,
  isKnownEventKey,
} from "../services/comms/src/lib/notificationPrefs";
import {
  APP_BRAND_DEFAULT,
  brandPaletteFromHex,
  normalizeBrandHex,
} from "../src/lib/brandPalette";
import {
  parseSecurityPolicy,
  validatePasswordAgainstPolicy,
  serializeSecurityPolicy,
} from "../services/identity/src/lib/securityPolicy";
import {
  defaultMaxScoreForCategory,
  parseGradebookConfig,
  validateGradebookConfigTotals,
  type GradebookConfig,
} from "../services/identity/src/lib/gradebookConfig";
import { schoolUpdateSchema } from "../services/identity/src/validation/schemas";
import { sampleGradeSheetData } from "../src/features/gradesheets/sampleData";
import {
  DEFAULT_TRANSCRIPT_TEMPLATE,
  SELECTABLE_TRANSCRIPT_TEMPLATE_OPTIONS,
  resolveSelectableTranscriptTemplateKey,
  resolveTranscriptTemplateKey,
} from "../src/features/transcripts/api";

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
console.log(" SCHOOL SETTINGS UNIT TESTS");
console.log("=========================================\n");

assert(letterFromScore(95) === "A", "default legend 95 → A");
assert(letterFromScore(55) === "F", "default legend 55 → F");

const custom = [
  {
    category: "CLASS",
    scales: [
      { minScore: 70, maxScore: 100, gradeLetter: "P", gpaPoints: 1 },
      { minScore: 0, maxScore: 69, gradeLetter: "F", gpaPoints: 0 },
    ],
  },
];
assert(letterFromScore(72, custom) === "P", "custom legend 72 → P");
assert(pickLegendScales(custom).length === 2, "pickLegendScales uses custom");

const policy = parseSecurityPolicy({
  passwordMinLength: 10,
  requireStrongPassword: true,
});
assert(policy.passwordMinLength === 10, "parse min length");
assert(validatePasswordAgainstPolicy("short", policy) !== null, "short rejected");
assert(validatePasswordAgainstPolicy("longenough1", policy) === null, "strong accepted");
assert(validatePasswordAgainstPolicy("longenough", policy) !== null, "missing digit rejected");

const serialized = serializeSecurityPolicy({ passwordMinLength: 8 });
assert(serialized.includes('"passwordMinLength":8'), "serialize includes min length");

const prefs = defaultNotificationPrefs();
assert(prefs.length >= 5, "default notification prefs present");
assert(prefs.every((p) => p.emailEnabled && p.inAppEnabled), "defaults all on");
assert(prefs.some((p) => p.eventKey === "EXAM_PAPER_SUBMITTED"), "includes exam paper keys");

assert(normalizeCustomEventKey("Bus delay") === "BUS_DELAY", "slug from label");
assert(normalizeCustomEventKey("1bad") === null, "key must start with letter");
assert(isSystemNotificationKey("ANNOUNCEMENT") === true, "system key known");
assert(isKnownEventKey("ANNOUNCEMENT") === true, "server system key known");
assert(normalizeServerKey("bus-delay") === "BUS_DELAY", "server normalize");

const oversizedGradebookConfig: GradebookConfig = {
  categories: [10, 10, 8, 10, 10, 10, 5, 5, 2, 40].map((points, index) => ({
    id: `column-${index}`,
    code: `C${index}`,
    weightPct: points,
    maxScore: points,
    isActive: true,
  })),
};
const gradebookTotalErrors = validateGradebookConfigTotals(oversizedGradebookConfig);
assert(
  gradebookTotalErrors.some((message) => message.includes("weights total 110%")),
  "rejects active weights that exceed 100%"
);
assert(
  gradebookTotalErrors.some((message) => message.includes("Max pts total 110")),
  "rejects active Max pts above 100"
);
assert(
  validateGradebookConfigTotals({
    categories: [
      { code: "HW", weightPct: 40, maxScore: 80, isActive: true },
    ],
  }).length === 0,
  "allows both weights and Max pts totals below 100"
);
assert(
  validateGradebookConfigTotals({
    categories: [
      { code: "HW", weightPct: 0, maxScore: 0, isActive: true },
    ],
  }).length === 0,
  "allows zero-valued grading defaults"
);
assert(
  defaultMaxScoreForCategory({ shortCode: "MID", weightPct: 10 }) === 25 &&
    defaultMaxScoreForCategory({ shortCode: "FIN", weightPct: 10 }) === 25,
  "uses legacy defaults for missing midterm and final Max pts"
);
assert(
  defaultMaxScoreForCategory({ shortCode: "MID", weightPct: 0, maxScore: 0 }) === 0,
  "preserves an explicitly configured zero Max pts"
);
assert(
  parseGradebookConfig(JSON.stringify(oversizedGradebookConfig)).categories[0].maxScore === 10,
  "preserves Max pts when parsing gradebook settings"
);
assert(
  !schoolUpdateSchema.shape.gradebookConfig.safeParse(
    JSON.stringify(oversizedGradebookConfig)
  ).success,
  "rejects invalid gradebook totals at the school update API boundary"
);

const merged = mergeNotificationPrefsFromApi([
  { eventKey: "ANNOUNCEMENT", emailEnabled: false, inAppEnabled: true },
  {
    eventKey: "BUS_DELAY",
    emailEnabled: true,
    inAppEnabled: false,
    label: "Bus delay",
    description: "Late buses",
    isCustom: true,
  },
]);
assert(
  merged.find((p) => p.eventKey === "ANNOUNCEMENT")?.emailEnabled === false,
  "merge applies system toggle"
);
assert(
  merged.some((p) => p.eventKey === "BUS_DELAY" && p.isCustom && p.label === "Bus delay"),
  "merge keeps custom category"
);

assert(normalizeBrandHex("#0ea5e9") === "#0ea5e9", "normalize brand hex");
assert(normalizeBrandHex("notahex") === null, "reject bad hex");
assert(APP_BRAND_DEFAULT === "#2563eb", "platform default is modern blue");
const sky = brandPaletteFromHex("#0ea5e9");
assert(sky["600"] === "#0ea5e9", "palette 600 is brand");
assert(sky["50"] !== sky["600"], "palette 50 is lighter");
assert(sky["900"] !== sky["600"], "palette 900 is darker");
const appBlue = brandPaletteFromHex(APP_BRAND_DEFAULT);
assert(appBlue["600"] === "#2563eb", "app palette 600 is blue-600");

const previewSheet = sampleGradeSheetData("Current Academy", "12 Main Road", {
  school: {
    phone: "+231 77 000 0001",
    email: "office@current.edu.lr",
  },
  term: { academicYear: "2030/2031" },
  student: { name: "Sample Learner" },
});
assert(previewSheet.school.name === "Current Academy", "grade-sheet preview uses current school name");
assert(previewSheet.school.address === "12 Main Road", "grade-sheet preview uses current school address");
assert(previewSheet.school.phone === "+231 77 000 0001", "grade-sheet preview uses current school phone");
assert(previewSheet.term.academicYear === "2030/2031", "grade-sheet preview uses supplied academic year");
assert(previewSheet.student.name === "Sample Learner", "grade-sheet preview uses neutral sample learner");
assert(previewSheet.subjects.length > 0, "grade-sheet preview keeps sample grades");
const previewSheetText = JSON.stringify(previewSheet);
assert(!previewSheetText.includes("Greenfield"), "no Greenfield academy dummy data");
assert(!previewSheetText.includes("Grace K. Johnson"), "no hardcoded sample learner identity");
assert(!previewSheetText.includes("Education For The Future"), "no hardcoded school motto");

assert(DEFAULT_TRANSCRIPT_TEMPLATE === "classic", "transcript default is the current design");
assert(
  SELECTABLE_TRANSCRIPT_TEMPLATE_OPTIONS.length === 1 &&
    SELECTABLE_TRANSCRIPT_TEMPLATE_OPTIONS[0].key === "classic",
  "only the current transcript template is selectable for now"
);
assert(resolveTranscriptTemplateKey("modern") === "modern", "future transcript keys resolve");
assert(resolveTranscriptTemplateKey("unknown") === "classic", "unknown transcript keys fall back");
assert(
  resolveSelectableTranscriptTemplateKey("modern") === "classic",
  "unsupported stored transcript keys fall back to the selectable current design"
);
assert(
  resolveSelectableTranscriptTemplateKey("unknown") === "classic",
  "unknown transcript keys fall back to the selectable current design"
);
assert(
  schoolUpdateSchema.shape.transcriptTemplate.safeParse("classic").success,
  "school update accepts transcript template"
);
assert(
  !schoolUpdateSchema.shape.transcriptTemplate.safeParse("unknown").success,
  "school update rejects unknown transcript template"
);

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All school-settings tests passed");
