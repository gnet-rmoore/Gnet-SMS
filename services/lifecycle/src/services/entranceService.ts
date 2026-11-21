import crypto from "node:crypto";
import prisma from "../lib/prisma";
import { getIdentitySchool, getPublicSchoolBySlug } from "../lib/identityClient";
import {
  isEntranceSlotWithinPolicy,
  parseAdmissionPolicy,
  type AdmissionEntranceSlot,
  type AdmissionPolicy,
} from "../domain/admissionPolicy";
import {
  buildStatusUrl,
  normalizeParentEmails,
  sendEntranceScheduledEmail,
  type ParentEmailRecipient,
} from "../lib/applicationEmail";
import { notifyEntranceChange } from "../lib/admissionNotifications";

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function parseParentContacts(rows: unknown): ParentEmailRecipient[] {
  return normalizeParentEmails(rows);
}

async function loadPolicy(schoolId: string): Promise<AdmissionPolicy> {
  const school = await getIdentitySchool(schoolId);
  return parseAdmissionPolicy(school?.admissionPolicy);
}

function slotClosed(policy: AdmissionPolicy): boolean {
  if (!policy.entranceSchedulingEnabled) return true;
  if (!policy.entranceBookingDeadline) return false;
  const deadline = new Date(policy.entranceBookingDeadline);
  return !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now();
}

function canReschedule(policy: AdmissionPolicy, scheduledAt: Date | null): boolean {
  if (!policy.entranceSchedulingEnabled || slotClosed(policy)) return false;
  if (!scheduledAt) return true;
  const cutoff = Number(policy.entranceRescheduleCutoffHours);
  if (!Number.isFinite(cutoff) || cutoff < 0) return true;
  const deadline = new Date(scheduledAt.getTime() - cutoff * 60 * 60 * 1000);
  return Date.now() <= deadline.getTime();
}

function slotBookable(policy: AdmissionPolicy, slot: AdmissionEntranceSlot): boolean {
  const start = new Date(slot.startAt);
  return (
    isEntranceSlotWithinPolicy(policy, slot) &&
    !Number.isNaN(start.getTime()) &&
    start.getTime() > Date.now()
  );
}

function availabilityFor(policy: AdmissionPolicy) {
  return {
    from: policy.entranceAvailableFrom,
    to: policy.entranceAvailableTo,
    weekdays: policy.entranceAvailableWeekdays,
    note: policy.entranceAvailabilityNote,
  };
}

function assertSlotBookable(policy: AdmissionPolicy, slot: AdmissionEntranceSlot) {
  if (!isEntranceSlotWithinPolicy(policy, slot)) {
    throw Object.assign(
      new Error("This entrance date is outside the school's available dates. Please contact the school."),
      { status: 409, code: "ENTRANCE_OUTSIDE_AVAILABILITY" }
    );
  }
  const start = new Date(slot.startAt);
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    throw Object.assign(new Error("This entrance date has already passed. Please choose another date."), {
      status: 409,
      code: "ENTRANCE_SLOT_PAST",
    });
  }
}

async function occupancyBySlot(schoolId: string) {
  const rows = await prisma.admissionApplication.groupBy({
    by: ["entranceSlotId"],
    where: {
      schoolId,
      entranceSlotId: { not: null },
      status: { not: "WITHDRAWN" },
    },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.entranceSlotId as string, r._count._all]));
}

async function serializeSlots(
  schoolId: string,
  slots: AdmissionEntranceSlot[],
  policy: AdmissionPolicy
) {
  const occupied = await occupancyBySlot(schoolId);
  return slots.filter((slot) => slotBookable(policy, slot)).map((slot) => {
    const count = occupied.get(slot.id) || 0;
    return {
      id: slot.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
      location: slot.location || "",
      instructions: slot.instructions || "",
      capacity: slot.capacity,
      seatsLeft: Math.max(0, slot.capacity - count),
    };
  });
}

async function bookingFor(
  app: { entranceSlotId: string | null; entranceScheduledAt: Date | null; entranceLocation: string | null },
  slots: Array<{ id: string; startAt: string; endAt: string; location: string }>
) {
  if (!app.entranceSlotId) return null;
  const slot = slots.find((s) => s.id === app.entranceSlotId);
  return {
    slotId: app.entranceSlotId,
    startAt: slot?.startAt || (app.entranceScheduledAt ? app.entranceScheduledAt.toISOString() : ""),
    endAt: slot?.endAt || "",
    location: app.entranceLocation || slot?.location || "",
  };
}

async function resolveByToken(rawToken: string) {
  const token = String(rawToken || "").trim();
  if (!token) throw Object.assign(new Error("Not found"), { status: 404 });
  const app = await prisma.admissionApplication.findUnique({
    where: { entranceTokenHash: hashToken(token) },
  });
  if (!app || !app.entranceTokenHash) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }
  if (app.entranceTokenExpiresAt && app.entranceTokenExpiresAt.getTime() < Date.now()) {
    throw Object.assign(new Error("Enrollment link has expired. Contact the school."), {
      status: 410,
      code: "ENTRANCE_LINK_EXPIRED",
    });
  }
  return app;
}

async function afterBookingChange(app: any, action: "BOOKED" | "RESCHEDULED" | "CANCELLED", slot?: AdmissionEntranceSlot) {
  const school = await getIdentitySchool(app.schoolId);
  const slug = school?.slug || app.schoolId;
  const parents = parseParentContacts(app.parentContacts);
  const recipients = parents.length
    ? parents
    : app.parentEmail
      ? [{ email: app.parentEmail, role: "GUARDIAN" as const }]
      : [];
  if (slot && recipients.length) {
    void sendEntranceScheduledEmail({
      slug,
      locale: school?.defaultLocale || null,
      recipients,
      application: {
        applicationNumber: app.applicationNumber,
        studentName: app.studentName,
        schoolName: school?.name || "School",
        dateTime: `${new Date(slot.startAt).toLocaleString()} - ${new Date(slot.endAt).toLocaleTimeString()}`,
        location: slot.location || "School campus",
      },
    });
  }
  void notifyEntranceChange(
    {
      id: app.id,
      schoolId: app.schoolId,
      studentName: app.studentName,
      applicationNumber: app.applicationNumber,
      studentUserId: app.studentUserId,
      parentContacts: parents,
      parentEmail: app.parentEmail,
    },
    action,
    slot
      ? {
          dateTime: new Date(slot.startAt).toLocaleString(),
          location: slot.location || "",
        }
      : {}
  );
}

export const entranceService = {
  async getPublicEntrance(slug: string, rawToken: string) {
    const school = await getPublicSchoolBySlug(slug);
    if (!school) throw Object.assign(new Error("School not found"), { status: 404 });
    const app = await resolveByToken(rawToken);
    if (app.schoolId !== school.id) throw Object.assign(new Error("Not found"), { status: 404 });
    const policy = await loadPolicy(app.schoolId);
    if (!policy.entranceSchedulingEnabled) {
      throw Object.assign(new Error("Entrance scheduling is not enabled"), {
        status: 404,
        code: "ENTRANCE_DISABLED",
      });
    }
    const slots = await serializeSlots(app.schoolId, policy.entranceSlots, policy);
    return {
      schoolName: school.name,
      studentName: app.studentName,
      gradeLevelName: app.gradeLevelName,
      deadline: policy.entranceBookingDeadline,
      availability: availabilityFor(policy),
      canReschedule: canReschedule(policy, app.entranceScheduledAt),
      booking: await bookingFor(app, slots),
      slots,
      statusUrl: buildStatusUrl(school.slug),
    };
  },

  async reschedule(rawToken: string, slotId: string, action: "BOOK" | "RESCHEDULE") {
    const token = String(rawToken || "").trim();
    if (!token) throw Object.assign(new Error("Not found"), { status: 404 });
    const preliminary = await resolveByToken(token);
    const policy = await loadPolicy(preliminary.schoolId);
    const slot = policy.entranceSlots.find((s) => s.id === String(slotId || ""));
    if (!slot) throw Object.assign(new Error("Entrance slot not found"), { status: 404 });
    assertSlotBookable(policy, slot);
    if (slotClosed(policy)) {
      throw Object.assign(new Error("Entrance booking deadline has passed"), {
        status: 409,
        code: "ENTRANCE_BOOKING_CLOSED",
      });
    }
    if (action === "RESCHEDULE" && !canReschedule(policy, preliminary.entranceScheduledAt)) {
      throw Object.assign(new Error("This appointment can no longer be rescheduled"), {
        status: 409,
        code: "ENTRANCE_RESCHEDULE_CUTOFF",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${
        "entrance-slot:" + preliminary.schoolId + ":" + slot.id
      }))`;
      const app = await tx.admissionApplication.findUnique({
        where: { entranceTokenHash: hashToken(token) },
      });
      if (!app) throw Object.assign(new Error("Not found"), { status: 404 });
      if (app.entranceTokenExpiresAt && app.entranceTokenExpiresAt.getTime() < Date.now()) {
        throw Object.assign(new Error("Enrollment link has expired. Contact the school."), {
          status: 410,
          code: "ENTRANCE_LINK_EXPIRED",
        });
      }
      if (action === "RESCHEDULE" && !canReschedule(policy, app.entranceScheduledAt)) {
        throw Object.assign(new Error("This appointment can no longer be rescheduled"), {
          status: 409,
          code: "ENTRANCE_RESCHEDULE_CUTOFF",
        });
      }
      if (app.entranceSlotId !== slot.id) {
        const occupied = await tx.admissionApplication.count({
          where: {
            schoolId: app.schoolId,
            entranceSlotId: slot.id,
            status: { not: "WITHDRAWN" },
          },
        });
        if (occupied >= slot.capacity) {
          throw Object.assign(new Error("This entrance slot is full"), {
            status: 409,
            code: "ENTRANCE_SLOT_FULL",
          });
        }
      }
      return tx.admissionApplication.update({
        where: { id: app.id },
        data: {
          entranceSlotId: slot.id,
          entranceScheduledAt: new Date(slot.startAt),
          entranceLocation: slot.location || "",
          entranceStatus: "BOOKED",
          entranceNotes: slot.instructions || null,
          entranceRescheduleCount:
            app.entranceSlotId && app.entranceSlotId !== slot.id
              ? { increment: 1 }
              : app.entranceRescheduleCount,
        },
      });
    });

    const slots = await serializeSlots(updated.schoolId, policy.entranceSlots, policy);
    await afterBookingChange(updated, action === "BOOK" ? "BOOKED" : "RESCHEDULED", slot);
    return {
      ok: true,
      booking: await bookingFor(updated, slots),
      slots,
      availability: availabilityFor(policy),
      canReschedule: canReschedule(policy, updated.entranceScheduledAt),
    };
  },

  async cancel(rawToken: string) {
    const preliminary = await resolveByToken(rawToken);
    const policy = await loadPolicy(preliminary.schoolId);
    if (!preliminary.entranceSlotId) {
      throw Object.assign(new Error("No entrance appointment to cancel"), {
        status: 409,
        code: "ENTRANCE_NO_BOOKING",
      });
    }
    if (!canReschedule(policy, preliminary.entranceScheduledAt)) {
      throw Object.assign(new Error("This appointment can no longer be changed"), {
        status: 409,
        code: "ENTRANCE_RESCHEDULE_CUTOFF",
      });
    }
    const slot = policy.entranceSlots.find((s) => s.id === preliminary.entranceSlotId);
    const updated = await prisma.admissionApplication.update({
      where: { id: preliminary.id },
      data: {
        entranceSlotId: null,
        entranceScheduledAt: null,
        entranceLocation: null,
        entranceNotes: null,
        entranceStatus: "NOT_SCHEDULED",
      },
    });
    const slots = await serializeSlots(updated.schoolId, policy.entranceSlots, policy);
    await afterBookingChange(updated, "CANCELLED", slot);
    return {
      ok: true,
      booking: null,
      slots,
      availability: availabilityFor(policy),
      canReschedule: canReschedule(policy, null),
    };
  },

  async publicSummary(app: any, policy: AdmissionPolicy) {
    const slots = await serializeSlots(app.schoolId, policy.entranceSlots, policy);
    return {
      enabled: policy.entranceSchedulingEnabled && !slotClosed(policy),
      status: app.entranceStatus || (app.entranceSlotId ? "BOOKED" : "NOT_SCHEDULED"),
      deadline: policy.entranceBookingDeadline,
      availability: availabilityFor(policy),
      canReschedule: canReschedule(policy, app.entranceScheduledAt),
      booking: await bookingFor(app, slots),
      slots,
    };
  },
};
