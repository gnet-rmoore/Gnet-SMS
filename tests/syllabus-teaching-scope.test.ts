/**
 * Syllabus teaching-pair guard helpers (Academic service).
 * Run: npx tsx tests/syllabus-teaching-scope.test.ts
 */
import { teacherTeachesSubjectGradePair } from "../services/academic/src/lib/syllabusTeachingScope.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

const memberRooms = [
  { subjectId: "sci", gradeLevelId: "g10" },
];
const ownedRooms = [
  { subjectId: "math", gradeLevelId: "g10" },
  { subjectId: null, gradeLevelId: "g10" },
];

console.log("=========================================");
console.log(" SYLLABUS TEACHING SCOPE TESTS");
console.log("=========================================\n");

assert(
  teacherTeachesSubjectGradePair(memberRooms, ownedRooms, "math", "g10"),
  "owned subject room counts"
);
assert(
  teacherTeachesSubjectGradePair(memberRooms, ownedRooms, "sci", "g10"),
  "co-taught member room counts"
);
assert(
  !teacherTeachesSubjectGradePair(memberRooms, ownedRooms, "math", "g11"),
  "wrong grade rejected"
);
assert(
  !teacherTeachesSubjectGradePair(memberRooms, ownedRooms, "hist", "g10"),
  "wrong subject rejected"
);
assert(
  !teacherTeachesSubjectGradePair(memberRooms, ownedRooms, "", "g10"),
  "empty subject rejected"
);
assert(
  !teacherTeachesSubjectGradePair([], [], "math", "g10"),
  "no rooms rejected"
);

console.log("");
if (failed) {
  console.error(`${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("All syllabus teaching scope tests passed");
process.exit(0);
