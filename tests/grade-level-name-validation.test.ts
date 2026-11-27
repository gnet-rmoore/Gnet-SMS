import assert from "node:assert/strict";
import {
  assertValidGradeLevelName,
  assertValidSubjectName,
  gradeLevelNameIssue,
  isComposedSubjectName,
  isSectionGradeName,
} from "../services/academic/src/lib/gradeLevelName.ts";

assert.equal(isSectionGradeName("Grade 8"), false);
assert.equal(isSectionGradeName("Grade 8A"), true);
assert.equal(isSectionGradeName("Grade 8-A"), true);
assert.equal(isSectionGradeName("Class 10-B"), true);
assert.equal(isSectionGradeName("Year 7A"), true);

assert.equal(gradeLevelNameIssue("Grade 8"), null);
assert.equal(gradeLevelNameIssue("Kindergarten"), null);
assert.equal(gradeLevelNameIssue("Grade 8A"), "section");
assert.equal(gradeLevelNameIssue("Class 10-B"), "section");
assert.equal(gradeLevelNameIssue("Grade 8A - Mathematics"), "composed");

assert.throws(() => assertValidGradeLevelName("Grade 8A"), /plain grade level/);
assert.throws(() => assertValidGradeLevelName("Grade 8A - Mathematics"), /plain grade level/);

assert.equal(isComposedSubjectName("Mathematics"), false);
assert.equal(isComposedSubjectName("Mathematics - Algebra"), false);
assert.equal(isComposedSubjectName("Grade 8A - Mathematics"), true);
assert.equal(isComposedSubjectName("Mathematics - Grade 9A"), true);
assert.throws(() => assertValidSubjectName("Grade 8A - Mathematics"), /plain subject name/);

console.log("grade-level-name-validation.test.ts: ok");
