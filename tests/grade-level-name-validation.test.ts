import assert from "node:assert/strict";
import {
  assertValidGradeLevelName,
  assertValidSubjectName,
  canonicalSubjectName,
  gradeLevelNameIssue,
  isClassRoomLabel,
  isComposedSubjectName,
  isSectionGradeName,
} from "../services/academic/src/lib/gradeLevelName.ts";

assert.equal(isSectionGradeName("Grade 8"), false);
assert.equal(isSectionGradeName("Grade 8A"), true);
assert.equal(isSectionGradeName("Grade 8-A"), true);
assert.equal(isSectionGradeName("Class 10-B"), true);
assert.equal(isSectionGradeName("Year 7A"), true);
assert.equal(isSectionGradeName("1A"), true);
assert.equal(isSectionGradeName("Grade 8 STEM"), false);
assert.equal(isSectionGradeName("Grade 8th"), false);
assert.equal(isSectionGradeName("Grade 8A Extra"), false);

assert.equal(gradeLevelNameIssue("Grade 8"), null);
assert.equal(gradeLevelNameIssue("Kindergarten"), null);
assert.equal(gradeLevelNameIssue("Kindergarten A"), null);
assert.equal(gradeLevelNameIssue("Grade 8 STEM"), null);
assert.equal(gradeLevelNameIssue("Grade 8th"), null);
assert.equal(gradeLevelNameIssue("Grade 10 Science"), null);
assert.equal(gradeLevelNameIssue("3D Design - Art"), null);
assert.equal(gradeLevelNameIssue("Grade 8A"), "section");
assert.equal(gradeLevelNameIssue("Class 10-B"), "section");
assert.equal(gradeLevelNameIssue("Grade 8A - Mathematics"), "composed");

assert.throws(() => assertValidGradeLevelName("Grade 8A"), /plain grade level/);
assert.throws(() => assertValidGradeLevelName("Grade 8A - Mathematics"), /plain grade level/);

assert.equal(isComposedSubjectName("Mathematics"), false);
assert.equal(isComposedSubjectName("Mathematics - Algebra"), false);
assert.equal(isComposedSubjectName("3D Design - Art"), false);
assert.equal(isComposedSubjectName("Grade 8A - Mathematics"), true);
assert.equal(isComposedSubjectName("Mathematics - Grade 9A"), true);
assert.equal(isComposedSubjectName("Mathematics-Grade 8A"), true);
assert.equal(isClassRoomLabel("3D Design"), false);
assert.equal(isClassRoomLabel("Grade 8A"), true);
assert.equal(canonicalSubjectName("3D Design - Art"), "3D Design - Art");
assert.throws(() => assertValidSubjectName("Grade 8A - Mathematics"), /plain subject name/);
assert.throws(() => assertValidSubjectName("Mathematics-Grade 8A"), /plain subject name/);

console.log("grade-level-name-validation.test.ts: ok");
