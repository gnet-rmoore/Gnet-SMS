/** Client-side joins for Classroom IDs → Academic/Identity display fields. */

export type SubjectRef = { id: string; name: string; code?: string };
export type GradeLevelRef = { id: string; name: string };
export type StaffRef = {
  id: string;
  name: string;
  photoUrl?: string | null;
  email?: string | null;
  role?: string;
};

export type EnrichDeps = {
  subjects: SubjectRef[];
  gradeLevels: GradeLevelRef[];
  staff: StaffRef[];
};

export function enrichClassrooms<T extends Record<string, any>>(
  classrooms: T[],
  deps: EnrichDeps
): Array<
  T & {
    subject: SubjectRef | null;
    gradeLevel: GradeLevelRef | null;
    ownerTeacher: StaffRef | null;
    subjectId?: string | null;
    gradeLevelId?: string | null;
    ownerTeacherId?: string | null;
  }
> {
  const subjectById = new Map(deps.subjects.map((s) => [s.id, s]));
  const gradeById = new Map(deps.gradeLevels.map((g) => [g.id, g]));
  const staffById = new Map(deps.staff.map((s) => [s.id, s]));

  return classrooms.map((c) => {
    const subject = c.subjectId ? subjectById.get(c.subjectId) || null : null;
    const gradeLevel = c.gradeLevelId ? gradeById.get(c.gradeLevelId) || null : null;
    const ownerTeacher = c.ownerTeacherId ? staffById.get(c.ownerTeacherId) || null : null;
    const members = Array.isArray(c.members)
      ? c.members.map((m: any) => ({
          ...m,
          user: m.user || staffById.get(m.userId) || null,
        }))
      : c.members;

    return {
      ...c,
      subject,
      gradeLevel,
      ownerTeacher,
      members,
    };
  });
}

/** Attach classroom counts onto grade levels (Academic API no longer includes them). */
export function attachClassroomCountsToGradeLevels<T extends { id: string }>(
  gradeLevels: T[],
  classrooms: Array<{ gradeLevelId?: string | null }>
): Array<T & { _count: { classrooms: number } }> {
  const counts = new Map<string, number>();
  for (const c of classrooms) {
    if (!c.gradeLevelId) continue;
    counts.set(c.gradeLevelId, (counts.get(c.gradeLevelId) || 0) + 1);
  }
  return gradeLevels.map((g) => ({
    ...g,
    _count: { classrooms: counts.get(g.id) || 0 },
  }));
}
