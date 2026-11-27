import { resolveOrganizationType } from "../classrooms/utils";

export function requiresSpecialistTeacher(
  classGroup: { organizationType?: string | null; ownerTeacherId?: string | null; id?: string } | undefined,
  allClassrooms: any[] = []
): boolean {
  if (!classGroup) return false;
  return resolveOrganizationType(classGroup, allClassrooms) === "DEPARTMENTALIZED";
}

export function resolveSubjectTeacherId(
  classGroup: { organizationType?: string | null; ownerTeacherId?: string | null; id?: string } | undefined,
  allClassrooms: any[],
  selectedTeacherId: string | undefined | null
): string {
  if (selectedTeacherId) return selectedTeacherId;
  if (requiresSpecialistTeacher(classGroup, allClassrooms)) return "";
  return classGroup?.ownerTeacherId || "";
}
