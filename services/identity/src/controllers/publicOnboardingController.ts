import type { Request, Response } from "express";
import { schoolRegistrationService } from "../services/schoolRegistrationService";
import { acceptInvite } from "../services/schoolProvisioning";
import { assertCaptcha } from "../lib/captcha";

/** In-memory rate limit for public endpoints (per IP). */
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const cur = buckets.get(ip);
  if (!cur || cur.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (cur.count >= limit) return false;
  cur.count += 1;
  return true;
}

function clientIp(req: Request): string {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

export const publicOnboardingController = {
  async slugAvailable(req: Request, res: Response) {
    try {
      const result = await schoolRegistrationService.isSlugAvailable(String(req.query.slug || ""));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async submitRegistration(req: Request, res: Response) {
    const ip = clientIp(req);
    if (!rateLimit(ip, 10, 60_000)) {
      return res.status(429).json({ error: "Too many requests" });
    }
    try {
      await assertCaptcha(req.body?.captchaToken, ip);
      const result = await schoolRegistrationService.submit(req.body, {
        ip,
        userAgent: req.headers["user-agent"],
      });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async confirmRegistrationEmail(req: Request, res: Response) {
    try {
      const { id, token } = req.body || {};
      const result = await schoolRegistrationService.confirmEmail(String(id), String(token));
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async resendRegistrationEmail(req: Request, res: Response) {
    const ip = clientIp(req);
    if (!rateLimit(ip, 5, 300_000)) {
      return res.status(429).json({ error: "Too many requests" });
    }
    try {
      const result = await schoolRegistrationService.resendConfirmation(String(req.params.id || ""));
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async acceptInvite(req: Request, res: Response) {
    const ip = clientIp(req);
    if (!rateLimit(ip, 15, 60_000)) {
      return res.status(429).json({ error: "Too many requests" });
    }
    try {
      const token = String(req.params.token || "");
      const { password } = req.body || {};
      const result = await acceptInvite(token, String(password || ""));
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
};
