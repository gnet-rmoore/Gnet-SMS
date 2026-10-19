/**
 * Quarterly report-card helpers (Wisteria layouts).
 * Run: npx tsx tests/report-card-quarterly.test.ts
 */
import {
  applyTenantBrand,
  buildPeriodSubjectRows,
  buildQuarterlySubjectRows,
  inferQuarterFromCode,
  inferQuarterFromTitle,
  overallAverage,
  periodAverage,
  quarterAverage,
  resolvePeriodColumns,
} from "../src/features/report-cards/components/international/quarterlyHelpers.ts";
import {
  getReportCardTemplateDef,
} from "../src/features/report-cards/registry.ts";

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
console.log(" REPORT CARD QUARTERLY HELPERS");
console.log("=========================================\n");

assert(inferQuarterFromCode("Q2") === "Q2", "Q2 code");
assert(inferQuarterFromCode("SEM1_P1") === "Q1", "SEM1_P1 → Q1");
assert(inferQuarterFromCode("FIN") === "Q4", "FIN → Q4");
assert(inferQuarterFromTitle("2nd Grading Period") === "Q2", "title → Q2");
assert(inferQuarterFromTitle("End of Term Exam") === "Q1", "unknown title defaults Q1");

assert(getReportCardTemplateDef("INTL_WISTERIA_GREEN").label.includes("Green"), "green def");

const rows = buildQuarterlySubjectRows(
  [
    {
      id: "1",
      score: 88,
      subject: { id: "m", name: "Math", code: "MTH" },
      examComponent: { shortCode: "Q1" },
    },
    {
      id: "2",
      score: 76,
      subject: { id: "m", name: "Math", code: "MTH" },
      examComponent: { shortCode: "Q2" },
    },
    {
      id: "3",
      score: 90,
      subject: { id: "e", name: "English", code: "ENG" },
    },
  ],
  "Quarter 3 Report"
);

assert(rows.length === 2, `two subjects (${rows.length})`);
const math = rows.find((r) => r.name === "Math")!;
assert(math.cells.Q1 === 88 && math.cells.Q2 === 76, "math multi-period");
const eng = rows.find((r) => r.name === "English")!;
assert(eng.cells.Q3 === 90, "english lone score uses title quarter Q3");
assert(eng.cells.Q1 == null && eng.cells.Q2 == null, "english other quarters empty");

assert(quarterAverage(rows, "Q1") === 88, "Q1 avg math only");
assert(overallAverage(rows) === 84.7, `overall avg (${overallAverage(rows)})`);

const semCols = resolvePeriodColumns([
  {
    id: "p1",
    label: "First Semester",
    shortCode: "SEM1",
    orderIndex: 0,
    examComponents: [{ shortCode: "MID" }, { shortCode: "Q1" }],
  },
  {
    id: "p2",
    label: "Second Semester",
    shortCode: "SEM2",
    orderIndex: 1,
    examComponents: [{ shortCode: "FIN" }],
  },
]);
assert(semCols.length === 2, "calendar resolves 2 periods");
assert(semCols[0].label === "First Semester", "uses calendar label");

const calRows = buildPeriodSubjectRows(
  [
    {
      id: "1",
      score: 91,
      subject: { id: "m", name: "Math", code: "MTH" },
      examComponent: { shortCode: "MID" },
    },
    {
      id: "2",
      score: 70,
      subject: { id: "m", name: "Math", code: "MTH" },
      examComponent: { shortCode: "FIN" },
    },
  ],
  semCols
);
assert(calRows[0].cells.p1 === 91, "nested component maps to semester 1");
assert(calRows[0].cells.p2 === 70, "FIN maps to semester 2");
assert(periodAverage(calRows, "p1") === 91, "period avg");

const tinted = applyTenantBrand({ ink: "#1a4d3e", bar: "#1a4d3e" }, "#0f766e");
assert(tinted.ink === "#0f766e" && tinted.bar === "#0f766e", "brand tint applies");
const untinted = applyTenantBrand({ ink: "#1a4d3e", bar: "#1a4d3e" }, null);
assert(untinted.ink === "#1a4d3e", "missing brand keeps PDF default");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All quarterly report-card tests passed");
