import {
  getIdentitySchool,
  getStudentParentIds,
  lookupSchoolUserByEmail,
  getUsersByRoles,
} from "./identityClient";
import { notifyInAppMany } from "./notifyInApp";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending review",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WAITLISTED: "Waitlisted",
  FEE_PENDING: "Fee pending",
  DOCS_PENDING: "Documents pending",
  ENROLLED: "Enrolled",
  WITHDRAWN: "Withdrawn",
};

/** Fan-out ADMISSION_STATUS in-app notifications (respects Comms school prefs). */
export async function notifyAdmissionStatusChange(
  app: {
    id: string;
    schoolId: string;
    studentName: string;
    applicationNumber?: string | null;
    parentEmail?: string | null;
    studentUserId?: string | null;
    status: string;
  },
  fromStatus: string
): Promise<void> {
  if (fromStatus === app.status) return;

  try {
    const school = await getIdentitySchool(app.schoolId);
    const slug = school?.slug || app.schoolId;
    const label = STATUS_LABEL[app.status] || app.status;
    const ref = app.applicationNumber || app.id.slice(0, 8);
    const title = "Application status updated";
    const body = `${app.studentName} (${ref}) is now ${label}.`;

    const parentIds = new Set<string>();
    if (app.studentUserId) {
      for (const id of await getStudentParentIds(app.studentUserId)) parentIds.add(id);
    }
    if (app.parentEmail) {
      const parent = await lookupSchoolUserByEmail(app.schoolId, app.parentEmail);
      if (parent?.id) parentIds.add(parent.id);
    }

    const staff = await getUsersByRoles(app.schoolId, ["REGISTRAR", "SCHOOL_ADMIN", "PRINCIPAL"]);
    const staffIds = staff.map((u) => u.id);

    const payloads = [
      ...[...parentIds].map((userId) => ({
        schoolId: app.schoolId,
        userId,
        eventKey: "ADMISSION_STATUS",
        title,
        body,
        href: `/${slug}/my-applications`,
        meta: { applicationId: app.id, status: app.status, fromStatus },
      })),
      ...staffIds.map((userId) => ({
        schoolId: app.schoolId,
        userId,
        eventKey: "ADMISSION_STATUS",
        title,
        body,
        href: "/registrar",
        meta: { applicationId: app.id, status: app.status, fromStatus },
      })),
    ];

    if (payloads.length) await notifyInAppMany(payloads);
  } catch (err: any) {
    console.warn("[admission] status notification failed:", err?.message || err);
  }
}
