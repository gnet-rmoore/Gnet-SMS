import type { Request, Response } from "express";
import { apiKeyService } from "../services/apiKeyService";

export const apiKeyController = {
  async list(req: Request, res: Response) {
    try {
      const keys = await apiKeyService.list(String(req.params.schoolId || ""));
      res.json(keys);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to list API keys" });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const row = await apiKeyService.create(
        String(req.params.schoolId || ""),
        String(req.body?.name || ""),
        user?.id || "unknown",
        req
      );
      res.status(201).json(row);
    } catch (err: any) {
      res.status(err.status || 500).json({
        error: err.message,
        code: err.code,
        feature: err.feature,
      });
    }
  },

  async revoke(req: Request, res: Response) {
    try {
      await apiKeyService.revoke(String(req.params.schoolId || ""), String(req.params.keyId || ""), req);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to revoke API key" });
    }
  },

  async verifyInternal(req: Request, res: Response) {
    try {
      const key = String(req.body?.key || req.headers["x-api-key"] || "");
      const result = await apiKeyService.verify(key);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 401).json({ error: err.message, code: err.code, feature: err.feature });
    }
  },
};
