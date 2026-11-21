import type { Request, Response } from "express";
import { entranceService } from "../services/entranceService";

export const entranceController = {
  async getEntrance(req: Request, res: Response) {
    try {
      const result = await entranceService.getPublicEntrance(
        String(req.params.slug || ""),
        String(req.params.token || "")
      );
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  async book(req: Request, res: Response) {
    try {
      const result = await entranceService.reschedule(
        String(req.params.token || ""),
        String(req.body?.slotId || ""),
        "BOOK"
      );
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  async reschedule(req: Request, res: Response) {
    try {
      const result = await entranceService.reschedule(
        String(req.params.token || ""),
        String(req.body?.slotId || ""),
        "RESCHEDULE"
      );
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  async cancel(req: Request, res: Response) {
    try {
      const result = await entranceService.cancel(String(req.params.token || ""));
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },
};
