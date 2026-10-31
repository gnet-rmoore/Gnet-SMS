/**
 * Exam authoring scope + exam-settings role rules.
 *
 * Two responsibilities, both encoded once for the whole assessment surface:
 *  1. Teachers may only author questions / submit papers for exams that target a
 *     class and/or subject they actually teach (not other teachers' subjects).
 *  2. Duration, max-violations and retake policy are school-administration
 *     settings for exams; a teacher may configure them for quizzes only.
 *
 * `componentType` on the linked ExamComponent identifies a quiz (see
 * lib/assessmentStructure.ts — columns tagged componentType "QUIZ").
 *
 * The pure predicates are unit-tested in tests/exam-author-scope.test.ts.
 */
import {
  getClassroomsByMember,
  getClassroomsOwnedByTeacher,
} from "./classroomClient";

export type ExamScopeTarget = {
  classId?: string | null;
  subjectId?: string | null;
};

export type TeachingRoomRef = {
  id: string;
  subjectId?: string | null;
  gradeLevelId?: string | null;
};

/** Admin roles that always control exam settings (duration / violations / retakes). */
export const EXAM_SETTINGS_ADMIN_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"];

/** Only school administration may create scheduled school exams. */
export const SCHOOL_EXAM_CREATE_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"];

/** Body keys a teacher may not set on a non-quiz exam. */
export const RESTRICTED_EXAM_SETTING_FIELDS = [
  "duration",
  "maxViolations",
  "kioskConfig",
  "retakePolicy",
] as const;

/** A quiz is identified by its academic assessment component type. */
export function isQuizComponentType(componentType?: string | null): boolean {
  return String(componentType || "").trim().toUpperCase() === "QUIZ";
}

/**
 * Pure predicate: does the teacher's teaching scope cover this exam?
 *  - classId set   → must teach/own that classroom
 *  - subjectId set → must teach that subject (in the exam's class when one is set)
 *  - neither set   → nothing to scope against; allow (school-wide exam).
 */
export function teacherScopeCoversExam(
  rooms: TeachingRoomRef[],
  exam: ExamScopeTarget
): boolean {
  const classId = exam.classId || null;
  const subjectId = exam.subjectId || null;
  if (!classId && !subjectId) return true;

  return rooms.some((room) => {
    if (classId && room.id !== classId) return false;
    if (subjectId && room.subjectId !== subjectId) return false;
    return true;
  });
}

function httpError(message: string, status: number, code?: string) {
  return Object.assign(new Error(message), { status, code });
}

/**
 * Throws 403 when a TEACHER authors content for an exam outside their teaching
 * scope. Non-teaching roles (admin/principal/VPI) bypass entirely.
 */
export async function assertTeacherCanAuthorExam(opts: {
  userId: string;
  schoolId: string;
  role: string;
  exam: ExamScopeTarget;
}): Promise<void> {
  if (opts.role !== "TEACHER") return;

  const [memberRooms, ownedRooms] = await Promise.all([
    getClassroomsByMember(opts.userId, ["TEACHER", "CO_TEACHER"], opts.schoolId),
    getClassroomsOwnedByTeacher(opts.schoolId, opts.userId),
  ]);

  if (!teacherScopeCoversExam([...memberRooms, ...ownedRooms], opts.exam)) {
    throw httpError(
      "You can only author exams for the classes and subjects you teach",
      403,
      "NOT_TEACHING_EXAM"
    );
  }
}

/**
 * Pure guard: only school administration may set duration / max-violations /
 * retake policy on a normal exam. Teachers may set them on quizzes.
 * Throws 403 when a teacher attempts to set a restricted field on a non-quiz.
 */
export function assertCanConfigureExamSettings(
  role: string,
  isQuiz: boolean,
  body: Record<string, unknown> | null | undefined
): void {
  if (EXAM_SETTINGS_ADMIN_ROLES.includes(role)) return;
  if (role !== "TEACHER") return;
  if (isQuiz) return;

  const attempted = RESTRICTED_EXAM_SETTING_FIELDS.filter(
    (field) => body?.[field] !== undefined
  );
  if (attempted.length > 0) {
    throw httpError(
      "Only school administration can set duration, max violations, and retake policy for exams. Teachers may configure these for quizzes only.",
      403,
      "EXAM_SETTINGS_ADMIN_ONLY"
    );
  }
}
