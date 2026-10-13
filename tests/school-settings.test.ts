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

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All school-settings tests passed");
