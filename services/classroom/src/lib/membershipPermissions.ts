/**
 * Who may add/remove classroom members (students + co-teachers + assistants).
 * Teachers (including owners / co-teachers / assistants) are view-only on the roster;
 * placement is done by school staff via People, Classrooms, Enrollment, or Registrar.
 */
export const CLASSROOM_MEMBERSHIP_MANAGER_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "REGISTRAR",
  "VPI",
  "VPA",
] as const;

/** Classroom member roles that can teach / post like a teacher. */
export const CLASSROOM_STAFF_MEMBER_ROLES = ["TEACHER", "CO_TEACHER", "ASSISTANT"] as const;

export function canManageClassroomMembership(role?: string | null): boolean {
  if (!role) return false;
  return (CLASSROOM_MEMBERSHIP_MANAGER_ROLES as readonly string[]).includes(role);
}

export function isClassroomStaffMemberRole(role?: string | null): boolean {
  if (!role) return false;
  return (CLASSROOM_STAFF_MEMBER_ROLES as readonly string[]).includes(role);
}
