/**
 * Liberian report-card registry + client assembly.
 * Run: npx tsx tests/report-card-liberia.test.ts
 */
import {
  assembleReportCardPayload,
  getReportCardTemplateDef,
  isLiberianReportCardTemplate,
  liberianProgressReportTitle,
  liberianScoreTone,
  matchLiberiaColumnKey,
  resolveReportCardTemplateKey,
  reportCardPickerGroups,
} from "../src/features/report-cards/index.ts";

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
console.log(" LIBERIAN REPORT CARD TESTS");
console.log("=========================================\n");

assert(resolveReportCardTemplateKey("TEMPLATE_1") === "INTL_WISTERIA_GREEN", "legacy TEMPLATE_1 → Wisteria Green");
assert(resolveReportCardTemplateKey("LR_PUBLIC_MOE_TWO_SEM") === "INTL_WISTERIA_GREEN", "removed LR key → Wisteria Green");
assert(!isLiberianReportCardTemplate("LR_PRIVATE_TWO_SEM_A"), "removed LR keys are not Liberian");
assert(!isLiberianReportCardTemplate("TEMPLATE_2"), "TEMPLATE_2 not Liberian");

const moe = getReportCardTemplateDef("LR_PUBLIC_MOE_TWO_SEM");
assert(moe.key === "INTL_WISTERIA_GREEN", "removed keys resolve to the green quarterly");
assert(moe.pages.includes("GRADES") && !moe.pages.includes("COVER"), "no cover page on remaining template");

const groups = reportCardPickerGroups();
  assert(groups.length === 1, "only one picker group");
  assert(groups[0].region === "INTL", "remaining group is International");
  assert(groups[0].items.length === 1, "International group has 1 template");
  assert(
    groups[0].items.some((t) => t.key === "INTL_WISTERIA_GREEN"),
    "INTL includes green academic quarterly"
  );
  assert(resolveReportCardTemplateKey("INTL_WISTERIA_GREEN") === "INTL_WISTERIA_GREEN", "wisteria green key passthrough");
  assert(resolveReportCardTemplateKey("TEMPLATE_10") === "INTL_WISTERIA_GREEN", "legacy TEMPLATE_10 → green");
  assert(resolveReportCardTemplateKey("TEMPLATE_7") === "INTL_WISTERIA_GREEN", "legacy TEMPLATE_7 → green");
  assert(getReportCardTemplateDef("TEMPLATE_5").key === "INTL_WISTERIA_GREEN", "TEMPLATE_5 resolves to green");

assert(matchLiberiaColumnKey("SEM1_P1") === "SEM1_P1", "match SEM1_P1");
assert(matchLiberiaColumnKey("FIRST_PERIOD") === "SEM1_P1", "match FIRST_PERIOD");
assert(matchLiberiaColumnKey("SEM1_EX") === "SEM1_EX", "match exam");
assert(matchLiberiaColumnKey("SECOND_SEMESTER_EXAMS") === "SEM2_EX", "match sem2 exam alias");

const payload = assembleReportCardPayload({
  templateKey: "INTL_WISTERIA_GREEN",
  school: { name: "Test High", address: "Monrovia" },
  student: {
    id: "s1",
    name: "Ada Lovelace",
    classLabel: "10A",
    gradeLevelLabel: "Grade 10",
  },
  academicYearLabel: "2025/2026",
  grades: [
    {
      id: "g1",
      score: 95,
      subject: { id: "math", name: "Mathematics", code: "MTH" },
      examComponent: { shortCode: "SEM1_P1" },
    },
    {
      id: "g2",
      score: 68,
      subject: { id: "math", name: "Mathematics", code: "MTH" },
      examComponent: { shortCode: "SEM1_P2" },
    },
    {
      id: "g3",
      score: 82,
      subject: { id: "eng", name: "English", code: "ENG" },
      examComponent: { shortCode: "SEM1_EX" },
    },
  ],
});

assert(payload.subjects.length === 2, "two subjects assembled");
const math = payload.subjects.find((s) => s.code === "MTH");
assert(math?.cells.SCORE?.score === 68, "INTL SCORE cell holds last released grade");
assert(payload.aggregates.attendanceRate === null, "no fake attendance");
assert(payload.aggregates.classPosition === null, "no fake position");
assert(!payload.columns.some((c) => c.roman === "I"), "no Liberian roman columns on remaining template");

assert(
  liberianProgressReportTitle("k-2") === "KINDERGARTEN PROGRESS REPORT CARD",
  "k-2 → Kindergarten title"
);
assert(liberianScoreTone(68) === "fail", "68 is fail (<70)");
assert(liberianScoreTone(88) === "pass", "88 is pass");


const empty = assembleReportCardPayload({
  templateKey: "LR_PRIVATE_TWO_SEM_B",
  school: { name: "Empty School" },
  student: { id: "s2", name: "Blank", classLabel: "", gradeLevelLabel: "9" },
  grades: [],
});
assert(empty.subjects.length === 0, "empty grades → empty subjects");
assert(empty.aggregates.overallAverage === null, "no invented overall average");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All Liberian report card tests passed");
