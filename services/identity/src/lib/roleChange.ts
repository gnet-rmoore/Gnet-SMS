/**
 * Pure rules for School Admin role assignment (Identity).
 * Keep free of Express/Prisma so unit tests stay lightweight.
 */

export const PLATFORM_ROLE = "SUPER_ADMIN";

/** Roles a school admin may assign within their tenant (not platform). */
export const SCHOOL_ASSIGNABLE_ROLES = [
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
  "TEACHER",
  "STUDENT",
  "PARENT",
  "ACCOUNTANT",
  "TRANSPORTATION",
  "MAINTENANCE",
  "LIBRARIAN",
  "NURSE",
  "COUNSELOR",
  "SECURITY",
  "IT_ADMIN",
  "PROCUREMENT",
  "ATHLETICS_DIRECTOR",
  "HOSTEL_WARDEN",
  "CAFETERIA_MANAGER",
] as const;

export type SchoolAssignableRole = (typeof SCHOOL_ASSIGNABLE_ROLES)[number];

export function isSchoolAssignableRole(role: string): role is SchoolAssignableRole {
  return (SCHOOL_ASSIGNABLE_ROLES as readonly string[]).includes(role);
}

export type RoleChangeActor = {
  id: string;
  role: string;
  schoolId: string | null;
};

export type RoleChangeTarget = {
  id: string;
  role: string;
  schoolId: string | null;
};

export type RoleChangeContext = {
  actor: RoleChangeActor;
  target: RoleChangeTarget;
  nextRole: string;
  /** Count of SCHOOL_ADMIN users in the school *before* this change (including target). */
  schoolAdminCount: number;
};

export type RoleChangeDenial = {
  ok: false;
  status: number;
  error: string;
};

export type RoleChangeAllowed = {
  ok: true;
  fromRole: string;
  toRole: SchoolAssignableRole;
};

export type RoleChangeResult = RoleChangeAllowed | RoleChangeDenial;

/**
 * Validate a School Admin role change. Callers must supply an accurate
 * schoolAdminCount for the target's school.
 */
export function assertSchoolAdminRoleChange(ctx: RoleChangeContext): RoleChangeResult {
  const { actor, target, nextRole, schoolAdminCount } = ctx;

  if (actor.role !== "SCHOOL_ADMIN" && actor.role !== PLATFORM_ROLE) {
    return { ok: false, status: 403, error: "Only School Admins can change user roles" };
  }

  if (actor.role === "SCHOOL_ADMIN") {
    if (!actor.schoolId || !target.schoolId || actor.schoolId !== target.schoolId) {
      return { ok: false, status: 403, error: "Cannot change roles outside your school" };
    }
  }

  if (target.role === PLATFORM_ROLE) {
    return { ok: false, status: 403, error: "Cannot change a platform Super Admin account" };
  }

  if (nextRole === PLATFORM_ROLE || !isSchoolAssignableRole(nextRole)) {
    return { ok: false, status: 400, error: `Invalid role: ${nextRole}` };
  }

  if (target.role === nextRole) {
    return { ok: true, fromRole: target.role, toRole: nextRole };
  }

  const demotingLastAdmin =
    target.role === "SCHOOL_ADMIN" &&
    nextRole !== "SCHOOL_ADMIN" &&
    schoolAdminCount <= 1;

  if (demotingLastAdmin) {
    return {
      ok: false,
      status: 400,
      error: "Cannot remove or demote the last School Admin for this school",
    };
  }

  return { ok: true, fromRole: target.role, toRole: nextRole };
}
