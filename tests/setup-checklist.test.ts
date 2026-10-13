/**
 * Unit tests for school setup checklist helpers.
 * Run: npm run test:setup-checklist
 */
import {
  allRequiredDone,
  canOpenSetupStep,
  hasTeacher,
  isBrandingDone,
  isCalendarReady,
  isNonEmptyList,
  normalizeBrandHex,
  REQUIRED_SETUP_STEPS,
  SETUP_DEFAULT_BRAND,
  SETUP_STEPS,
  statusFromFetch,
  statusFromPredicate,
} from "../src/features/onboarding/setupChecklist";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    failed++;
  } else {
    console.log(`PASSED: ${message}`);
  }
}

console.log("=========================================");
console.log(" SETUP CHECKLIST UNIT TESTS              ");
console.log("=========================================\n");

console.log("[normalizeBrandHex]");
assert(normalizeBrandHex("#2563EB") === "#2563eb", "upper hex lowercased");
assert(normalizeBrandHex("  #2563eb  ") === "#2563eb", "trim whitespace");
assert(normalizeBrandHex("2563eb") === "#2563eb", "adds missing hash");
assert(normalizeBrandHex("#abc") === "#aabbcc", "expands 3-digit hex");
assert(normalizeBrandHex("") === null, "empty → null");
assert(normalizeBrandHex(null) === null, "null → null");

console.log("\n[isBrandingDone]");
assert(isBrandingDone({ logoUrl: null, brandColor: SETUP_DEFAULT_BRAND }) === false, "default blue alone not done");
assert(isBrandingDone({ logoUrl: "", brandColor: "#2563EB" }) === false, "default blue case-insensitive");
assert(isBrandingDone({ logoUrl: "https://cdn.example/logo.png", brandColor: SETUP_DEFAULT_BRAND }) === true, "logo alone done");
assert(isBrandingDone({ logoUrl: null, brandColor: "#059669" }) === true, "custom color done");
assert(isBrandingDone({ logoUrl: "  ", brandColor: null }) === false, "whitespace logo ignored");

console.log("\n[isNonEmptyList / statusFromFetch]");
assert(isNonEmptyList([{ id: 1 }]) === true, "non-empty array");
assert(isNonEmptyList([]) === false, "empty array");
assert(isNonEmptyList(null) === false, "null not a list");
assert(statusFromFetch(true, [{ id: 1 }]) === "done", "ok + items → done");
assert(statusFromFetch(true, []) === "todo", "ok + empty → todo");
assert(statusFromFetch(false, []) === "unknown", "failed fetch → unknown not todo");
assert(statusFromFetch(false, [{ id: 1 }]) === "unknown", "failed fetch ignores body");
assert(statusFromPredicate(true, true) === "done", "predicate done");
assert(statusFromPredicate(true, false) === "todo", "predicate todo");
assert(statusFromPredicate(false, true) === "unknown", "predicate unknown on fail");

console.log("\n[hasTeacher / isCalendarReady]");
assert(hasTeacher([{ role: "TEACHER" }]) === true, "teacher present");
assert(hasTeacher([{ role: "SCHOOL_ADMIN" }]) === false, "admin-only not enough");
assert(hasTeacher([{ role: "TEACHER", isActive: false }]) === false, "inactive teacher ignored");
assert(hasTeacher([]) === false, "empty staff");
assert(isCalendarReady({ periods: [{ id: "p1" }] }) === true, "calendar with periods");
assert(isCalendarReady({ periods: [] }) === false, "calendar empty periods");
assert(isCalendarReady(null) === false, "null calendar");
assert(isCalendarReady({}) === false, "missing periods");

console.log("\n[required steps / allRequiredDone]");
assert(REQUIRED_SETUP_STEPS.length === 7, "seven required steps");
assert(SETUP_STEPS.some((s) => s.id === "admissionPolicy" && !s.required) === true, "admission soft");
assert(
  allRequiredDone(
    REQUIRED_SETUP_STEPS.map((s) => ({ id: s.id, status: "done" as const }))
  ) === true,
  "all required done"
);
assert(
  allRequiredDone(
    REQUIRED_SETUP_STEPS.map((s, i) => ({
      id: s.id,
      status: (i === 0 ? "todo" : "done") as "todo" | "done",
    }))
  ) === false,
  "one todo blocks"
);

console.log("\n[canOpenSetupStep]");
assert(canOpenSetupStep("SCHOOL_ADMIN", "branding") === true, "admin opens branding");
assert(canOpenSetupStep("PRINCIPAL", "branding") === false, "principal cannot open settings");
assert(canOpenSetupStep("PRINCIPAL", "grades") === true, "principal opens curriculum");
assert(canOpenSetupStep("PRINCIPAL", "fees") === false, "principal cannot open fees");
assert(canOpenSetupStep("IT_ADMIN", "branding") === true, "IT admin opens settings");
assert(canOpenSetupStep("IT_ADMIN", "classrooms") === false, "IT admin cannot open classrooms");
assert(canOpenSetupStep("IT_ADMIN", "staff") === true, "IT admin opens staff");
assert(canOpenSetupStep("SCHOOL_ADMIN", "calendar") === true, "admin opens calendar");
assert(canOpenSetupStep("IT_ADMIN", "calendar") === false, "IT admin cannot open calendar setup");

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log("\nAll setup-checklist tests passed.");
