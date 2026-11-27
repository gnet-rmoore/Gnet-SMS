import assert from "node:assert/strict";
import fs from "node:fs";
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
assert.equal(canonicalGradeName("Year 7A"), "Grade 7");
assert.equal(canonicalGradeName("Form 2A"), "Grade 2");
assert.equal(canonicalGradeName("8A"), "Grade 8");
assert.equal(canonicalGradeName("Grade 8.5"), "Grade 8.5");
assert.equal(canonicalGradeName("Grade 8A Extra"), "Grade 8A Extra");
assert.equal(canonicalGradeName("Grade 8A/B"), "Grade 8A/B");
assert.equal(gradeSectionSuffix("Grade 8A"), "A");
assert.equal(isSectionGradeName("Grade 8A"), true);
assert.equal(isSectionGradeName("8A"), true);
assert.equal(isSectionGradeName("Grade 8"), false);
assert.equal(isSectionGradeName("Grade 8.5"), false);
assert.equal(isSectionGradeName("Grade 8A Extra"), false);

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

assert.deepEqual(
  buildGradeOptions([
    { id: "section", name: "Grade 8A" },
    { id: "nine", name: "Grade 9" },
    { id: "parent", name: "Grade 8" },
  ]).map((grade) => ({ id: grade.id, label: grade.label })),
  [
    { id: "nine", label: "Grade 9" },
    { id: "parent", label: "Grade 8" },
  ]
);

assert.deepEqual(
  buildGradeOptions([
    { id: "decimal", name: "Grade 8.5" },
    { id: "eight", name: "Grade 8" },
  ]).map((grade) => ({ id: grade.id, label: grade.label })),
  [
    { id: "decimal", label: "Grade 8.5" },
    { id: "eight", label: "Grade 8" },
  ]
);

assert.equal(canonicalSubjectName("Mathematics"), "Mathematics");
assert.equal(canonicalSubjectName("Grade 8A - Mathematics"), "Mathematics");
assert.equal(canonicalSubjectName("Mathematics - Grade 9A"), "Mathematics");
assert.equal(canonicalSubjectName("Mathematics-Grade 8A"), "Mathematics");
assert.equal(canonicalSubjectName("3D Design - Studio"), "3D Design - Studio");
assert.equal(canonicalSubjectName("Grade Management - Mathematics"), "Grade Management - Mathematics");

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
assert.equal(subjectRoomLabel("Cartography", "Art"), "Cartography - Art");
assert.equal(reportGradeLabel(null, "Grade 8A"), "Grade 8");
assert.equal(reportGradeLabel("Grade 9", "Grade 8A"), "Grade 9");
assert.equal(reportGradeLabel(null, "Kindergarten A"), "Kindergarten A");
assert.equal(reportGradeLabel("Nursery 2", "Nursery 2"), "Nursery 2");

const sharedHelper = fs.readFileSync(
  new URL("../services/shared/src/lib/gradeSubjectLabels.ts", import.meta.url),
  "utf8"
);
const academicHelper = fs.readFileSync(
  new URL("../services/academic/shared/src/lib/gradeSubjectLabels.ts", import.meta.url),
  "utf8"
);
assert.equal(
  academicHelper.replace(/\r\n/g, "\n"),
  sharedHelper.replace(/\r\n/g, "\n"),
  "academic Docker helper matches shared helper"
);

console.log("grade-subject-labels.test.ts: ok");
