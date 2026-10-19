/**
 * Unit tests for academic results / attendance summary math and the
 * Promotion Statement extras (suspensions + pass/fail roll-up). No DB.
 */
import assert from "node:assert/strict";
import {
  passThresholdFromScales,
  rankBestAttendance,
  rankTopPerformers,
  summarizeAttendance,
  summarizeStudentResults,
  type GradeRowInput,
} from "../services/academic/src/lib/resultsSummaryMath";
import { assemblePromotionStatementMatrix } from "../services/academic/src/lib/promotionStatementMath";

// ---------------------------------------------------------------------------
// Scales + thresholds
// ---------------------------------------------------------------------------

const scales = [
  { minScore: 90, maxScore: 100, gradeLetter: "A", remark: "Distinction" },
  { minScore: 75, maxScore: 89, gradeLetter: "B", remark: "Credit" },
  { minScore: 60, maxScore: 74, gradeLetter: "C", remark: "Pass" },
  { minScore: 40, maxScore: 59, gradeLetter: "D", remark: "Marginal" },
  { minScore: 0, maxScore: 39, gradeLetter: "F", remark: "Fail" },
];

assert.equal(passThresholdFromScales(scales), 60, "lowest pass band wins");
assert.equal(
  passThresholdFromScales([{ minScore: 50, maxScore: 100, gradeLetter: "P", remark: "Pass" }]),
  50,
  "explicit single pass band"
);
assert.equal(passThresholdFromScales([]), 60, "fallback when no legend");
assert.equal(
  passThresholdFromScales([{ minScore: 0, maxScore: 100, gradeLetter: "X", remark: null }]),
  60,
  "fallback when no band is marked pass"
);
console.log("PASSED: threshold derivation");

// ---------------------------------------------------------------------------
// Student results (weighted components, pass/fail)
// ---------------------------------------------------------------------------

const rows: GradeRowInput[] = [
  // s1: maths 70 (CA 60 @ 70%, EXAM 40 @ 70%) + english 80 → 75 overall
  { studentUserId: "s1", subjectId: "math", componentId: "ca", componentWeightPct: 60, scorePercent: 70, score: null, maxScore: null },
  { studentUserId: "s1", subjectId: "math", componentId: "exam", componentWeightPct: 40, scorePercent: 70, score: null, maxScore: null },
  { studentUserId: "s1", subjectId: "eng", componentId: "ca", componentWeightPct: 60, scorePercent: 80, score: null, maxScore: null },
  { studentUserId: "s1", subjectId: "eng", componentId: "exam", componentWeightPct: 40, scorePercent: 80, score: null, maxScore: null },
  // s2: raw score/maxScore normalised (5/10 = 50%) → FAIL
  { studentUserId: "s2", subjectId: "math", componentId: "ca", componentWeightPct: 60, scorePercent: null, score: 5, maxScore: 10 },
  { studentUserId: "s2", subjectId: "math", componentId: "exam", componentWeightPct: 40, scorePercent: null, score: 6, maxScore: 10 },
  // s3: incomplete-ish (nulls only) → no summary
  { studentUserId: "s3", subjectId: "math", componentId: "ca", componentWeightPct: 60, scorePercent: null, score: null, maxScore: null },
];

const summaries = summarizeStudentResults(rows, scales, { passingThreshold: 60 });

const s1 = summaries.get("s1")!;
assert.equal(s1.overallAverage, 75, "component-weighted subject mean then subject average");
assert.equal(s1.passed, true);
assert.equal(s1.subjectsGraded, 2);
assert.equal(s1.letter, "B");

const s2 = summaries.get("s2")!;
assert.equal(s2.overallAverage, 54, "raw scores normalised via maxScore");
assert.equal(s2.passed, false);

assert.equal(summaries.has("s3"), false, "no gradable entry → no summary");
console.log("PASSED: weighted student summaries + pass/fail");

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

const more = summarizeStudentResults(
  [
    ...rows,
    { studentUserId: "s4", subjectId: "math", componentId: "ca", componentWeightPct: 60, scorePercent: 95, score: null, maxScore: null },
    { studentUserId: "s5", subjectId: "math", componentId: "ca", componentWeightPct: 60, scorePercent: 75, score: null, maxScore: null },
  ],
  scales,
  { passingThreshold: 60 }
);
const ranked = rankTopPerformers(more.values());
assert.deepEqual(
  ranked.slice(0, 3).map((r) => r.studentUserId),
  ["s4", "s1", "s5"],
  "ordered by overall average desc"
);
assert.equal(ranked[1].position, 2);
assert.equal(ranked[2].position, 2, "dense ranking shares position on ties");

const tied = rankTopPerformers([
  { studentUserId: "a", overallAverage: 80, subjectsGraded: 1, passed: true, letter: null },
  { studentUserId: "b", overallAverage: 80, subjectsGraded: 1, passed: true, letter: null },
  { studentUserId: "c", overallAverage: 70, subjectsGraded: 1, passed: true, letter: null },
]);
assert.deepEqual(tied.map((t) => t.position), [1, 1, 2]);
console.log("PASSED: performer ranking");

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

const attendance = summarizeAttendance([
  { studentUserId: "s1", status: "PRESENT" },
  { studentUserId: "s1", status: "PRESENT" },
  { studentUserId: "s1", status: "LATE" },
  { studentUserId: "s1", status: "ABSENT" },
  { studentUserId: "s2", status: "PRESENT" },
  { studentUserId: "s2", status: "EXCUSED" },
  { studentUserId: "s3", status: "UNKNOWN" },
]);
assert.equal(attendance.get("s1")!.attendanceRate, 75, "late counts toward attendance");
assert.equal(attendance.get("s1")!.total, 4);
assert.equal(attendance.get("s2")!.attendanceRate, 50);
assert.equal(attendance.get("s3")!.total, 0, "unrecognised status ignored");

const bestAttendance = rankBestAttendance(attendance.values(), { topN: 2, minRecords: 1 });
assert.deepEqual(
  bestAttendance.map((b) => b.studentUserId),
  ["s1", "s2"]
);
assert.equal(bestAttendance[0].attendanceRate, 75);
console.log("PASSED: attendance summary + ranking");

// ---------------------------------------------------------------------------
// Promotion Statement extras (suspended + pass/fail roll-up + DROPPED_OUT)
// ---------------------------------------------------------------------------

const labels = {
  gradeName: { g7: "Grade 7", g8: "Grade 8" },
  divisionName: { d1: "Junior High" },
  classroomName: { c1: "7-A", c2: "7-B" },
  divisionByGrade: { g7: "d1", g8: "d1" },
};
const census = [
  { studentUserId: "s1", gradeLevelId: "g7", divisionId: "d1", classroomId: "c1", gender: "Male" },
  { studentUserId: "s2", gradeLevelId: "g7", divisionId: "d1", classroomId: "c1", gender: "Female" },
  { studentUserId: "s3", gradeLevelId: "g7", divisionId: "d1", classroomId: "c2", gender: null },
];
const decisions = [
  { studentUserId: "s1", outcome: "PROMOTED" },
  { studentUserId: "s2", outcome: "REPEAT" },
  { studentUserId: "s3", outcome: "DROPPED_OUT" },
];
const withExtras = assemblePromotionStatementMatrix(census, decisions, labels, {
  suspendedStudentIds: ["s3", "s404"],
  passFailByStudent: { s1: "PASS", s2: "FAIL", s3: "FAIL" },
});

assert.equal(withExtras.school.suspended, 1, "suspension only counts for census members");
assert.equal(withExtras.school.passed, 1);
assert.equal(withExtras.school.failed, 2);
assert.equal(withExtras.school.droppedOut, 1, "DROPPED_OUT outcome counted");
assert.equal(withExtras.school.opening, 3);

const classRow = withExtras.divisions[0].classes.find((c) => c.classroomName === "7-A")!;
assert.equal(classRow.passed, 1);
assert.equal(classRow.failed, 1);
const noExtras = assemblePromotionStatementMatrix(census, decisions, labels);
assert.equal(noExtras.school.suspended, 0, "extras are optional");
assert.equal(noExtras.school.passed, 0);
console.log("PASSED: statement extras (suspension + pass/fail + dropped out)");

console.log("\nAll results summary tests passed");
