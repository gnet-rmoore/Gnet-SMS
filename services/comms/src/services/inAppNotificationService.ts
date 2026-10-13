import prisma from "../lib/prisma";
import { notificationPreferenceService } from "./notificationPreferenceService";
import { notificationEmailService } from "./notificationEmailService";
import { navKeyForNotification } from "../lib/navBadgeMap";

export type CreateInAppNotificationInput = {
  schoolId: string;
  userId: string;
  eventKey: string;
  title: string;
  body: string;
  href?: string | null;
  meta?: Record<string, unknown> | null;
  /** When true, skip school preference check (caller already decided). */
  force?: boolean;
  /** When true, skip email channel even if school prefs allow it. */
  skipEmail?: boolean;
  /** Optional — avoids Identity lookup when fan-out already has email. */
  recipientEmail?: string | null;
};

export const inAppNotificationService = {
  async create(input: CreateInAppNotificationInput) {
    const inAppOn =
      input.force ||
      (await notificationPreferenceService.isEnabled(
        input.schoolId,
        input.eventKey,
        "inApp"
      ));

    let row = null;
    if (inAppOn) {
      row = await prisma.inAppNotification.create({
        data: {
          schoolId: input.schoolId,
          userId: input.userId,
          eventKey: input.eventKey,
          title: input.title.slice(0, 200),
          body: input.body.slice(0, 2000),
          href: input.href ? String(input.href).slice(0, 500) : null,
          meta: input.meta ? JSON.stringify(input.meta).slice(0, 4000) : null,
        },
      });
    }

    if (!input.skipEmail) {
      const emailOn = await notificationPreferenceService.isEnabled(
        input.schoolId,
        input.eventKey,
        "email"
      );
      if (emailOn) {
        void notificationEmailService
          .sendForNotification(input)
          .catch((err) =>
            console.warn("[comms] notification email failed:", err?.message || err)
          );
      }
    }

    return row;
  },

  async createMany(
    inputs: CreateInAppNotificationInput[]
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;
    for (const input of inputs) {
      const row = await this.create(input);
      if (row) created++;
      else skipped++;
    }
    return { created, skipped };
  },

  async listForUser(
    userId: string,
    opts?: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
      schoolId?: string;
      /** When true, return `{ items, total, page, pageSize }` instead of a bare array. */
      paged?: boolean;
    }
  ) {
    const limit = Math.min(Math.max(opts?.limit || 30, 1), 100);
    const offset = Math.max(0, opts?.offset || 0);
    const where = {
      userId,
      ...(opts?.schoolId ? { schoolId: opts.schoolId } : {}),
      ...(opts?.unreadOnly ? { readAt: null } : {}),
    };

    if (opts?.paged) {
      const [total, items] = await Promise.all([
        prisma.inAppNotification.count({ where }),
        prisma.inAppNotification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
        }),
      ]);
      const page = Math.floor(offset / limit) + 1;
      return { items, total, page, pageSize: limit };
    }

    return prisma.inAppNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset > 0 ? offset : undefined,
    });
  },

  async unreadCount(userId: string, schoolId?: string) {
    return prisma.inAppNotification.count({
      where: {
        userId,
        readAt: null,
        ...(schoolId ? { schoolId } : {}),
      },
    });
  },

  /** Unread counts keyed by sidebar navKey for the current user. */
  async navBadges(userId: string, schoolId?: string) {
    const rows = await prisma.inAppNotification.findMany({
      where: {
        userId,
        readAt: null,
        ...(schoolId ? { schoolId } : {}),
      },
      select: { eventKey: true, href: true },
      take: 500,
    });
    const badges: Record<string, number> = {};
    for (const row of rows) {
      const key = navKeyForNotification(row);
      badges[key] = (badges[key] || 0) + 1;
    }
    return badges;
  },

  async markRead(id: string, userId: string) {
    const row = await prisma.inAppNotification.findUnique({ where: { id } });
    if (!row || row.userId !== userId) {
      throw Object.assign(new Error("Notification not found"), { status: 404 });
    }
    if (row.readAt) return row;
    return prisma.inAppNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  },

  async markAllRead(userId: string, schoolId?: string) {
    const result = await prisma.inAppNotification.updateMany({
      where: {
        userId,
        readAt: null,
        ...(schoolId ? { schoolId } : {}),
      },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  },
};
