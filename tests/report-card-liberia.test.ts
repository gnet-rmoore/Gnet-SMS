/**
 * Liberian and IPREP report-card registry + client assembly.
 * Run: npx tsx tests/report-card-liberia.test.ts
 */
import {
  assembleReportCardPayload,
  getReportCardTemplateDef,
  IPREP_PROGRESS_CLASSIC,
  IPREP_PROGRESS_MODERN,
  IPREP_LEGEND_SCALES,
  isIprepProgressTemplate,
  isIprepReportCardTemplate,
  isIprepSemesterBookletTemplate,
  isLiberianReportCardTemplate,
  liberianProgressReportTitle,
  liberianScoreTone,
  IPREP_SEMESTER_BOOKLET,
  iprepProgressVariant,
  LIBERIA_SENIOR_HIGH_SCALES,
  matchIprepTermKey,
  matchLiberiaColumnKey,
  normalizeTemplateKey,
  signatureForLabel,
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
console.log(" REPORT CARD REGISTRY + ASSEMBLY TESTS");
console.log("=========================================\n");

assert(resolveReportCardTemplateKey("TEMPLATE_1") === IPREP_PROGRESS_CLASSIC, "legacy TEMPLATE_1 → IPREP classic");
assert(resolveReportCardTemplateKey("TEMPLATE_2") === IPREP_PROGRESS_MODERN, "legacy TEMPLATE_2 → IPREP modern");
assert(resolveReportCardTemplateKey("TEMPLATE_3") === IPREP_SEMESTER_BOOKLET, "legacy TEMPLATE_3 → Liberian booklet");
assert(resolveReportCardTemplateKey("LR_PUBLIC_MOE_TWO_SEM") === IPREP_PROGRESS_CLASSIC, "unknown removed key → IPREP classic");
assert(resolveReportCardTemplateKey("") === IPREP_PROGRESS_CLASSIC, "empty key → IPREP classic");
assert(resolveReportCardTemplateKey("INTL_WISTERIA_GREEN") === "INTL_WISTERIA_GREEN", "kept template passthrough");
assert(!isLiberianReportCardTemplate("TEMPLATE_1"), "classic legacy key is not Liberian");
assert(isLiberianReportCardTemplate(IPREP_SEMESTER_BOOKLET), "booklet is Liberian");
assert(isIprepReportCardTemplate("TEMPLATE_2"), "modern legacy key is IPREP");
assert(isIprepSemesterBookletTemplate("TEMPLATE_3"), "booklet legacy key is IPREP semester booklet");

assert(normalizeTemplateKey(" intl-iprep-progress-classic ") === IPREP_PROGRESS_CLASSIC, "key normalization uppercases and trims");
assert(resolveReportCardTemplateKey("intl-iprep-progress-classic") === IPREP_PROGRESS_CLASSIC, "hyphenated/lowercase canonical key resolves");
assert(resolveReportCardTemplateKey("template_2") === IPREP_PROGRESS_MODERN, "normalized legacy key resolves");
assert(resolveReportCardTemplateKey("lr-iprep-semester-booklet") === IPREP_SEMESTER_BOOKLET, "normalized booklet key resolves");
const removed = resolveReportCardTemplateKey("LR_PUBLIC_MOE_TWO_SEM_REMOVED");
assert(isIprepReportCardTemplate(removed) && isIprepProgressTemplate(removed), "removed key routes to IPREP branch");
assert(iprepProgressVariant(removed) === "classic", "removed key uses classic variant");
assert(!isLiberianReportCardTemplate(removed), "removed key does not route to Liberian booklet");

const moe = getReportCardTemplateDef("LR_PUBLIC_MOE_TWO_SEM");
assert(moe.key === IPREP_PROGRESS_CLASSIC, "removed keys resolve to the default IPREP classic");
assert(moe.pages.includes("GRADES"), "default template has grades page");

const groups = reportCardPickerGroups();
assert(groups.length === 2, "two picker groups");
assert(groups.some((group) => group.region === "LR" && group.items.length === 1), "Liberian group has the booklet");
assert(groups.some((group) => group.region === "INTL" && group.items.length === 6), "International group has 6 templates");
assert(
  groups.some((group) => group.items.some((item) => item.key === IPREP_SEMESTER_BOOKLET)),
  "booklet is selectable"
);

assert(matchIprepTermKey("Q1") === "T1", "Q1 maps to T1");
assert(matchIprepTermKey("FIN") === "T3", "FIN maps to T3");
assert(matchIprepTermKey("SEM2_EX") === "T3", "semester exam maps to T3");
assert(matchLiberiaColumnKey("SEM1_P1") === "SEM1_P1", "match SEM1_P1");
assert(matchLiberiaColumnKey("FIRST_PERIOD") === "SEM1_P1", "match FIRST_PERIOD");
assert(matchLiberiaColumnKey("SEM1_EX") === "SEM1_EX", "match exam");
assert(matchLiberiaColumnKey("SECOND_SEMESTER_EXAMS") === "SEM2_EX", "match sem2 exam alias");

const classic = assembleReportCardPayload({
  templateKey: IPREP_PROGRESS_CLASSIC,
  school: { name: "IPREP", address: "Monrovia" },
  student: {
    id: "s1",
    name: "Ada Lovelace",
    classLabel: "Grade 2",
    gradeLevelLabel: "Grade 2",
  },
  academicYearLabel: "2025/2026",
  grades: [
    {
      id: "g1",
      score: 95,
      subject: { id: "math", name: "Mathematics", code: "MTH" },
      examComponent: { shortCode: "Q1" },
    },
    {
      id: "g2",
      score: 85,
      subject: { id: "math", name: "Mathematics", code: "MTH" },
      examComponent: { shortCode: "Q2" },
    },
    {
      id: "g3",
      score: 90,
      subject: { id: "math", name: "Mathematics", code: "MTH" },
      examComponent: { shortCode: "FIN" },
    },
  ],
});

assert(classic.columns.map((column) => column.key).join(",") === "T1,T2,T3", "classic has T1/T2/T3 columns");
const classicMath = classic.subjects.find((subject) => subject.code === "MTH");
assert(classicMath?.cells.T1?.score === 95, "Q1 score maps to T1");
assert(classicMath?.cells.T3?.score === 90, "FIN score maps to T3");
assert(classicMath?.average === 90, "classic subject average is mean of all terms");
assert(classic.aggregates.overallAverage === 90, "classic overall average uses subject averages");
assert(classic.legend.length === IPREP_LEGEND_SCALES.length, "classic uses IPREP legend");
assert(classic.legend.every((row) => typeof row.gpa === "number"), "classic legend includes GPA points");

const booklet = assembleReportCardPayload({
  templateKey: IPREP_SEMESTER_BOOKLET,
  school: { name: "IPREP", address: "Monrovia" },
  student: { id: "s2", name: "Grace", classLabel: "Grade 10", gradeLevelLabel: "Grade 10" },
  academicYearLabel: "2025/2026",
  grades: [
    { id: "b1", score: 80, subject: { id: "m", name: "Math", code: "MTH" }, examComponent: { shortCode: "SEM1_P1" } },
    { id: "b2", score: 90, subject: { id: "m", name: "Math", code: "MTH" }, examComponent: { shortCode: "SEM1_P2" } },
    { id: "b3", score: 70, subject: { id: "m", name: "Math", code: "MTH" }, examComponent: { shortCode: "SEM2_EX" } },
  ],
});
assert(booklet.columns.length === 8, "booklet has eight period/exam columns");
const bookletMath = booklet.subjects.find((subject) => subject.code === "MTH");
assert(bookletMath?.sem1Avg === 85, "booklet semester 1 average");
assert(bookletMath?.yearlyAvg === 77.5, "booklet yearly average");

assert(liberianProgressReportTitle("k-2") === "KINDERGARTEN PROGRESS REPORT CARD", "k-2 → Kindergarten title");
assert(liberianScoreTone(68) === "fail", "68 is fail (<70)");
assert(liberianScoreTone(88) === "pass", "88 is pass");

const empty = assembleReportCardPayload({
  templateKey: IPREP_PROGRESS_CLASSIC,
  school: { name: "Empty School" },
  student: { id: "s3", name: "Blank", classLabel: "", gradeLevelLabel: "9" },
  grades: [],
});
assert(empty.subjects.length === 0, "empty grades → empty subjects");
assert(empty.aggregates.overallAverage === null, "no invented overall average");

const normalizedAssembly = assembleReportCardPayload({
  templateKey: "template-2",
  school: { name: "" },
  student: { id: "s4", name: "Normalized", classLabel: "Grade 3", gradeLevelLabel: "Grade 3" },
  grades: [
    {
      id: "n1",
      score: 72,
      subject: { id: "math", name: "Mathematics", code: "MTH" },
      examComponent: { shortCode: "Q1" },
    },
  ],
});
assert(normalizedAssembly.templateKey === IPREP_PROGRESS_MODERN, "normalized legacy key resolves in assembly");
assert(normalizedAssembly.columns.map((c) => c.key).join(",") === "T1,T2,T3", "normalized legacy key uses IPREP term columns");
assert(normalizedAssembly.school.name === "School", "empty school name keeps fallback");
assert(normalizedAssembly.subjects[0].cells.T1?.letter === "D", "normalized legacy key uses IPREP legend");

const schoolScales = [{ minScore: 0, maxScore: 100, gradeLetter: "P", gpaPoints: 2, remark: "Pass" }];
const withSchoolScales = assembleReportCardPayload({
  templateKey: IPREP_SEMESTER_BOOKLET,
  school: { name: "IPREP" },
  student: { id: "s5", name: "Scales", classLabel: "Grade 10", gradeLevelLabel: "Grade 10" },
  gradeLegends: [{ category: "CLASS", scales: schoolScales }],
  grades: [
    { id: "x1", score: 75, subject: { id: "m", name: "Math", code: "MTH" }, examComponent: { shortCode: "SEM1_P1" } },
  ],
});
assert(withSchoolScales.legend.map((r) => r.letter).join(",") === "P", "Liberian legend prefers supplied school scales");
const withoutSchoolScales = assembleReportCardPayload({
  templateKey: IPREP_SEMESTER_BOOKLET,
  school: { name: "IPREP" },
  student: { id: "s6", name: "Fallback", classLabel: "Grade 10", gradeLevelLabel: "Grade 10" },
  grades: [],
});
assert(withoutSchoolScales.legend.length === LIBERIA_SENIOR_HIGH_SCALES.length, "Liberian legend falls back to senior-high scales");

assert(signatureForLabel("General Manager / Co-Founder", { vpa: { name: "VPA" }, principal: { name: "Principal" } })?.name === "VPA", "general manager label maps to VPA");
assert(signatureForLabel("Co-Founder", { principal: { name: "Principal" } })?.name === "Principal", "co-founder label falls back to principal");
assert(liberianScoreTone(70) === "pass" && liberianScoreTone(69.9) === "fail", "fail tone uses the 70 threshold");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All report card registry + assembly tests passed");
