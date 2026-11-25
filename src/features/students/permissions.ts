export const STUDENT_RECORD_EDIT_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "REGISTRAR",
  "PRINCIPAL",
] as const;

export const STUDENT_STATUS_EDIT_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "REGISTRAR",
] as const;

export function canEditStudentRecord(role?: string | null): boolean {
  return (STUDENT_RECORD_EDIT_ROLES as readonly string[]).includes(role || "");
}

export function canEditStudentStatus(role?: string | null): boolean {
  return (STUDENT_STATUS_EDIT_ROLES as readonly string[]).includes(role || "");
}
