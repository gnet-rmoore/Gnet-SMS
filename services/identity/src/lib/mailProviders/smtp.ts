import type { MailMessage, MailProvider, MailSendResult } from "./types";
import type { MailRuntimeConfig } from "../mailRuntimeConfig";
import { cfgString } from "../mailRuntimeConfig";

export const smtpProvider: MailProvider = {
  name: "smtp",
  async send(msg: MailMessage, cfg?: MailRuntimeConfig): Promise<MailSendResult> {
    try {
      const nodemailer = await import("nodemailer").catch(() => null);
      if (!nodemailer) {
        return { provider: "smtp", ok: false, error: "nodemailer not installed" };
      }
      const runtime = cfg || ({} as MailRuntimeConfig);
      const transporter = nodemailer.createTransport({
        host: cfgString(runtime, "smtpHost", "SMTP_HOST"),
        port: Number(cfgString(runtime, "smtpPort", "SMTP_PORT", "587")),
        secure:
          runtime.smtpSecure !== undefined
            ? runtime.smtpSecure
            : process.env.SMTP_SECURE === "true",
        auth: cfgString(runtime, "smtpUser", "SMTP_USER")
          ? {
              user: cfgString(runtime, "smtpUser", "SMTP_USER"),
              pass: cfgString(runtime, "smtpPass", "SMTP_PASS"),
            }
          : undefined,
      });
      await transporter.sendMail({
        from: cfgString(runtime, "emailFrom", "EMAIL_FROM", "noreply@yoursms.local"),
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html || msg.text,
      });
      return { provider: "smtp", ok: true };
    } catch (err: any) {
      console.error("[mailer] smtp failed:", err.message);
      return { provider: "smtp", ok: false, error: err.message };
    }
  },
};
