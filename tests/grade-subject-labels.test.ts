import assert from "node:assert/strict";
import {
  buildGradeOptions,
  buildSubjectOptions,
  canonicalGradeName,
  canonicalSubjectName,
  gradeSectionSuffix,
  isSectionGradeName,
  reportGradeLabel,
  subjectRoomLabel,
} from "../src/features/academics-shared/gradeSubjectLabels.ts";

assert.equal(canonicalGradeName("Grade 9"), "Grade 9");
assert.equal(canonicalGradeName("Grade 8A"), "Grade 8");
assert.equal(canonicalGradeName("Grade 8-A"), "Grade 8");
assert.equal(canonicalGradeName("Class 10-B"), "Grade 10");
assert.equal(gradeSectionSuffix("Grade 8A"), "A");
assert.equal(isSectionGradeName("Grade 8A"), true);
assert.equal(isSectionGradeName("Grade 8"), false);

const grades = buildGradeOptions([
  { id: "section-a", name: "Grade 8A" },
  { id: "parent", name: "Grade 8" },
  { id: "section-b", name: "Grade 8B" },
  { id: "nine", name: "Grade 9" },
]);
assert.deepEqual(
  grades.map((grade) => ({ id: grade.id, label: grade.label })),
  [
    { id: "parent", label: "Grade 8" },
    { id: "nine", label: "Grade 9" },
  ]
);

assert.equal(canonicalSubjectName("Mathematics"), "Mathematics");
assert.equal(canonicalSubjectName("Grade 8A - Mathematics"), "Mathematics");
assert.equal(canonicalSubjectName("Mathematics - Grade 9A"), "Mathematics");

const subjects = buildSubjectOptions([
  { id: "dirty", name: "Grade 8A - Mathematics" },
  { id: "math", name: "Mathematics" },
  { id: "english", name: "English Language" },
]);
assert.deepEqual(
  subjects.map((subject) => ({ id: subject.id, label: subject.label })),
  [
    { id: "math", label: "Mathematics" },
    { id: "english", label: "English Language" },
  ]
);

assert.equal(subjectRoomLabel("Grade 8A - Mathematics", "Mathematics"), "Grade 8A - Mathematics");
assert.equal(subjectRoomLabel("Grade 8A", "Mathematics"), "Grade 8A - Mathematics");
assert.equal(reportGradeLabel(null, "Grade 8A"), "Grade 8");
assert.equal(reportGradeLabel("Grade 9", "Grade 8A"), "Grade 9");

console.log("grade-subject-labels.test.ts: ok");
