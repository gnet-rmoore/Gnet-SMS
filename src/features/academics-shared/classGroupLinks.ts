/**
 * Homeroom-only filter for admission / enroll cohort pickers.
 * Subject classrooms (subjectId set) must never appear as "grade" or primary cohort options.
 */
export function isClassGroupClassroom(c: {
  subjectId?: string | null;
}): boolean {
  return !c.subjectId;
}

export function filterHomeroomClassrooms<T extends { subjectId?: string | null }>(
  classrooms: T[]
): T[] {
  return classrooms.filter(isClassGroupClassroom);
}

/** Prefer parentClassroomId; fall back to legacy name-prefix association. */
export function subjectRoomsForClassGroup(
  classGroup: { id: string; name: string; gradeLevelId?: string | null },
  subjectClassrooms: Array<{
    id: string;
    name: string;
    subjectId?: string | null;
    gradeLevelId?: string | null;
    parentClassroomId?: string | null;
    subject?: { name?: string | null; code?: string | null } | null;
  }>
) {
  return subjectClassrooms.filter(
    (sc) =>
      !!sc.subjectId &&
      (sc.parentClassroomId === classGroup.id ||
        (sc.name.startsWith(`${classGroup.name} - `) &&
          sc.gradeLevelId === classGroup.gradeLevelId))
  );
}
