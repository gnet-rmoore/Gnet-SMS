/**
 * Platform guide track resolver + capability filter + age filter.
 * Run: npx tsx tests/guide-track.test.ts
 */
import {
  filterStepsForCapabilities,
  filterStepsForStudentAge,
  GUIDE_TRACKS,
  progressPercent,
  wizardTrackForRole,
} from "../src/features/platform-guide/catalog.ts";
import { resolveGuideHowTo } from "../src/features/platform-guide/guideHowTo.ts";
import { enGuide } from "../src/i18n/catalogs/enGuide.ts";
import {
  ageYearsFromDob,
  isUnder13,
  wizardTrackForRole as identityTrack,
} from "../services/identity/src/domain/guideProgress.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

assert(wizardTrackForRole("TEACHER") === "teacher", "teacher track");
assert(wizardTrackForRole("STUDENT") === "student", "student track");
assert(wizardTrackForRole("PARENT") === "parent", "parent track");
assert(wizardTrackForRole("REGISTRAR") === "staff_registrar", "registrar track");
assert(wizardTrackForRole("ACCOUNTANT") === "staff_finance", "finance track");
assert(wizardTrackForRole("SCHOOL_ADMIN") === "staff_admin", "admin track");
assert(wizardTrackForRole("MAINTENANCE") === "staff_ops_specialist", "ops specialist");
assert(wizardTrackForRole("NURSE") === "staff_care", "care track");
assert(wizardTrackForRole("SUPER_ADMIN") === "super_admin", "super admin track");
assert(identityTrack("SUPER_ADMIN") === "super_admin", "identity domain matches SPA");

const teacher = GUIDE_TRACKS.teacher;
assert(!!teacher && teacher.steps.length >= 8, "teacher curriculum length");
assert(teacher.steps[0].type === "intro", "teacher starts with intro");
assert(teacher.steps.at(-1)!.type === "completion", "teacher ends with completion");

assert(!!GUIDE_TRACKS.super_admin, "super_admin curriculum exists");
assert(GUIDE_TRACKS.super_admin.steps.some((s) => s.id === "sa_schools"), "sa schools step");

assert(
  filterStepsForCapabilities(teacher.steps, null).length === teacher.steps.length,
  "null capabilities shows full track"
);

const filtered = filterStepsForCapabilities(teacher.steps, ["nav.attendance", "nav.classroom"]);
assert(
  filtered.every((s) => !s.navCapability || ["nav.attendance", "nav.classroom"].includes(s.navCapability)),
  "capability filter drops ungated nav steps"
);
assert(
  filtered.some((s) => s.type === "intro"),
  "intro retained without capability"
);

const studentFull = GUIDE_TRACKS.student.steps;
const studentShort = filterStepsForStudentAge("student", studentFull, true);
assert(studentShort.length < studentFull.length, "under-13 student track is shorter");
assert(studentShort.every((s) => !s.id.includes("fees")), "under-13 omits fees step");
assert(filterStepsForStudentAge("student", studentFull, false).length === studentFull.length, "13+ full track");

const twelve = new Date();
twelve.setFullYear(twelve.getFullYear() - 12);
assert(isUnder13(twelve) === true, "12yo under 13");
assert(ageYearsFromDob(twelve) === 12, "ageYearsFromDob 12");

const pct = progressPercent(teacher.steps, {
  trackId: "teacher",
  version: 1,
  status: "IN_PROGRESS",
  steps: { teacher_intro: "done", teacher_schedule: "done" },
});
assert(pct > 0 && pct < 100, `partial progress percent=${pct}`);

const tStub = (key: string, opts?: Record<string, unknown>) => {
  if (opts?.returnObjects && key === "guide.steps.teacher_gradebook.howTo") {
    return enGuide.steps.teacher_gradebook.howTo;
  }
  if (opts?.returnObjects) return opts.defaultValue ?? [];
  return key;
};
const howTo = resolveGuideHowTo(tStub, "teacher_gradebook");
assert(howTo.length >= 2, "teacher_gradebook howTo has steps");
assert(howTo.some((l) => /Gradebook/i.test(l) || /autosave|Enter/i.test(l)), "howTo mentions gradebook actions");
assert(typeof enGuide.howToLabel === "string", "howToLabel present");

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll guide-track tests passed.");
