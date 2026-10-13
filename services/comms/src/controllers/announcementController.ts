import type { Request, Response } from "express";
import { announcementService } from "../services/announcementService";

/** Ported from src/server/controllers/announcementController.ts */
export const announcementController = {
  async getAnnouncements(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const { role } = req.query;
      const userId = (req as any).user?.id as string | undefined;
      const announcements = await announcementService.getAnnouncementsEnriched(
        schoolId,
        role as string | undefined,
        userId
      );
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async acknowledgeAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id as string | undefined;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const ack = await announcementService.acknowledgeAnnouncement(id, userId);
      res.status(201).json(ack);
    } catch (error: any) {
      const status = error.message === "Announcement not found" ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  },

  async createAnnouncement(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const { title, content, targetRoles, authorId, isPinned, expiresAt } = req.body;
      const announcement = await announcementService.createAnnouncement({
        schoolId, title, content, targetRoles, authorId, isPinned,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });
      res.status(201).json(announcement);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async updateAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const announcement = await announcementService.updateAnnouncement(id, req.body);
      res.json(announcement);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async deleteAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await announcementService.deleteAnnouncement(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};
