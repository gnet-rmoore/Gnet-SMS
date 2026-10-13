/** Map in-app notification eventKey / href → sidebar navKey. */

export const EVENT_KEY_TO_NAV: Record<string, string> = {
  GRADE_RETURNED: "gradebook",
  GRADE_APPROVED: "gradebook",
  LEAVE_DECISION: "staff-portal",
  LEAVE_SUBMITTED: "leave-approval",
  ANNOUNCEMENT: "announcements",
  FEE_DUE: "fees",
  FEE_PAID: "fees",
  ADMISSION_STATUS: "admissions",
  ATTENDANCE_ALERT: "attendance",
  WORK_ORDER_ASSIGNED: "work-orders",
  WORK_ORDER_COMPLETED: "work-orders",
  LESSON_PLAN_SUBMITTED: "lesson-plans",
  LESSON_PLAN_APPROVED: "lesson-plans",
  LESSON_PLAN_RETURNED: "lesson-plans",
  EXAM_PAPER_SUBMITTED: "exam-paper-review",
  EXAM_PAPER_APPROVED: "exams",
  EXAM_PAPER_RETURNED: "exams",
  ONLINE_EXAM_SUBMITTED: "online-exams",
  PTA_MEETING: "pta",
  PTA_VOLUNTEER: "pta",
  PTA_CAMPAIGN: "pta",
  GRADE_RELEASED: "grades",
};

/** Path segment → navKey when href is present. */
const HREF_SEGMENT_TO_NAV: Record<string, string> = {
  "grade-review": "grade-review",
  gradebook: "gradebook",
  "staff-portal": "staff-portal",
  "leave-approval": "leave-approval",
  announcements: "announcements",
  fees: "fees",
  "my-fees": "fees",
  admissions: "admissions",
  attendance: "attendance",
  "work-orders": "work-orders",
  maintenance: "maintenance",
  "lesson-plans": "lesson-plans",
  "exam-paper-review": "exam-paper-review",
  "online-exams": "online-exams",
  exams: "exams",
  notifications: "notifications",
  dashboard: "dashboard",
  pta: "pta",
  grades: "grades",
};

export function navKeyFromHref(href?: string | null): string | null {
  if (!href) return null;
  try {
    const path = href.startsWith("http") ? new URL(href).pathname : href;
    const parts = path.split("/").filter(Boolean);
    // /{slug}/fees → fees; /fees → fees
    for (let i = parts.length - 1; i >= 0; i--) {
      const seg = parts[i];
      if (HREF_SEGMENT_TO_NAV[seg]) return HREF_SEGMENT_TO_NAV[seg];
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function navKeyForNotification(row: {
  eventKey: string;
  href?: string | null;
}): string {
  return (
    navKeyFromHref(row.href) ||
    EVENT_KEY_TO_NAV[row.eventKey] ||
    "notifications"
  );
}
