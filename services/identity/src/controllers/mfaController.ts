import type { Request, Response } from "express";
import { mfaService } from "../services/mfaService";
import { logSystemEvent } from "../utils/logger";

export const mfaController = {
  async enrollStart(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const email = (req as any).user?.email;
      if (!userId || !email) return res.status(401).json({ error: "Unauthorized" });
      const result = await mfaService.enrollStart(userId, email);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "MFA enroll failed" });
    }
  },

  async enrollConfirm(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const code = String(req.body?.code || "");
      await mfaService.enrollConfirm(userId, code, req);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "MFA confirm failed" });
    }
  },

  async verify(req: Request, res: Response) {
    try {
      const mfaToken = String(req.body?.mfaToken || "");
      const code = String(req.body?.code || "");
      const result = await mfaService.verifyLoginCode(mfaToken, code, req);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 401).json({ error: err.message || "MFA verify failed", code: err.code });
    }
  },

  async status(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      res.json(await mfaService.status(userId));
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async disable(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const password = String(req.body?.password || "");
      await mfaService.disable(userId, password, req);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async enrollSmsStart(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      res.json(await mfaService.enrollSmsStart(userId, String(req.body?.phoneE164 || ""), req));
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async enrollSmsConfirm(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      res.json(await mfaService.enrollSmsConfirm(userId, String(req.body?.code || ""), req));
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async sendLoginSms(req: Request, res: Response) {
    try {
      res.json(await mfaService.sendLoginSmsOtp(String(req.body?.mfaToken || "")));
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
};
