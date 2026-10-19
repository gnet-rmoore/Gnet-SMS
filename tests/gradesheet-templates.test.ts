/**
 * Gradesheet assemble + registry.
 * Run: npx tsx tests/gradesheet-templates.test.ts
 */
import {
  assembleGradeSheetData,
} from "../src/features/gradesheets/assembleGradeSheet.ts";
import {
  getGradeSheetTemplateDef,
  GRADE_SHEET_TEMPLATES,
  resolveGradeSheetTemplateKey,
} from "../src/features/gradesheets/registry.ts";
import {
  DENSE_SUBJECT_THRESHOLD,
  gradeSheetDensityClass,
  isDenseGradeSheet,
} from "../src/features/gradesheets/density.ts";
import { sampleGradeSheetData } from "../src/features/gradesheets/sampleData.ts";

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
console.log(" GRADESHEET TEMPLATES TESTS");
console.log("=========================================\n");

assert(GRADE_SHEET_TEMPLATES.length === 2, "exactly 2 templates");
assert(getGradeSheetTemplateDef("TEMPLATE_1").pageSize === "a4", "classic is A4");
assert(getGradeSheetTemplateDef("TEMPLATE_2").pageSize === "a4", "modern is A4");

assert(resolveGradeSheetTemplateKey("TEMPLATE_1") === "TEMPLATE_1", "keep TEMPLATE_1");
assert(resolveGradeSheetTemplateKey("TEMPLATE_2") === "TEMPLATE_2", "keep TEMPLATE_2");
assert(resolveGradeSheetTemplateKey("TEMPLATE_3") === "TEMPLATE_1", "removed TEMPLATE_3 → classic");
assert(resolveGradeSheetTemplateKey("TEMPLATE_5") === "TEMPLATE_1", "legacy TEMPLATE_5 → classic");
assert(resolveGradeSheetTemplateKey("TEMPLATE_10") === "TEMPLATE_1", "legacy TEMPLATE_10 → classic");
assert(resolveGradeSheetTemplateKey(null) === "TEMPLATE_1", "null → classic");
assert(resolveGradeSheetTemplateKey("bogus") === "TEMPLATE_1", "unknown → classic");

const data = assembleGradeSheetData({
  studentName: "Ada Lovelace",
  examTitle: "Midterm",
  examDate: "2026-03-01T00:00:00.000Z",
  school: {
    name: "Test Academy",
    address: "Monrovia",
    gradebookConfig: JSON.stringify([
      { shortCode: "CW", label: "Class Work", weightPct: 30, isActive: true },
      { shortCode: "FIN", label: "Final", weightPct: 70, isActive: true },
    ]),
  },
  grades: [
    {
      score: 24,
      subject: { name: "Math", code: "MATH" },
      classroom: { name: "9A" },
      examComponent: { shortCode: "CW" },
    },
    {
      score: 60,
      subject: { name: "Math", code: "MATH" },
      classroom: { name: "9A" },
      examComponent: { shortCode: "FIN" },
    },
    {
      score: 80,
      subject: { name: "English", code: "ENG" },
      classroom: { name: "9A" },
      examComponent: { shortCode: "FIN" },
    },
  ],
  gradeLegends: [
    {
      category: "CLASS",
      scales: [
        { minScore: 90, maxScore: 100, gradeLetter: "A", gpaPoints: 4, remark: "Excellent" },
        { minScore: 70, maxScore: 89, gradeLetter: "B", gpaPoints: 3, remark: "Good" },
        { minScore: 0, maxScore: 69, gradeLetter: "C", gpaPoints: 2, remark: "Fair" },
      ],
    },
  ],
});

assert(data.subjects.length === 2, "two subjects assembled");
const math = data.subjects.find((s) => s.name === "Math");
assert(!!math, "math row present");
assert(math!.ca === 24, `math CA from CW (${math!.ca})`);
assert(math!.exam === 60, `math exam from FIN (${math!.exam})`);
// weighted: 24*0.3 + 60*0.7 = 7.2 + 42 = 49.2
assert(math!.obtained === 49.2, `math weighted avg (${math!.obtained})`);
assert(math!.classAvg === null, "no invented class avg");
assert(data.summary.rank === "—", "no invented rank");
assert(data.attendance.present === null, "no invented attendance");
assert(data.school.crestInitials === "TA", `crest initials (${data.school.crestInitials})`);

assert(!isDenseGradeSheet(9), "9 subjects not dense");
assert(isDenseGradeSheet(10), "10 subjects dense");
assert(isDenseGradeSheet(17), "17 subjects dense");
assert(DENSE_SUBJECT_THRESHOLD === 10, "dense threshold is 10");
assert(gradeSheetDensityClass(17) === "gs-dense", "density class for 17");
assert(gradeSheetDensityClass(5) === "", "no density class for 5");

const sample = sampleGradeSheetData();
assert(sample.subjects.length === 17, `sample preview has 17 subjects (${sample.subjects.length})`);
assert(isDenseGradeSheet(sample.subjects.length), "sample triggers dense layout");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All gradesheet template tests passed");
