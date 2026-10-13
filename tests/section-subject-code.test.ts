import assert from "node:assert/strict";
import {
  buildSectionSubjectCode,
  buildSubjectRoomName,
  deriveSectionSuffix,
} from "../services/classroom/src/lib/sectionSubjectCode.ts";

assert.equal(deriveSectionSuffix("Grade 2 A"), "2A");
assert.equal(deriveSectionSuffix("Grade 2 B"), "2B");
assert.equal(deriveSectionSuffix("Grade 10-A"), "10A");
assert.equal(buildSectionSubjectCode("ENG", "Grade 2 A"), "ENG-2A");
assert.equal(buildSectionSubjectCode("ENG", "Grade 2 B"), "ENG-2B");
assert.notEqual(
  buildSectionSubjectCode("ENG", "Grade 2 A"),
  buildSectionSubjectCode("ENG", "Grade 2 B")
);
assert.equal(buildSubjectRoomName("Grade 2 A", "English"), "Grade 2 A - English");

console.log("section-subject-code.test.ts: ok");
