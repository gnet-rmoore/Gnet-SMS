import { subjectRoomsForClassGroup } from "../academics-shared/classGroupLinks";

export const ORGANIZATION_TYPES = ["SELF_CONTAINED", "DEPARTMENTALIZED", "MIXED"] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export function inferOrganizationType(
  ownerTeacherId: string | null | undefined,
  subjectOwnerIds: Array<string | null | undefined>
): OrganizationType {
  const owners = subjectOwnerIds.filter((id): id is string => Boolean(id));
  if (owners.length === 0) return "SELF_CONTAINED";
  const primary = ownerTeacherId || "";
  if (owners.every((id) => id === primary)) return "SELF_CONTAINED";
  if (primary ? owners.every((id) => id !== primary) : true) return "DEPARTMENTALIZED";
  return "MIXED";
}

/** Prefer persisted type; otherwise infer from subject-room staffing. */
export function resolveOrganizationType(
  classGroup: { organizationType?: string | null; ownerTeacherId?: string | null },
  allSubjectClassrooms: any[] = []
): OrganizationType {
  const stored = classGroup.organizationType;
  if (stored === "SELF_CONTAINED" || stored === "DEPARTMENTALIZED" || stored === "MIXED") {
    return stored;
  }
  const rooms = subjectRoomsForClassGroup(classGroup as any, allSubjectClassrooms);
  return inferOrganizationType(
    classGroup.ownerTeacherId,
    rooms.map((r: any) => r.ownerTeacherId)
  );
}

/** Shared classroom helpers. */
export function getTeachersForClassGroup(classGroup: any) {
  const list: any[] = [];
  if (classGroup.ownerTeacher) {
    list.push({
      id: classGroup.ownerTeacher.id,
      name: classGroup.ownerTeacher.name,
      photoUrl: classGroup.ownerTeacher.photoUrl,
      email: classGroup.ownerTeacher.email,
      role: "Homeroom Teacher",
    });
  }
  if (classGroup.members) {
    classGroup.members.forEach((m: any) => {
      if ((m.role === "TEACHER" || m.role === "CO_TEACHER" || m.role === "ASSISTANT") && m.user) {
        if (!list.some((u) => u.id === m.user.id)) {
          list.push({
            id: m.user.id,
            name: m.user.name,
            photoUrl: m.user.photoUrl,
            email: m.user.email,
            role:
              m.role === "TEACHER" ? "Teacher" : m.role === "ASSISTANT" ? "Assistant" : "Co-Teacher",
          });
        }
      }
    });
  }
  return list;
}
