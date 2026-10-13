/**
 * Teacher syllabus teaching scope helpers.
 * Run: npx tsx tests/teacher-teaching-scope.test.ts
 */
import {
  buildTeachingScope,
  createTeacherSyllabusFormDefaults,
  defaultTeacherSyllabusPrefill,
  getTeacherTeachingPairs,
  gradeIdsForSubject,
  isValidTeachingPair,
  subjectIdsForGrade,
} from "../src/features/curriculum/teacherTeachingScope.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

const userId = "teacher-1";
const classrooms = [
  {
    id: "r1",
    subjectId: "math",
    gradeLevelId: "g10",
    ownerTeacherId: userId,
    members: [],
  },
  {
    id: "r2",
    subjectId: "sci",
    gradeLevelId: "g10",
    ownerTeacherId: "other",
    members: [{ userId, role: "CO_TEACHER" }],
  },
  {
    id: "r3",
    subjectId: "eng",
    gradeLevelId: "g11",
    ownerTeacherId: "other",
    members: [{ userId, role: "ASSISTANT" }],
  },
  {
    id: "h1",
    subjectId: null,
    gradeLevelId: "g10",
    ownerTeacherId: userId,
    members: [],
  },
];

const subjects = [
  { id: "math", name: "Math", code: "MATH" },
  { id: "sci", name: "Science", code: "SCI" },
  { id: "eng", name: "English", code: "ENG" },
  { id: "hist", name: "History", code: "HIST" },
];
const gradeLevels = [
  { id: "g10", name: "Grade 10" },
  { id: "g11", name: "Grade 11" },
  { id: "g12", name: "Grade 12" },
];

console.log("=========================================");
console.log(" TEACHER TEACHING SCOPE TESTS");
console.log("=========================================\n");

const pairs = getTeacherTeachingPairs(classrooms, userId);
assert(pairs.length === 2, "owner + co-teacher subject rooms only");
assert(
  pairs.some((p) => p.subjectId === "math" && p.gradeLevelId === "g10"),
  "includes owned math room"
);
assert(
  pairs.some((p) => p.subjectId === "sci" && p.gradeLevelId === "g10"),
  "includes co-taught science room"
);
assert(!pairs.some((p) => p.subjectId === "eng"), "excludes assistant-only room");
assert(!pairs.some((p) => p.subjectId === null as any), "excludes homeroom");

const scope = buildTeachingScope(classrooms, userId, subjects, gradeLevels);
assert(scope.subjects.length === 2, "scoped subjects count");
assert(scope.gradeLevels.length === 1, "scoped grades count (g10 only)");
assert(scope.hasTeachingRooms, "has teaching rooms");

assert(gradeIdsForSubject(pairs, "math").join() === "g10", "grades for math");
assert(subjectIdsForGrade(pairs, "g10").sort().join() === "math,sci", "subjects for g10");

assert(isValidTeachingPair(pairs, "math", "g10"), "valid pair");
assert(!isValidTeachingPair(pairs, "math", "g11"), "invalid pair grade");
assert(!isValidTeachingPair(pairs, "hist", "g10"), "invalid pair subject");

const prefill = defaultTeacherSyllabusPrefill(pairs);
assert(prefill.subjectId === "math", "prefill uses first pair subject");
assert(prefill.gradeLevelId === "g10", "prefill uses first pair grade");

const form = createTeacherSyllabusFormDefaults(pairs);
assert(form.subjectId === "math" && form.gradeLevelId === "g10", "form defaults from pairs");
assert(form.objectives.length === 1, "form shell includes objectives");

console.log("");
if (failed) {
  console.error(`${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("All teacher teaching scope tests passed");
process.exit(0);
