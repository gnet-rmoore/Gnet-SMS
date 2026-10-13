import type { MailMessage, MailProvider, MailSendResult } from "./types";
import type { MailRuntimeConfig } from "../mailRuntimeConfig";
import { cfgString } from "../mailRuntimeConfig";

export const sendgridProvider: MailProvider = {
  name: "sendgrid",
  async send(msg: MailMessage, cfg?: MailRuntimeConfig): Promise<MailSendResult> {
    const apiKey = cfgString(cfg || ({} as MailRuntimeConfig), "sendgridApiKey", "SENDGRID_API_KEY");
    if (!apiKey) {
      return { provider: "sendgrid", ok: false, error: "SENDGRID_API_KEY not set" };
    }
    try {
      const from = cfgString(cfg || ({} as MailRuntimeConfig), "emailFrom", "EMAIL_FROM", "noreply@yoursms.local");
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: msg.to }] }],
          from: { email: from },
          subject: msg.subject,
          content: [
            { type: "text/plain", value: msg.text },
            ...(msg.html ? [{ type: "text/html", value: msg.html }] : []),
          ],
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `SendGrid HTTP ${res.status}`);
      }
      return { provider: "sendgrid", ok: true };
    } catch (err: any) {
      console.error("[mailer] sendgrid failed:", err.message);
      return { provider: "sendgrid", ok: false, error: err.message };
    }
  },
};
