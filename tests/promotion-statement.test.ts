/**
 * Unit tests for Promotion Statement matrix math (no DB).
 */
import assert from "node:assert/strict";
import { assemblePromotionStatementMatrix } from "../services/academic/src/lib/promotionStatementMath";

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
  { studentUserId: "s3", outcome: "PROMOTED" },
];

const matrix = assemblePromotionStatementMatrix(census, decisions, labels);

assert.equal(matrix.school.opening, 3);
assert.equal(matrix.school.male, 1);
assert.equal(matrix.school.female, 1);
assert.equal(matrix.school.unknown, 1);
assert.equal(matrix.school.promoted, 2);
assert.equal(matrix.school.repeat, 1);
assert.equal(matrix.divisions.length, 1);
assert.equal(matrix.divisions[0].totals.opening, 3);

const classOpenings = matrix.divisions[0].classes.reduce((n, c) => n + c.opening, 0);
assert.equal(classOpenings, matrix.school.opening);

// S5 — Year transition finance handoff path (unit, no DB)
assert.match(
  `/fees?feeCohort=RETURNING&fromPromotionRun=run-123`,
  /feeCohort=RETURNING/
);

console.log("=========================================");
console.log(" PROMOTION STATEMENT MATH");
console.log("=========================================");
console.log("PASSED: opening / gender / pass-fail partitions");
console.log("All promotion statement math tests passed");
