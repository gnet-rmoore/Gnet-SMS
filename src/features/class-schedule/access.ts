/** Roles that may create/edit bell periods and timetable entries (legacy fallback). */
export const SCHEDULE_WRITE_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"] as const;

export type ScheduleWriteRole = (typeof SCHEDULE_WRITE_ROLES)[number];

/** Prefer `action.schedules.manage` when the session has a capabilities list. */
export function canEditClassSchedule(
  role: string | undefined | null,
  capabilities?: string[] | null
): boolean {
  if (Array.isArray(capabilities)) {
    return capabilities.includes("action.schedules.manage");
  }
  return Boolean(role && (SCHEDULE_WRITE_ROLES as readonly string[]).includes(role));
}
