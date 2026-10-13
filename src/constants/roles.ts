export const ROLES = [
  "SUPER_ADMIN",
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

export type Role = (typeof ROLES)[number];

export const SCHOOL_ROLES = ROLES.filter((r) => r !== "SUPER_ADMIN");

/** Roles selectable when adding/editing school staff (not students/parents/platform). */
export const STAFF_CREATE_ROLES = ROLES.filter(
  (r) => !["SUPER_ADMIN", "STUDENT", "PARENT"].includes(r)
);

import i18n from "../i18n/instance";

export const STAFF_ROLE_LABELS: Record<string, string> = {
  SCHOOL_ADMIN: "School Admin",
  PRINCIPAL: "Principal",
  VPI: "VP Instruction (Academic)",
  VPA: "VP Admin",
  REGISTRAR: "Registrar",
  TEACHER: "Teacher",
  ACCOUNTANT: "Accountant",
  TRANSPORTATION: "Transportation",
  MAINTENANCE: "Maintenance",
  LIBRARIAN: "Librarian",
  NURSE: "Nurse",
  COUNSELOR: "Counselor",
  SECURITY: "Security",
  IT_ADMIN: "IT Admin",
  PROCUREMENT: "Procurement",
  ATHLETICS_DIRECTOR: "Athletics Director",
  HOSTEL_WARDEN: "Hostel Warden",
  CAFETERIA_MANAGER: "Cafeteria Manager",
};

export function staffRoleLabel(role: string): string {
  const fallback = STAFF_ROLE_LABELS[role] || role.replace(/_/g, " ");
  if (!i18n.isInitialized) return fallback;
  return i18n.t(role, { ns: "roles", defaultValue: fallback });
}

/**
 * Roles that may store an official signature on Profile for documents
 * (admin, academic leaders, finance, nurse, and other school staff).
 * Students and parents are excluded.
 */
export const OFFICIAL_SIGNATURE_ROLES: readonly string[] = [
  "SUPER_ADMIN",
  ...STAFF_CREATE_ROLES,
];

export function canManageOfficialSignature(role?: string | null): boolean {
  if (!role) return false;
  return (OFFICIAL_SIGNATURE_ROLES as readonly string[]).includes(role);
}

/** Year Transition + school-wide Promotion Statement (capture, decide, commit, print). */
export const YEAR_TRANSITION_ROLES = [
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
] as const;

export function canAccessYearTransition(role?: string | null): boolean {
  if (!role) return false;
  return (YEAR_TRANSITION_ROLES as readonly string[]).includes(role);
}

/**
 * Who may add/remove students or co-teachers on a classroom roster.
 * Teachers may view People only; placement is staff-owned.
 */
export const CLASSROOM_MEMBERSHIP_MANAGER_ROLES: readonly string[] = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "REGISTRAR",
  "VPI",
  "VPA",
];

export function canManageClassroomMembership(role?: string | null): boolean {
  if (!role) return false;
  return CLASSROOM_MEMBERSHIP_MANAGER_ROLES.includes(role);
}

export const FEE_STATUSES = ["PENDING", "PAID", "OVERDUE", "PARTIAL", "CANCELLED"] as const;
export const LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
export const GRADE_ENTRY_STATUSES = ["DRAFT", "SUBMITTED", "ACCEPTED", "REJECTED", "RELEASED"] as const;

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
