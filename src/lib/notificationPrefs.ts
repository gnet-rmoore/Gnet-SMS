/** School notification preference event keys + defaults (frontend mirror). */

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

export type NotificationPrefRow = {
  eventKey: NotificationEventKey | string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  label?: string;
  description?: string;
  isCustom?: boolean;
};

export const NOTIFICATION_EVENT_META: Record<
  NotificationEventKey,
  { label: string; description: string }
> = {
  ADMISSION_STATUS: {
    label: "Admission status",
    description: "Application accepted, waitlisted, or rejected.",
  },
  FEE_DUE: {
    label: "Fee due",
    description: "Upcoming or overdue fee reminders.",
  },
  FEE_PAID: {
    label: "Fee paid",
    description: "Payment confirmation.",
  },
  ANNOUNCEMENT: {
    label: "Announcements",
    description: "School announcements to targeted roles.",
  },
  ATTENDANCE_ALERT: {
    label: "Attendance alerts",
    description: "Absence or late alerts when enabled.",
  },
  LEAVE_DECISION: {
    label: "Leave decisions",
    description: "Staff leave approved or rejected.",
  },
  LEAVE_SUBMITTED: {
    label: "Leave submitted",
    description: "New leave requests awaiting approval.",
  },
  GRADE_RETURNED: {
    label: "Grades returned",
    description: "In-app alert when leadership returns a grade submission.",
  },
  GRADE_APPROVED: {
    label: "Grades approved",
    description: "In-app alert when leadership approves submitted grades.",
  },
  GRADE_RELEASED: {
    label: "Grades released",
    description: "Results for a child have been released.",
  },
  PTA_MEETING: {
    label: "PTA meetings",
    description: "PTA meeting updates and reminders.",
  },
  PTA_VOLUNTEER: {
    label: "PTA volunteering",
    description: "Volunteer shift updates.",
  },
  PTA_CAMPAIGN: {
    label: "PTA campaigns",
    description: "PTA campaign updates.",
  },
  WORK_ORDER_ASSIGNED: {
    label: "Work order assigned",
    description: "Facility work assigned to you.",
  },
  WORK_ORDER_COMPLETED: {
    label: "Work order completed",
    description: "A work order you requested was completed.",
  },
  LESSON_PLAN_SUBMITTED: {
    label: "Lesson plan submitted",
    description: "A teacher submitted a lesson plan for approval.",
  },
  LESSON_PLAN_APPROVED: {
    label: "Lesson plan approved",
    description: "Leadership approved your lesson plan.",
  },
  LESSON_PLAN_RETURNED: {
    label: "Lesson plan returned",
    description: "Leadership returned a lesson plan with feedback.",
  },
  EXAM_PAPER_SUBMITTED: {
    label: "Exam paper submitted",
    description: "A teacher submitted an exam paper for approval.",
  },
  EXAM_PAPER_APPROVED: {
    label: "Exam paper approved",
    description: "Leadership approved an exam paper.",
  },
  EXAM_PAPER_RETURNED: {
    label: "Exam paper returned",
    description: "Leadership returned an exam paper with feedback.",
  },
  ONLINE_EXAM_SUBMITTED: {
    label: "Online exam submitted",
    description: "A student submitted an online exam attempt.",
  },
};

export function isSystemNotificationKey(key: string): boolean {
  return (NOTIFICATION_EVENT_KEYS as readonly string[]).includes(key);
}

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

export function defaultNotificationPrefs(): NotificationPrefRow[] {
  return NOTIFICATION_EVENT_KEYS.map((eventKey) => ({
    eventKey,
    emailEnabled: true,
    inAppEnabled: true,
    isCustom: false,
    ...NOTIFICATION_EVENT_META[eventKey],
  }));
}

/** Merge API rows with built-in defaults + school custom categories. */
export function mergeNotificationPrefsFromApi(
  rows: Array<{
    eventKey?: string;
    emailEnabled?: boolean;
    inAppEnabled?: boolean;
    label?: string | null;
    description?: string | null;
    isCustom?: boolean;
  }>
): NotificationPrefRow[] {
  const list = Array.isArray(rows) ? rows : [];
  const byKey = new Map(list.map((r) => [String(r.eventKey || ""), r]));

  const system = defaultNotificationPrefs().map((d) => {
    const row = byKey.get(d.eventKey);
    return row
      ? {
          ...d,
          emailEnabled: Boolean(row.emailEnabled),
          inAppEnabled: Boolean(row.inAppEnabled),
        }
      : d;
  });

  const custom = list
    .filter((r) => r.eventKey && !isSystemNotificationKey(String(r.eventKey)))
    .map((r) => ({
      eventKey: String(r.eventKey),
      emailEnabled: rowBool(r.emailEnabled, true),
      inAppEnabled: rowBool(r.inAppEnabled, true),
      label: String(r.label || r.eventKey),
      description: String(r.description || ""),
      isCustom: true,
    }))
    .sort((a, b) => a.eventKey.localeCompare(b.eventKey));

  return [...system, ...custom];
}

function rowBool(v: unknown, fallback: boolean) {
  if (v === undefined || v === null) return fallback;
  return Boolean(v);
}
