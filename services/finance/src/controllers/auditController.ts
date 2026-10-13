import type { Request, Response } from "express";
import { auditService } from "../services/auditService";

export const auditController = {
  async listEvents(req: Request, res: Response) {
    try {
      const result = await auditService.listEvents({
        schoolId: String(req.query.schoolId || ""),
        from: req.query.from ? String(req.query.from) : undefined,
        to: req.query.to ? String(req.query.to) : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        action: req.query.action ? String(req.query.action) : undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Audit list failed" });
    }
  },
};
