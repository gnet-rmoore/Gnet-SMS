import type { Request, Response } from "express";
import { notificationPreferenceService } from "../services/notificationPreferenceService";

export const notificationPreferenceController = {
  async list(req: Request, res: Response) {
    try {
      const schoolId = String(req.params.schoolId || "");
      const prefs = await notificationPreferenceService.listForSchool(schoolId);
      res.json(prefs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to load notification preferences" });
    }
  },

  async upsert(req: Request, res: Response) {
    try {
      const schoolId = String(req.params.schoolId || "");
      const body = req.body;
      const prefs = Array.isArray(body) ? body : body?.preferences;
      const removeEventKeys = Array.isArray(body?.removeEventKeys)
        ? body.removeEventKeys.map(String)
        : [];

      if (!Array.isArray(prefs) && removeEventKeys.length === 0) {
        return res.status(400).json({ error: "Expected preferences array" });
      }

      if (removeEventKeys.length) {
        await notificationPreferenceService.removeCustom(schoolId, removeEventKeys);
      }
      if (Array.isArray(prefs) && prefs.length) {
        const updated = await notificationPreferenceService.upsertMany(schoolId, prefs);
        return res.json(updated);
      }
      const listed = await notificationPreferenceService.listForSchool(schoolId);
      res.json(listed);
    } catch (err: any) {
      const msg = err.message || "Failed to save notification preferences";
      const status = /invalid|needs a label/i.test(msg) ? 400 : 500;
      res.status(status).json({ error: msg });
    }
  },
};
