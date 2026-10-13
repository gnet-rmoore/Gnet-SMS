/**
 * Tenant-scoped admin password reset policy.
 *
 * - Self-service: allowed (current password enforced elsewhere).
 * - SUPER_ADMIN: may reset anyone (including SCHOOL_ADMIN).
 * - SCHOOL_ADMIN / IT_ADMIN: may reset users in their own school only,
 *   except they cannot reset SCHOOL_ADMIN accounts (only self + SUPER_ADMIN).
 * - All other roles: cannot admin-reset passwords.
 */

export type PasswordActor = {
  id: string;
  role: string;
  schoolId: string | null;
};

export type PasswordTarget = {
  id: string;
  role: string;
  schoolId: string | null;
};

export const PASSWORD_RESET_ROLES = ["SCHOOL_ADMIN", "IT_ADMIN"] as const;

export type PasswordResetDenialCode =
  | "PASSWORD_RESET_FORBIDDEN"
  | "PASSWORD_RESET_CROSS_TENANT"
  | "SCHOOL_ADMIN_PASSWORD_PROTECTED";

export class PasswordResetDeniedError extends Error {
  status = 403;
  code: PasswordResetDenialCode;

  constructor(message: string, code: PasswordResetDenialCode) {
    super(message);
    this.name = "PasswordResetDeniedError";
    this.code = code;
  }
}

/** Whether this actor may admin-reset the target's password (no currentPassword). */
export function canAdminResetPassword(actor: PasswordActor, target: PasswordTarget): boolean {
  if (!actor?.id || !target?.id) return false;
  if (actor.id === target.id) return false; // self is not an "admin reset"
  if (actor.role === "SUPER_ADMIN") return true;
  if (!(PASSWORD_RESET_ROLES as readonly string[]).includes(actor.role)) return false;
  if (!actor.schoolId || !target.schoolId || actor.schoolId !== target.schoolId) return false;
  if (target.role === "SCHOOL_ADMIN") return false;
  if (target.role === "SUPER_ADMIN") return false;
  return true;
}

/**
 * Throws if actor may not set `password` on target.
 * Call for both self and admin paths; self skips admin checks.
 */
export function assertCanSetUserPassword(
  actor: PasswordActor | undefined,
  target: PasswordTarget,
  opts: { isSelfChange: boolean }
): void {
  if (opts.isSelfChange) return;

  if (!actor?.id) {
    throw new PasswordResetDeniedError(
      "Password reset requires an authenticated actor",
      "PASSWORD_RESET_FORBIDDEN"
    );
  }

  if (actor.role === "SUPER_ADMIN") return;

  if (!(PASSWORD_RESET_ROLES as readonly string[]).includes(actor.role)) {
    throw new PasswordResetDeniedError(
      "Only School Admin or IT Admin can reset another user's password",
      "PASSWORD_RESET_FORBIDDEN"
    );
  }

  if (!actor.schoolId || !target.schoolId || actor.schoolId !== target.schoolId) {
    throw new PasswordResetDeniedError(
      "Cannot reset passwords for users outside your school",
      "PASSWORD_RESET_CROSS_TENANT"
    );
  }

  if (target.role === "SCHOOL_ADMIN" || target.role === "SUPER_ADMIN") {
    throw new PasswordResetDeniedError(
      "School Admin passwords can only be changed by that School Admin or a Super Admin",
      "SCHOOL_ADMIN_PASSWORD_PROTECTED"
    );
  }
}
