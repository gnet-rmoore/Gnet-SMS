/**
 * Exam authoring scope + exam-settings role rules.
 * Run: npm run test:exam-author-scope
 */
import {
  assertCanConfigureExamSettings,
  isQuizComponentType,
  teacherScopeCoversExam,
} from "../services/academic/src/lib/examAuthorScope.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed += 1;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

function throws(fn: () => void): { threw: boolean; code?: string; status?: number } {
  try {
    fn();
    return { threw: false };
  } catch (err: any) {
    return { threw: true, code: err?.code, status: err?.status };
  }
}

console.log("=========================================");
console.log(" EXAM AUTHOR SCOPE TESTS");
console.log("=========================================\n");

// --- isQuizComponentType ---
assert(isQuizComponentType("QUIZ"), "QUIZ is a quiz component type");
assert(isQuizComponentType("quiz"), "quiz is case-insensitive");
assert(isQuizComponentType("  QuIz  "), "quiz trims whitespace");
assert(!isQuizComponentType("EXAM"), "EXAM is not a quiz");
assert(!isQuizComponentType("CA"), "CA is not a quiz");
assert(!isQuizComponentType(""), "empty string is not a quiz");
assert(!isQuizComponentType(null), "null is not a quiz");
assert(!isQuizComponentType(undefined), "undefined is not a quiz");

// --- teacherScopeCoversExam ---
const classA = "class-a";
const classB = "class-b";
const subjectMath = "sub-math";
const subjectSci = "sub-sci";

const teacherRooms = [
  { id: classA, subjectId: subjectMath, gradeLevelId: "g10" },
  { id: classB, subjectId: subjectSci, gradeLevelId: "g10" },
];

assert(
  teacherScopeCoversExam(teacherRooms, { classId: classA, subjectId: subjectMath }),
  "teacher covers exam in a class+subject they teach"
);
assert(
  teacherScopeCoversExam(teacherRooms, { classId: classA, subjectId: null }),
  "teacher covers exam by class membership alone"
);
assert(
  teacherScopeCoversExam(teacherRooms, { classId: null, subjectId: subjectMath }),
  "teacher covers exam by subject alone"
);
assert(
  !teacherScopeCoversExam(teacherRooms, { classId: classB, subjectId: subjectMath }),
  "teacher does NOT cover a mismatched class+subject pair"
);
assert(
  !teacherScopeCoversExam(teacherRooms, { classId: null, subjectId: "sub-hist" }),
  "teacher does NOT cover a subject they do not teach"
);
assert(
  !teacherScopeCoversExam(teacherRooms, { classId: "class-z", subjectId: null }),
  "teacher does NOT cover a class they are not in"
);
assert(
  teacherScopeCoversExam(teacherRooms, { classId: null, subjectId: null }),
  "school-wide exam (no class/subject) is not scoped"
);
assert(
  !teacherScopeCoversExam([], { classId: classA, subjectId: null }),
  "teacher with no rooms covers no class-scoped exam"
);
assert(
  !teacherScopeCoversExam([], { classId: null, subjectId: subjectMath }),
  "teacher with no rooms covers no subject-scoped exam"
);

// --- assertCanConfigureExamSettings ---
// Admins may always configure.
for (const role of ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"]) {
  assert(
    !throws(() =>
      assertCanConfigureExamSettings(role, false, {
        duration: 60,
        maxViolations: 3,
        retakePolicy: { maxRetakes: 1 },
      })
    ).threw,
    `${role} may set exam settings on a non-quiz`
  );
}

// Teachers may configure quizzes.
assert(
  !throws(() =>
    assertCanConfigureExamSettings("TEACHER", true, {
      duration: 30,
      maxViolations: 2,
      retakePolicy: { maxRetakes: 2 },
      kioskConfig: { warnAt: 1 },
    })
  ).threw,
  "TEACHER may set exam settings on a quiz"
);

// Teachers may edit non-settings fields on a normal exam.
assert(
  !throws(() =>
    assertCanConfigureExamSettings("TEACHER", false, {
      instructions: "Read carefully",
      classId: classA,
      proctorLevel: "MONITOR",
    })
  ).threw,
  "TEACHER may edit non-settings fields on a non-quiz exam"
);

// Teachers may NOT set restricted settings on a normal exam.
for (const body of [
  { duration: 60 },
  { maxViolations: 5 },
  { retakePolicy: { maxRetakes: 1 } },
  { kioskConfig: { warnAt: 1 } },
]) {
  const result = throws(() =>
    assertCanConfigureExamSettings("TEACHER", false, body)
  );
  assert(
    result.threw && result.code === "EXAM_SETTINGS_ADMIN_ONLY" && result.status === 403,
    `TEACHER is blocked from ${Object.keys(body)[0]} on a non-quiz exam`
  );
}

// A teacher trying several restricted fields is still blocked.
assert(
  throws(() =>
    assertCanConfigureExamSettings("TEACHER", false, {
      duration: 60,
      maxViolations: 3,
      instructions: "ok",
    })
  ).threw,
  "TEACHER is blocked when any restricted field is present on a non-quiz exam"
);

if (failed > 0) {
  console.error(`\n${failed} exam-author-scope assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll exam-author-scope checks passed");
