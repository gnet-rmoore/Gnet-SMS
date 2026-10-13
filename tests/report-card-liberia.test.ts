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

assert(resolveReportCardTemplateKey("TEMPLATE_1") === "INTL_STANDARD_TERM", "legacy TEMPLATE_1 → INTL");
assert(resolveReportCardTemplateKey("LR_PUBLIC_MOE_TWO_SEM") === "LR_PUBLIC_MOE_TWO_SEM", "LR key passthrough");
assert(isLiberianReportCardTemplate("LR_PRIVATE_TWO_SEM_A"), "LR private is Liberian");
assert(!isLiberianReportCardTemplate("TEMPLATE_2"), "TEMPLATE_2 not Liberian");

const moe = getReportCardTemplateDef("LR_PUBLIC_MOE_TWO_SEM");
assert(moe.pages.includes("COVER") && moe.pages.includes("PROMOTION"), "MoE has cover+promotion");
assert(moe.branding === "SCHOOL_LOGO_PLUS_MOE", "MoE branding");

const withScale = getReportCardTemplateDef("LR_PRIVATE_WITH_SCALE");
assert(withScale.pages.includes("GRADING_SYSTEM"), "scale pack has grading system page");
assert(withScale.promotionScheme === "A_E", "scale pack A–E");

const groups = reportCardPickerGroups();
  assert(groups.some((g) => g.region === "LR" && g.items.length === 4), "Liberia group has 4 templates");
  assert(groups.some((g) => g.region === "INTL" && g.items.length === 12), "International group has 12 templates");
  assert(
    groups.some((g) => g.region === "INTL" && g.items.some((t) => t.key === "INTL_WISTERIA_GREEN")),
    "INTL includes green academic quarterly"
  );
  assert(
    groups.some((g) => g.region === "INTL" && g.items.some((t) => t.key === "INTL_WISTERIA_NAVY")),
    "INTL includes navy bordered quarterly"
  );
  assert(resolveReportCardTemplateKey("INTL_WISTERIA_GREEN") === "INTL_WISTERIA_GREEN", "wisteria green key passthrough");
  assert(resolveReportCardTemplateKey("INTL_WISTERIA_NAVY") === "INTL_WISTERIA_NAVY", "wisteria navy key passthrough");

  assert(resolveReportCardTemplateKey("TEMPLATE_10") === "INTL_EXECUTIVE", "legacy TEMPLATE_10 → Executive");
  assert(resolveReportCardTemplateKey("TEMPLATE_7") === "INTL_EUROPEAN", "legacy TEMPLATE_7 → European");
  assert(getReportCardTemplateDef("TEMPLATE_5").key === "INTL_CAMBRIDGE", "TEMPLATE_5 is Cambridge pathway");

assert(matchLiberiaColumnKey("SEM1_P1") === "SEM1_P1", "match SEM1_P1");
assert(matchLiberiaColumnKey("FIRST_PERIOD") === "SEM1_P1", "match FIRST_PERIOD");
assert(matchLiberiaColumnKey("SEM1_EX") === "SEM1_EX", "match exam");
assert(matchLiberiaColumnKey("SECOND_SEMESTER_EXAMS") === "SEM2_EX", "match sem2 exam alias");

const payload = assembleReportCardPayload({
  templateKey: "LR_PRIVATE_TWO_SEM_A",
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
assert(math?.cells.SEM1_P1?.score === 95, "math P1 score");
assert(math?.cells.SEM1_P2?.score === 68, "math P2 score");
assert(math?.sem1Avg != null && math.sem1Avg > 0, "math sem1 average computed");
assert(math?.average != null && math.average > 0, "math average computed");
assert(math?.letter != null && math.letter.length > 0, "math letter from Liberian legend");
assert(payload.aggregates.attendanceRate === null, "no fake attendance");
assert(payload.aggregates.classPosition === null, "no fake position");
assert(payload.columns.some((c) => c.roman === "I"), "Roman period columns");

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
