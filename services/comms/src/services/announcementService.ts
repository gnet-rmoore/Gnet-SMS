import prisma from "../lib/prisma";
import { notificationPreferenceService } from "./notificationPreferenceService";
import { inAppNotificationService } from "./inAppNotificationService";
import { getIdentityUsersByIds, getIdentityUsersByRoles } from "../lib/identityClient";

/**
 * Ported from src/server/services/announcementService.ts.
 * Dropped `author.{id,name,role,photoUrl}` Prisma include (Identity-owned)
 * — callers get plain authorId.
 */
export const announcementService = {
  async getAnnouncements(schoolId: string, role?: string, userId?: string) {
    const announcements = await prisma.announcement.findMany({
      where: {
        schoolId,
        ...(role ? { targetRoles: { contains: `"${role}"` } } : {}),
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: userId
        ? {
            acknowledgements: {
              where: { userId },
              select: { id: true, acknowledgedAt: true },
            },
          }
        : undefined,
    });

    return announcements.map((a: any) => {
      const { acknowledgements, ...rest } = a;
      return {
        ...rest,
        targetRoles: JSON.parse(a.targetRoles),
        acknowledgedByMe: Array.isArray(acknowledgements)
          ? acknowledgements.length > 0
          : false,
        acknowledgedAt: acknowledgements?.[0]?.acknowledgedAt ?? null,
      };
    });
  },

  async getAnnouncementsEnriched(schoolId: string, role?: string, userId?: string) {
    const rows = await this.getAnnouncements(schoolId, role, userId);
    const authorIds = rows.map((a) => a.authorId).filter(Boolean);
    const authors = await getIdentityUsersByIds(authorIds);
    return rows.map((a) => {
      const author = authors.get(a.authorId);
      return {
        ...a,
        author: author
          ? { id: author.id, name: author.name, role: author.role }
          : { id: a.authorId, name: "School admin" },
      };
    });
  },

  async acknowledgeAnnouncement(announcementId: string, userId: string) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });
    if (!announcement) {
      throw new Error("Announcement not found");
    }

    const ack = await prisma.announcementAcknowledgement.upsert({
      where: {
        announcementId_userId: { announcementId, userId },
      },
      create: { announcementId, userId },
      update: {},
    });

    return {
      id: ack.id,
      announcementId: ack.announcementId,
      userId: ack.userId,
      acknowledgedAt: ack.acknowledgedAt,
    };
  },

  async createAnnouncement(data: {
    schoolId: string;
    title: string;
    content: string;
    targetRoles: string[];
    authorId: string;
    isPinned?: boolean;
    expiresAt?: Date;
  }) {
    const announcement = await prisma.announcement.create({
      data: { ...data, targetRoles: JSON.stringify(data.targetRoles) },
    });

    const inAppEnabled = await notificationPreferenceService.isEnabled(
      data.schoolId,
      "ANNOUNCEMENT",
      "inApp"
    );
    const emailEnabled = await notificationPreferenceService.isEnabled(
      data.schoolId,
      "ANNOUNCEMENT",
      "email"
    );

    let inAppCreated = 0;
    if ((inAppEnabled || emailEnabled) && Array.isArray(data.targetRoles) && data.targetRoles.length > 0) {
      const users = await getIdentityUsersByRoles(data.schoolId, data.targetRoles);
      const plainBody = String(data.content || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 280);
      const result = await inAppNotificationService.createMany(
        users
          .filter((u) => u.id !== data.authorId)
          .map((u) => ({
            schoolId: data.schoolId,
            userId: u.id,
            eventKey: "ANNOUNCEMENT",
            title: data.title.slice(0, 200),
            body: plainBody || "New school announcement",
            href: "/announcements",
            meta: { announcementId: announcement.id },
            force: inAppEnabled,
            recipientEmail: u.email,
          }))
      );
      inAppCreated = result.created;
    }

    return {
      ...announcement,
      targetRoles: JSON.parse(announcement.targetRoles),
      notification: { emailEnabled, inAppEnabled, inAppCreated },
    };
  },

  async updateAnnouncement(id: string, data: any) {
    const updateData = { ...data };
    if (data.targetRoles) {
      updateData.targetRoles = JSON.stringify(data.targetRoles);
    }

    const announcement = await prisma.announcement.update({ where: { id }, data: updateData });

    return { ...announcement, targetRoles: JSON.parse(announcement.targetRoles) };
  },

  async deleteAnnouncement(id: string) {
    return prisma.announcement.delete({ where: { id } });
  },
};
