import {
  getClassroomsByMember,
  getClassroomsOwnedByTeacher,
  listClassroomsBySchool,
} from "./classroomClient";
import { getIdentityUser } from "./identityClient";

type ClassroomCatalogRef = {
  gradeLevelId?: string | null;
  subjectId?: string | null;
};

export type AcademicCatalogScope = {
  gradeLevelIds: string[];
  subjectIds: string[];
};

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function getTeacherAcademicCatalogScope(
  classrooms: ClassroomCatalogRef[]
): AcademicCatalogScope {
  return {
    gradeLevelIds: uniqueIds(classrooms.map((classroom) => classroom.gradeLevelId)),
    subjectIds: uniqueIds(classrooms.map((classroom) => classroom.subjectId)),
  };
}

export function getStudentAcademicCatalogScope(
  gradeLevelId: string | null | undefined,
  classrooms: ClassroomCatalogRef[]
): AcademicCatalogScope {
  const gradeLevelIds = uniqueIds([gradeLevelId]);
  const gradeLevelSet = new Set(gradeLevelIds);
  return {
    gradeLevelIds,
    subjectIds: uniqueIds(
      classrooms
        .filter((classroom) => classroom.gradeLevelId && gradeLevelSet.has(classroom.gradeLevelId))
        .map((classroom) => classroom.subjectId)
    ),
  };
}

export async function getAcademicCatalogScope(
  userId: string,
  schoolId: string,
  role: string
): Promise<AcademicCatalogScope> {
  if (role === "TEACHER") {
    const [memberClassrooms, ownedClassrooms] = await Promise.all([
      getClassroomsByMember(userId, ["TEACHER", "CO_TEACHER"], schoolId),
      getClassroomsOwnedByTeacher(schoolId, userId),
    ]);
    const classroomsById = new Map(
      [...memberClassrooms, ...ownedClassrooms].map((classroom) => [
        classroom.id,
        classroom,
      ])
    );
    return getTeacherAcademicCatalogScope([...classroomsById.values()]);
  }

  if (role === "STUDENT") {
    const user = await getIdentityUser(userId);
    if (!user || user.schoolId !== schoolId || user.role !== "STUDENT") {
      throw new Error("Could not verify the student's academic placement");
    }
    if (!user.gradeLevelId) {
      return { gradeLevelIds: [], subjectIds: [] };
    }
    const classrooms = await listClassroomsBySchool(schoolId);
    return getStudentAcademicCatalogScope(user.gradeLevelId, classrooms);
  }

  return { gradeLevelIds: [], subjectIds: [] };
}
