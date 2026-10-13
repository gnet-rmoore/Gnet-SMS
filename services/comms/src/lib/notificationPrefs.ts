/** School notification preference keys + defaults (Comms). */

export const NOTIFICATION_EVENT_KEYS = [
  "ADMISSION_STATUS",
  "FEE_DUE",
  "FEE_PAID",
  "ANNOUNCEMENT",
  "ATTENDANCE_ALERT",
  "LEAVE_DECISION",
  "LEAVE_SUBMITTED",
  "GRADE_RETURNED",
  "GRADE_APPROVED",
  "GRADE_RELEASED",
  "PTA_MEETING",
  "PTA_VOLUNTEER",
  "PTA_CAMPAIGN",
  "WORK_ORDER_ASSIGNED",
  "WORK_ORDER_COMPLETED",
  "LESSON_PLAN_SUBMITTED",
  "LESSON_PLAN_APPROVED",
  "LESSON_PLAN_RETURNED",
  "EXAM_PAPER_SUBMITTED",
  "EXAM_PAPER_APPROVED",
  "EXAM_PAPER_RETURNED",
  "ONLINE_EXAM_SUBMITTED",
] as const;

export type NotificationEventKey = (typeof NOTIFICATION_EVENT_KEYS)[number];

export type NotificationPref = {
  eventKey: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  label?: string | null;
  description?: string | null;
  isCustom?: boolean;
};

export function defaultPrefsForSchool(): NotificationPref[] {
  return NOTIFICATION_EVENT_KEYS.map((eventKey) => ({
    eventKey,
    emailEnabled: true,
    inAppEnabled: true,
    isCustom: false,
  }));
}

export function isKnownEventKey(key: string): boolean {
  return (NOTIFICATION_EVENT_KEYS as readonly string[]).includes(key);
}

/** Normalize a custom category key to UPPER_SNAKE (max 64 chars). */
export function normalizeCustomEventKey(input: string): string | null {
  if (!input || typeof input !== "string") return null;
  const k = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(k)) return null;
  return k;
}

export function slugFromLabel(label: string): string | null {
  return normalizeCustomEventKey(label);
}
