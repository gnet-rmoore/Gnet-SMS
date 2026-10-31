import {
  getStudentAcademicCatalogScope,
  getTeacherAcademicCatalogScope,
} from "../services/academic/src/lib/academicCatalogScope.ts";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    failed += 1;
  } else {
    console.log(`PASSED: ${message}`);
  }
}

const teacherScope = getTeacherAcademicCatalogScope([
  { gradeLevelId: "grade-1", subjectId: null },
  { gradeLevelId: "grade-1", subjectId: "math" },
  { gradeLevelId: "grade-2", subjectId: "science" },
  { gradeLevelId: "grade-2", subjectId: "science" },
]);
assert(
  teacherScope.gradeLevelIds.join(",") === "grade-1,grade-2",
  "limits teacher grade levels to assigned classrooms and removes duplicates"
);
assert(
  teacherScope.subjectIds.join(",") === "math,science",
  "limits teacher subjects to assigned subject classrooms"
);

const studentScope = getStudentAcademicCatalogScope("grade-2", [
  { gradeLevelId: "grade-2", subjectId: "science" },
  { gradeLevelId: "grade-2", subjectId: "history" },
]);
assert(
  studentScope.gradeLevelIds.join(",") === "grade-2",
  "limits student grade level to current placement"
);
assert(
  studentScope.subjectIds.join(",") === "science,history",
  "limits student subjects to subject classrooms they belong to"
);
assert(
  getStudentAcademicCatalogScope(null, [
    { gradeLevelId: "grade-2", subjectId: "science" },
    { gradeLevelId: "grade-3", subjectId: "art" },
  ]).subjectIds.join(",") === "science,art",
  "derives student grade and subjects from their own classrooms when placement is missing"
);

if (failed > 0) process.exit(1);
