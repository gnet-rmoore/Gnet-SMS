import type { Request, Response } from "express";
import { inAppNotificationService } from "../services/inAppNotificationService";

export const inAppNotificationController = {
  async list(req: Request, res: Response) {
    const user = (req as any).user;
    try {
      const unreadOnly = String(req.query.unreadOnly || "") === "true";
      const limit = Number(req.query.limit) || Number(req.query.pageSize) || 30;
      const page = Math.max(1, Number(req.query.page) || 1);
      const offsetRaw = req.query.offset != null ? Number(req.query.offset) : (page - 1) * limit;
      const offset = Math.max(0, offsetRaw || 0);
      const schoolId = (req.query.schoolId as string) || user.schoolId;
      const wantsPage =
        req.query.page != null ||
        req.query.offset != null ||
        String(req.query.paged || "") === "true";

      const rows = await inAppNotificationService.listForUser(user.id, {
        unreadOnly,
        limit,
        offset,
        schoolId,
        paged: wantsPage,
      });
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list notifications" });
    }
  },

  async unreadCount(req: Request, res: Response) {
    const user = (req as any).user;
    try {
      const schoolId = (req.query.schoolId as string) || user.schoolId;
      const count = await inAppNotificationService.unreadCount(user.id, schoolId);
      res.json({ count });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to count notifications" });
    }
  },

  async navBadges(req: Request, res: Response) {
    const user = (req as any).user;
    try {
      const schoolId = (req.query.schoolId as string) || user.schoolId;
      const badges = await inAppNotificationService.navBadges(user.id, schoolId);
      res.json({ badges });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to load nav badges" });
    }
  },

  async markRead(req: Request, res: Response) {
    const user = (req as any).user;
    try {
      const row = await inAppNotificationService.markRead(req.params.id, user.id);
      res.json(row);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to mark read" });
    }
  },

  async markAllRead(req: Request, res: Response) {
    const user = (req as any).user;
    try {
      const schoolId = req.body?.schoolId || user.schoolId;
      const result = await inAppNotificationService.markAllRead(user.id, schoolId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to mark all read" });
    }
  },

  /** Internal: Academic (and others) create notifications for users. */
  async createInternal(req: Request, res: Response) {
    try {
      const body = req.body || {};
      if (Array.isArray(body.notifications)) {
        const result = await inAppNotificationService.createMany(body.notifications);
        return res.json(result);
      }
      if (!body.schoolId || !body.userId || !body.eventKey || !body.title) {
        return res.status(400).json({
          error: "schoolId, userId, eventKey, and title are required",
        });
      }
      const row = await inAppNotificationService.create(body);
      res.json(row || { skipped: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create notification" });
    }
  },
};
