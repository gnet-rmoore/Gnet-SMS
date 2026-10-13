import {
  applyCalendarToSyllabusForm,
  type ActiveCalendar,
  type SyllabusUnitBlock,
} from "../academics-shared/syllabusCalendar";

/** Derive subject/grade options for a teacher from their subject classrooms. */

export type TeachingPair = {
  subjectId: string;
  gradeLevelId: string;
};

export type TeachingScope<TSubject extends { id: string } = { id: string; name?: string; code?: string }> = {
  pairs: TeachingPair[];
  subjects: TSubject[];
  gradeLevels: Array<{ id: string; name?: string }>;
  hasTeachingRooms: boolean;
};

const TEACHING_MEMBER_ROLES = new Set(["TEACHER", "CO_TEACHER"]);

function pairKey(subjectId: string, gradeLevelId: string) {
  return `${subjectId}:${gradeLevelId}`;
}

/** Subject rooms where the user is owner or co-teacher (not assistant-only). */
export function getTeacherTeachingPairs(
  classrooms: Array<{
    subjectId?: string | null;
    gradeLevelId?: string | null;
    ownerTeacherId?: string | null;
    members?: Array<{ userId?: string; role?: string }>;
  }>,
  userId: string | undefined
): TeachingPair[] {
  if (!userId) return [];

  const seen = new Set<string>();
  const pairs: TeachingPair[] = [];

  for (const room of classrooms) {
    if (!room.subjectId || !room.gradeLevelId) continue;

    const isOwner = room.ownerTeacherId === userId;
    const member = room.members?.find((m) => m.userId === userId);
    const memberRole = member?.role;
    const isTeachingMember =
      isOwner || (memberRole != null && TEACHING_MEMBER_ROLES.has(memberRole));

    if (!isTeachingMember) continue;

    const key = pairKey(room.subjectId, room.gradeLevelId);
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ subjectId: room.subjectId, gradeLevelId: room.gradeLevelId });
  }

  return pairs.sort((a, b) =>
    pairKey(a.subjectId, a.gradeLevelId).localeCompare(pairKey(b.subjectId, b.gradeLevelId))
  );
}

export function buildTeachingScope<
  TSubject extends { id: string },
  TGrade extends { id: string },
>(
  classrooms: Parameters<typeof getTeacherTeachingPairs>[0],
  userId: string | undefined,
  subjects: TSubject[],
  gradeLevels: TGrade[]
): TeachingScope<TSubject> & { gradeLevels: TGrade[] } {
  const pairs = getTeacherTeachingPairs(classrooms, userId);
  const subjectIds = new Set(pairs.map((p) => p.subjectId));
  const gradeIds = new Set(pairs.map((p) => p.gradeLevelId));

  return {
    pairs,
    subjects: subjects.filter((s) => subjectIds.has(s.id)),
    gradeLevels: gradeLevels.filter((g) => gradeIds.has(g.id)),
    hasTeachingRooms: pairs.length > 0,
  };
}

export function gradeIdsForSubject(pairs: TeachingPair[], subjectId: string): string[] {
  if (!subjectId) return [];
  return [...new Set(pairs.filter((p) => p.subjectId === subjectId).map((p) => p.gradeLevelId))];
}

export function subjectIdsForGrade(pairs: TeachingPair[], gradeLevelId: string): string[] {
  if (!gradeLevelId) return [];
  return [...new Set(pairs.filter((p) => p.gradeLevelId === gradeLevelId).map((p) => p.subjectId))];
}

export function isValidTeachingPair(
  pairs: TeachingPair[],
  subjectId: string,
  gradeLevelId: string
): boolean {
  if (!subjectId || !gradeLevelId) return false;
  return pairs.some((p) => p.subjectId === subjectId && p.gradeLevelId === gradeLevelId);
}

export function defaultSyllabusFormShell() {
  return {
    title: "",
    subjectId: "",
    gradeLevelId: "",
    calendarPatternId: "",
    academicYear: new Date().getFullYear().toString(),
    standardsFramework: "Cambridge International (CIE)",
    textbooks: "",
    differentiation: "",
    accommodations: "",
    objectives: [""] as string[],
    units: [
      {
        week: "Weeks 1-4",
        topic: "",
        activities: "",
        assessment: "",
        academicPeriodId: "",
      },
    ] as SyllabusUnitBlock[],
    gradingCriteria: [
      { label: "Final Exams", weight: 40 },
      { label: "Mid-Term Exams", weight: 30 },
      { label: "Homework & Quizzes", weight: 20 },
      { label: "Class Participation", weight: 10 },
    ],
    weightsFromCalendar: false,
    status: "PENDING",
  };
}

/** First taught subject/grade pair for teacher syllabus prefill. */
export function defaultTeacherSyllabusPrefill(pairs: TeachingPair[]): Pick<
  ReturnType<typeof defaultSyllabusFormShell>,
  "subjectId" | "gradeLevelId"
> {
  const first = pairs[0];
  if (!first) return { subjectId: "", gradeLevelId: "" };
  return { subjectId: first.subjectId, gradeLevelId: first.gradeLevelId };
}

export function createTeacherSyllabusFormDefaults(
  pairs: TeachingPair[],
  calendar?: ActiveCalendar | null
) {
  return applyCalendarToSyllabusForm(
    {
      ...defaultSyllabusFormShell(),
      ...defaultTeacherSyllabusPrefill(pairs),
    },
    calendar
  );
}

export function createAdminSyllabusFormDefaults(
  subjects: Array<{ id: string }>,
  gradeLevels: Array<{ id: string }>,
  calendar?: ActiveCalendar | null
) {
  return applyCalendarToSyllabusForm(
    {
      ...defaultSyllabusFormShell(),
      subjectId: subjects[0]?.id || "",
      gradeLevelId: gradeLevels[0]?.id || "",
    },
    calendar
  );
}
