import prisma from "../lib/prisma";
import { notificationPreferenceService } from "./notificationPreferenceService";
import { inAppNotificationService } from "./inAppNotificationService";
import {
  getIdentitySchool,
  getIdentityUser,
  getIdentityUsersByIds,
  getIdentityUsersByRoles,
} from "../lib/identityClient";

type HttpError = Error & { status?: number };

function httpError(message: string, status: number): HttpError {
  return Object.assign(new Error(message), { status });
}

async function ptaHref(schoolId: string): Promise<string> {
  const school = await getIdentitySchool(schoolId);
  const slug = school?.slug?.trim();
  return slug ? `/${slug}/pta` : "/pta";
}

async function notifyParents(opts: {
  schoolId: string;
  eventKey: "PTA_MEETING" | "PTA_VOLUNTEER" | "PTA_CAMPAIGN";
  title: string;
  body: string;
  meta?: Record<string, unknown>;
  excludeUserId?: string;
}) {
  try {
    const inAppEnabled = await notificationPreferenceService.isEnabled(
      opts.schoolId,
      opts.eventKey,
      "inApp"
    );
    if (!inAppEnabled) return;

    const [users, href] = await Promise.all([
      getIdentityUsersByRoles(opts.schoolId, ["PARENT"]),
      ptaHref(opts.schoolId),
    ]);

    await inAppNotificationService.createMany(
      users
        .filter((u) => u.id !== opts.excludeUserId)
        .map((u) => ({
          schoolId: opts.schoolId,
          userId: u.id,
          eventKey: opts.eventKey,
          title: opts.title.slice(0, 200),
          body: opts.body.slice(0, 2000),
          href,
          meta: opts.meta ?? null,
          force: true,
        }))
    );
  } catch (err) {
    console.warn("[comms] PTA notify failed:", (err as Error)?.message || err);
  }
}

function fireAndForget(fn: () => Promise<void>) {
  void fn();
}

async function requireOrg(schoolId: string, opts?: { mustBeEnabled?: boolean }) {
  const org = await prisma.ptaOrganization.findUnique({ where: { schoolId } });
  if (!org) throw httpError("PTA is not configured for this school", 404);
  if (opts?.mustBeEnabled && !org.enabled) {
    throw httpError("PTA is not enabled for this school", 403);
  }
  return org;
}

async function ensureOrg(schoolId: string) {
  return prisma.ptaOrganization.upsert({
    where: { schoolId },
    create: {
      schoolId,
      name: "Parent-Teacher Association",
      enabled: false,
    },
    update: {},
  });
}

export async function isPtaOfficer(schoolId: string, userId: string): Promise<boolean> {
  const org = await prisma.ptaOrganization.findUnique({ where: { schoolId } });
  if (!org) return false;
  const membership = await prisma.ptaMembership.findUnique({
    where: {
      organizationId_userId: { organizationId: org.id, userId },
    },
  });
  return membership?.role === "OFFICER";
}

function serializeMeeting(
  meeting: any,
  opts?: { myRsvp?: string | null; goingCount?: number }
) {
  return {
    id: meeting.id,
    schoolId: meeting.schoolId,
    organizationId: meeting.organizationId,
    title: meeting.title,
    description: meeting.description,
    location: meeting.location,
    startsAt: meeting.startsAt,
    endsAt: meeting.endsAt,
    capacity: meeting.capacity,
    published: meeting.published,
    createdById: meeting.createdById,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
    goingCount: opts?.goingCount ?? meeting._count?.rsvps ?? 0,
    myRsvp: opts?.myRsvp ?? null,
  };
}

function serializeVolunteer(
  row: any,
  opts?: { mySignup?: boolean; signupCount?: number }
) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    organizationId: row.organizationId,
    title: row.title,
    description: row.description,
    slots: row.slots,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    published: row.published,
    createdAt: row.createdAt,
    signupCount: opts?.signupCount ?? row._count?.signups ?? 0,
    signedUpByMe: opts?.mySignup ?? false,
  };
}

function serializeCampaign(row: any) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    organizationId: row.organizationId,
    title: row.title,
    description: row.description,
    goalAmount: row.goalAmount,
    raisedAmount: row.raisedAmount,
    currency: row.currency,
    published: row.published,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const ptaService = {
  async getPtaHome(schoolId: string, userId?: string, role?: string) {
    const org = await prisma.ptaOrganization.findUnique({ where: { schoolId } });
    if (!org) {
      return {
        organization: null,
        enabled: false,
        officers: [],
        meetings: [],
        volunteers: [],
        campaigns: [],
        myMembership: null,
      };
    }

    const isStaff =
      role === "SCHOOL_ADMIN" ||
      role === "PRINCIPAL" ||
      role === "SUPER_ADMIN";
    const officer = userId ? await isPtaOfficer(schoolId, userId) : false;

    if (!org.enabled && !isStaff && !officer) {
      throw httpError("PTA is not enabled for this school", 403);
    }

    const publishedOnly = !isStaff && !officer;

    const [officers, meetings, volunteers, campaigns, myMembership] =
      await Promise.all([
        prisma.ptaMembership.findMany({
          where: { organizationId: org.id, role: "OFFICER" },
          orderBy: { createdAt: "asc" },
        }),
        prisma.ptaMeeting.findMany({
          where: {
            organizationId: org.id,
            ...(publishedOnly ? { published: true } : {}),
          },
          orderBy: { startsAt: "asc" },
          include: { _count: { select: { rsvps: { where: { status: "GOING" } } } } },
        }),
        prisma.ptaVolunteerOpportunity.findMany({
          where: {
            organizationId: org.id,
            ...(publishedOnly ? { published: true } : {}),
          },
          orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
          include: { _count: { select: { signups: true } } },
        }),
        prisma.ptaCampaign.findMany({
          where: {
            organizationId: org.id,
            ...(publishedOnly ? { published: true } : {}),
          },
          orderBy: { createdAt: "desc" },
        }),
        userId
          ? prisma.ptaMembership.findUnique({
              where: {
                organizationId_userId: { organizationId: org.id, userId },
              },
            })
          : null,
      ]);

    const officerIds = officers.map((o) => o.userId);
    const officerUsers = await getIdentityUsersByIds(officerIds);

    let myRsvps = new Map<string, string>();
    let mySignups = new Set<string>();
    if (userId) {
      const [rsvps, signups] = await Promise.all([
        prisma.ptaMeetingRsvp.findMany({
          where: { userId, meetingId: { in: meetings.map((m) => m.id) } },
        }),
        prisma.ptaVolunteerSignup.findMany({
          where: {
            userId,
            opportunityId: { in: volunteers.map((v) => v.id) },
          },
        }),
      ]);
      myRsvps = new Map(rsvps.map((r) => [r.meetingId, r.status]));
      mySignups = new Set(signups.map((s) => s.opportunityId));
    }

    return {
      organization: {
        id: org.id,
        schoolId: org.schoolId,
        name: org.name,
        description: org.description,
        enabled: org.enabled,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      },
      enabled: org.enabled,
      officers: officers.map((o) => {
        const user = officerUsers.get(o.userId);
        return {
          userId: o.userId,
          role: o.role,
          createdAt: o.createdAt,
          name: user?.name ?? null,
          email: user?.email ?? null,
        };
      }),
      meetings: meetings.map((m) =>
        serializeMeeting(m, {
          goingCount: m._count.rsvps,
          myRsvp: myRsvps.get(m.id) ?? null,
        })
      ),
      volunteers: volunteers.map((v) =>
        serializeVolunteer(v, {
          signupCount: v._count.signups,
          mySignup: mySignups.has(v.id),
        })
      ),
      campaigns: campaigns.map(serializeCampaign),
      myMembership: myMembership
        ? { role: myMembership.role, createdAt: myMembership.createdAt }
        : null,
    };
  },

  async upsertOrganization(
    schoolId: string,
    data: { name?: string; description?: string | null; enabled?: boolean }
  ) {
    const existing = await prisma.ptaOrganization.findUnique({ where: { schoolId } });
    const name =
      data.name?.trim() ||
      existing?.name ||
      "Parent-Teacher Association";

    const org = await prisma.ptaOrganization.upsert({
      where: { schoolId },
      create: {
        schoolId,
        name,
        description: data.description ?? null,
        enabled: data.enabled ?? false,
      },
      update: {
        ...(data.name !== undefined ? { name: data.name.trim() || name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.enabled !== undefined ? { enabled: Boolean(data.enabled) } : {}),
      },
    });

    return {
      id: org.id,
      schoolId: org.schoolId,
      name: org.name,
      description: org.description,
      enabled: org.enabled,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  },

  async appointOfficer(schoolId: string, userId: string) {
    if (!userId?.trim()) throw httpError("userId is required", 400);

    const user = await getIdentityUser(userId);
    if (!user) throw httpError("User not found", 404);
    if (user.schoolId && user.schoolId !== schoolId) {
      throw httpError("User does not belong to this school", 403);
    }
    if (user.role && user.role !== "PARENT") {
      throw httpError("PTA officers should be PARENT role users", 400);
    }

    const org = await ensureOrg(schoolId);
    const membership = await prisma.ptaMembership.upsert({
      where: {
        organizationId_userId: { organizationId: org.id, userId },
      },
      create: {
        schoolId,
        organizationId: org.id,
        userId,
        role: "OFFICER",
      },
      update: { role: "OFFICER" },
    });

    return {
      userId: membership.userId,
      role: membership.role,
      createdAt: membership.createdAt,
      name: user.name ?? null,
      email: user.email ?? null,
    };
  },

  async removeOfficer(schoolId: string, userId: string) {
    const org = await requireOrg(schoolId);
    const existing = await prisma.ptaMembership.findUnique({
      where: {
        organizationId_userId: { organizationId: org.id, userId },
      },
    });
    if (!existing || existing.role !== "OFFICER") {
      throw httpError("Officer not found", 404);
    }
    await prisma.ptaMembership.delete({
      where: { organizationId_userId: { organizationId: org.id, userId } },
    });
  },

  async listMeetings(schoolId: string, opts: { includeUnpublished: boolean; userId?: string }) {
    await requireOrg(schoolId, { mustBeEnabled: !opts.includeUnpublished });
    const meetings = await prisma.ptaMeeting.findMany({
      where: {
        schoolId,
        ...(opts.includeUnpublished ? {} : { published: true }),
      },
      orderBy: { startsAt: "asc" },
      include: { _count: { select: { rsvps: { where: { status: "GOING" } } } } },
    });

    let myRsvps = new Map<string, string>();
    if (opts.userId) {
      const rsvps = await prisma.ptaMeetingRsvp.findMany({
        where: { userId: opts.userId, meetingId: { in: meetings.map((m) => m.id) } },
      });
      myRsvps = new Map(rsvps.map((r) => [r.meetingId, r.status]));
    }

    return meetings.map((m) =>
      serializeMeeting(m, {
        goingCount: m._count.rsvps,
        myRsvp: myRsvps.get(m.id) ?? null,
      })
    );
  },

  async createMeeting(
    schoolId: string,
    data: {
      title: string;
      description?: string | null;
      location?: string | null;
      startsAt: string | Date;
      endsAt?: string | Date | null;
      capacity?: number | null;
      published?: boolean;
      createdById: string;
    }
  ) {
    const org = await requireOrg(schoolId, { mustBeEnabled: true });
    if (!data.title?.trim()) throw httpError("title is required", 400);
    if (!data.startsAt) throw httpError("startsAt is required", 400);

    const published = Boolean(data.published);
    const meeting = await prisma.ptaMeeting.create({
      data: {
        schoolId,
        organizationId: org.id,
        title: data.title.trim(),
        description: data.description ?? null,
        location: data.location ?? null,
        startsAt: new Date(data.startsAt),
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        capacity: data.capacity ?? null,
        published,
        createdById: data.createdById,
      },
      include: { _count: { select: { rsvps: { where: { status: "GOING" } } } } },
    });

    if (published) {
      fireAndForget(() =>
        notifyParents({
          schoolId,
          eventKey: "PTA_MEETING",
          title: meeting.title,
          body: "A new PTA meeting has been published.",
          meta: { meetingId: meeting.id },
          excludeUserId: data.createdById,
        })
      );
    }

    return serializeMeeting(meeting, { goingCount: 0, myRsvp: null });
  },

  async updateMeeting(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      location?: string | null;
      startsAt?: string | Date;
      endsAt?: string | Date | null;
      capacity?: number | null;
      published?: boolean;
    },
    actorUserId?: string
  ) {
    const existing = await prisma.ptaMeeting.findUnique({ where: { id } });
    if (!existing) throw httpError("Meeting not found", 404);

    const wasPublished = existing.published;
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) {
      if (!data.title.trim()) throw httpError("title is required", 400);
      updateData.title = data.title.trim();
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.startsAt !== undefined) updateData.startsAt = new Date(data.startsAt);
    if (data.endsAt !== undefined) {
      updateData.endsAt = data.endsAt ? new Date(data.endsAt) : null;
    }
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.published !== undefined) updateData.published = Boolean(data.published);

    const meeting = await prisma.ptaMeeting.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { rsvps: { where: { status: "GOING" } } } } },
    });

    if (!wasPublished && meeting.published) {
      fireAndForget(() =>
        notifyParents({
          schoolId: meeting.schoolId,
          eventKey: "PTA_MEETING",
          title: meeting.title,
          body: "A new PTA meeting has been published.",
          meta: { meetingId: meeting.id },
          excludeUserId: actorUserId,
        })
      );
    }

    return serializeMeeting(meeting, { goingCount: meeting._count.rsvps });
  },

  async rsvpMeeting(
    meetingId: string,
    userId: string,
    status: "GOING" | "MAYBE" | "DECLINED"
  ) {
    if (!["GOING", "MAYBE", "DECLINED"].includes(status)) {
      throw httpError("status must be GOING, MAYBE, or DECLINED", 400);
    }

    const meeting = await prisma.ptaMeeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw httpError("Meeting not found", 404);
    if (!meeting.published) throw httpError("Meeting is not published", 403);

    await requireOrg(meeting.schoolId, { mustBeEnabled: true });

    if (status === "GOING" && meeting.capacity != null && meeting.capacity > 0) {
      const goingCount = await prisma.ptaMeetingRsvp.count({
        where: { meetingId, status: "GOING", NOT: { userId } },
      });
      if (goingCount >= meeting.capacity) {
        throw httpError("Meeting is at capacity", 409);
      }
    }

    const rsvp = await prisma.ptaMeetingRsvp.upsert({
      where: { meetingId_userId: { meetingId, userId } },
      create: { meetingId, userId, status },
      update: { status },
    });

    const goingCount = await prisma.ptaMeetingRsvp.count({
      where: { meetingId, status: "GOING" },
    });

    return {
      id: rsvp.id,
      meetingId: rsvp.meetingId,
      userId: rsvp.userId,
      status: rsvp.status,
      createdAt: rsvp.createdAt,
      updatedAt: rsvp.updatedAt,
      goingCount,
    };
  },

  async listVolunteers(schoolId: string, opts: { includeUnpublished: boolean; userId?: string }) {
    await requireOrg(schoolId, { mustBeEnabled: !opts.includeUnpublished });
    const rows = await prisma.ptaVolunteerOpportunity.findMany({
      where: {
        schoolId,
        ...(opts.includeUnpublished ? {} : { published: true }),
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { signups: true } } },
    });

    let mySignups = new Set<string>();
    if (opts.userId) {
      const signups = await prisma.ptaVolunteerSignup.findMany({
        where: {
          userId: opts.userId,
          opportunityId: { in: rows.map((r) => r.id) },
        },
      });
      mySignups = new Set(signups.map((s) => s.opportunityId));
    }

    return rows.map((r) =>
      serializeVolunteer(r, {
        signupCount: r._count.signups,
        mySignup: mySignups.has(r.id),
      })
    );
  },

  async createVolunteer(
    schoolId: string,
    data: {
      title: string;
      description?: string | null;
      slots?: number | null;
      startsAt?: string | Date | null;
      endsAt?: string | Date | null;
      published?: boolean;
      createdById?: string;
    }
  ) {
    const org = await requireOrg(schoolId, { mustBeEnabled: true });
    if (!data.title?.trim()) throw httpError("title is required", 400);

    const published = Boolean(data.published);
    const row = await prisma.ptaVolunteerOpportunity.create({
      data: {
        schoolId,
        organizationId: org.id,
        title: data.title.trim(),
        description: data.description ?? null,
        slots: data.slots ?? null,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        published,
      },
      include: { _count: { select: { signups: true } } },
    });

    if (published) {
      fireAndForget(() =>
        notifyParents({
          schoolId,
          eventKey: "PTA_VOLUNTEER",
          title: row.title,
          body: "A new PTA volunteer opportunity is available.",
          meta: { opportunityId: row.id },
          excludeUserId: data.createdById,
        })
      );
    }

    return serializeVolunteer(row, { signupCount: 0, mySignup: false });
  },

  async signupVolunteer(opportunityId: string, userId: string, notes?: string | null) {
    const opportunity = await prisma.ptaVolunteerOpportunity.findUnique({
      where: { id: opportunityId },
    });
    if (!opportunity) throw httpError("Volunteer opportunity not found", 404);
    if (!opportunity.published) throw httpError("Opportunity is not published", 403);

    await requireOrg(opportunity.schoolId, { mustBeEnabled: true });

    if (opportunity.slots != null && opportunity.slots > 0) {
      const count = await prisma.ptaVolunteerSignup.count({
        where: { opportunityId, NOT: { userId } },
      });
      if (count >= opportunity.slots) {
        throw httpError("Volunteer opportunity is full", 409);
      }
    }

    const signup = await prisma.ptaVolunteerSignup.upsert({
      where: { opportunityId_userId: { opportunityId, userId } },
      create: {
        opportunityId,
        userId,
        notes: notes ?? null,
      },
      update: {
        ...(notes !== undefined ? { notes: notes ?? null } : {}),
      },
    });

    const signupCount = await prisma.ptaVolunteerSignup.count({
      where: { opportunityId },
    });

    return {
      id: signup.id,
      opportunityId: signup.opportunityId,
      userId: signup.userId,
      notes: signup.notes,
      createdAt: signup.createdAt,
      signupCount,
    };
  },

  async listCampaigns(schoolId: string, opts: { includeUnpublished: boolean }) {
    await requireOrg(schoolId, { mustBeEnabled: !opts.includeUnpublished });
    const rows = await prisma.ptaCampaign.findMany({
      where: {
        schoolId,
        ...(opts.includeUnpublished ? {} : { published: true }),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(serializeCampaign);
  },

  async createCampaign(
    schoolId: string,
    data: {
      title: string;
      description?: string | null;
      goalAmount?: number | null;
      raisedAmount?: number | null;
      currency?: string | null;
      published?: boolean;
      startsAt?: string | Date | null;
      endsAt?: string | Date | null;
      createdById?: string;
    }
  ) {
    const org = await requireOrg(schoolId, { mustBeEnabled: true });
    if (!data.title?.trim()) throw httpError("title is required", 400);

    const published = Boolean(data.published);
    const row = await prisma.ptaCampaign.create({
      data: {
        schoolId,
        organizationId: org.id,
        title: data.title.trim(),
        description: data.description ?? null,
        goalAmount: data.goalAmount ?? null,
        raisedAmount: data.raisedAmount ?? 0,
        currency: data.currency ?? null,
        published,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      },
    });

    if (published) {
      fireAndForget(() =>
        notifyParents({
          schoolId,
          eventKey: "PTA_CAMPAIGN",
          title: row.title,
          body: "A new PTA campaign has been published.",
          meta: { campaignId: row.id },
          excludeUserId: data.createdById,
        })
      );
    }

    return serializeCampaign(row);
  },

  async updateCampaign(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      goalAmount?: number | null;
      raisedAmount?: number;
      currency?: string | null;
      published?: boolean;
      startsAt?: string | Date | null;
      endsAt?: string | Date | null;
    },
    actorUserId?: string
  ) {
    const existing = await prisma.ptaCampaign.findUnique({ where: { id } });
    if (!existing) throw httpError("Campaign not found", 404);

    const wasPublished = existing.published;
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) {
      if (!data.title.trim()) throw httpError("title is required", 400);
      updateData.title = data.title.trim();
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.goalAmount !== undefined) updateData.goalAmount = data.goalAmount;
    if (data.raisedAmount !== undefined) {
      if (typeof data.raisedAmount !== "number" || data.raisedAmount < 0) {
        throw httpError("raisedAmount must be a non-negative number", 400);
      }
      updateData.raisedAmount = data.raisedAmount;
    }
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.published !== undefined) updateData.published = Boolean(data.published);
    if (data.startsAt !== undefined) {
      updateData.startsAt = data.startsAt ? new Date(data.startsAt) : null;
    }
    if (data.endsAt !== undefined) {
      updateData.endsAt = data.endsAt ? new Date(data.endsAt) : null;
    }

    const row = await prisma.ptaCampaign.update({
      where: { id },
      data: updateData,
    });

    if (!wasPublished && row.published) {
      fireAndForget(() =>
        notifyParents({
          schoolId: row.schoolId,
          eventKey: "PTA_CAMPAIGN",
          title: row.title,
          body: "A new PTA campaign has been published.",
          meta: { campaignId: row.id },
          excludeUserId: actorUserId,
        })
      );
    }

    return serializeCampaign(row);
  },
};
