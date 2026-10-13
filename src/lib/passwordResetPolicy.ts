/**
 * Client-side mirror of identity `passwordResetPolicy` for UI gating.
 * Server remains authoritative.
 */

export type PasswordActor = {
  id: string;
  role: string;
  schoolId?: string | null;
};

export type PasswordTarget = {
  id: string;
  role: string;
};

const RESET_ROLES = new Set(["SCHOOL_ADMIN", "IT_ADMIN"]);

/** Whether the signed-in user may show admin password-reset fields for this staff member. */
export function canAdminResetPassword(actor: PasswordActor | null | undefined, target: PasswordTarget): boolean {
  if (!actor?.id || !target?.id) return false;
  if (actor.id === target.id) return false;
  if (actor.role === "SUPER_ADMIN") return true;
  if (!RESET_ROLES.has(actor.role)) return false;
  if (target.role === "SCHOOL_ADMIN" || target.role === "SUPER_ADMIN") return false;
  return true;
}
