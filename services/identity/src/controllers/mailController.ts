import type { Request, Response } from "express";
import { sendMail } from "../lib/mailer";
import { tEmail, normalizeLocale } from "../i18n/emailCatalogs";

export const mailController = {
  /** Internal: other services send transactional mail via Identity mailer. */
  async sendInternal(req: Request, res: Response) {
    try {
      const { to, subject, text, html } = req.body || {};
      const recipient = String(to || "").trim();
      if (!recipient || !subject || !text) {
        return res.status(400).json({ error: "to, subject, and text are required" });
      }
      const result = await sendMail({
        to: recipient,
        subject: String(subject).slice(0, 200),
        text: String(text).slice(0, 8000),
        html: html ? String(html).slice(0, 16000) : undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to send mail" });
    }
  },

  /** Internal: render a localized transactional email template for another service. */
  async renderInternal(req: Request, res: Response) {
    try {
      const { key, locale } = req.body || {};
      const vars =
        req.body?.vars && typeof req.body.vars === "object"
          ? (req.body.vars as Record<string, string>)
          : {};
      if (typeof key !== "string" || !key.trim()) {
        return res.status(400).json({ error: "key required" });
      }
      const loc = normalizeLocale(locale) || "en";
      const msg = tEmail(loc, key as any, vars);
      if (!msg?.subject || typeof msg.subject !== "string") {
        return res.status(400).json({ error: "Unknown email key" });
      }
      res.json(msg);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to render mail" });
    }
  },
};
