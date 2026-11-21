import {
  getIdentitySchool,
  getStudentParentIds,
  lookupSchoolUserByEmail,
  getUsersByRoles,
} from "./identityClient";
import { notifyInAppMany } from "./notifyInApp";

export type ParentEmailContact = {
  email: string;
  role: "FATHER" | "MOTHER" | "GUARDIAN" | "STUDENT";
};

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

/** Fan-out entrance booking notifications to parents and school staff. */
export async function notifyEntranceChange(
  app: {
    id: string;
    schoolId: string;
    studentName: string;
    applicationNumber?: string | null;
    studentUserId?: string | null;
    parentContacts?: ParentEmailContact[];
    parentEmail?: string | null;
  },
  action: "BOOKED" | "RESCHEDULED" | "CANCELLED",
  details: { dateTime?: string; location?: string }
): Promise<void> {
  try {
    const school = await getIdentitySchool(app.schoolId);
    const slug = school?.slug || app.schoolId;
    const ref = app.applicationNumber || app.id.slice(0, 8);
    const verb =
      action === "BOOKED" ? "scheduled" : action === "RESCHEDULED" ? "rescheduled" : "cancelled";
    const when = details.dateTime ? ` (${details.dateTime})` : "";
    const where = details.location ? ` at ${details.location}` : "";
    const body = `${app.studentName} (${ref}) ${verb} their entrance appointment${when}${where}.`;

    const parentIds = new Set<string>();
    if (app.studentUserId) {
      for (const id of await getStudentParentIds(app.studentUserId)) parentIds.add(id);
    }
    const emails = [
      ...(app.parentContacts || []).map((c) => c.email),
      ...(app.parentEmail ? [app.parentEmail] : []),
    ];
    for (const email of emails) {
      const parent = await lookupSchoolUserByEmail(app.schoolId, email);
      if (parent?.id) parentIds.add(parent.id);
    }

    const staff = await getUsersByRoles(app.schoolId, ["REGISTRAR", "SCHOOL_ADMIN", "PRINCIPAL"]);
    const payloads = [
      ...[...parentIds].map((userId) => ({
        schoolId: app.schoolId,
        userId,
        eventKey: "ADMISSION_STATUS",
        title: "Entrance appointment updated",
        body,
        href: `/${slug}/apply/status`,
        meta: { applicationId: app.id, entranceAction: action },
      })),
      ...staff.map((u) => ({
        schoolId: app.schoolId,
        userId: u.id,
        eventKey: "ADMISSION_STATUS",
        title: "Entrance appointment updated",
        body,
        href: "/registrar",
        meta: { applicationId: app.id, entranceAction: action },
      })),
    ];
    if (payloads.length) await notifyInAppMany(payloads);
  } catch (err: any) {
    console.warn("[admission] entrance notification failed:", err?.message || err);
  }
}
