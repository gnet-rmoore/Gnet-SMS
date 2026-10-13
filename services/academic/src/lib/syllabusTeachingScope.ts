import {
  getClassroomsByMember,
  getClassroomsOwnedByTeacher,
} from "./classroomClient";

export type TeachingRoomRef = {
  subjectId?: string | null;
  gradeLevelId?: string | null;
};

/** Member + owned subject rooms where the pair matches (pure, testable). */
export function teacherTeachesSubjectGradePair(
  memberRooms: TeachingRoomRef[],
  ownedRooms: TeachingRoomRef[],
  subjectId: string,
  gradeLevelId: string
): boolean {
  if (!subjectId || !gradeLevelId) return false;
  const matches = (room: TeachingRoomRef) =>
    room.subjectId === subjectId && room.gradeLevelId === gradeLevelId;
  return memberRooms.some(matches) || ownedRooms.some(matches);
}

export async function assertTeacherTeachesSyllabusPair(opts: {
  userId: string;
  schoolId: string;
  subjectId: string;
  gradeLevelId: string;
  role: string;
}) {
  if (opts.role !== "TEACHER") return;

  const [memberRooms, ownedRooms] = await Promise.all([
    getClassroomsByMember(opts.userId, ["TEACHER", "CO_TEACHER"], opts.schoolId),
    getClassroomsOwnedByTeacher(opts.schoolId, opts.userId),
  ]);

  if (
    !teacherTeachesSubjectGradePair(
      memberRooms,
      ownedRooms,
      opts.subjectId,
      opts.gradeLevelId
    )
  ) {
    throw Object.assign(
      new Error(
        "You must be assigned to a subject classroom for this subject and grade level"
      ),
      { status: 403, code: "NOT_TEACHING_PAIR" }
    );
  }
}
