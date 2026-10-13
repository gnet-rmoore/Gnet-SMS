import type { MailMessage, MailProvider, MailSendResult } from "./types";
import type { MailRuntimeConfig } from "../mailRuntimeConfig";
import { cfgString } from "../mailRuntimeConfig";

export const resendProvider: MailProvider = {
  name: "resend",
  async send(msg: MailMessage, cfg?: MailRuntimeConfig): Promise<MailSendResult> {
    const apiKey = cfgString(cfg || ({} as MailRuntimeConfig), "resendApiKey", "RESEND_API_KEY");
    if (!apiKey) {
      return { provider: "resend", ok: false, error: "RESEND_API_KEY not set" };
    }
    try {
      const from = cfgString(cfg || ({} as MailRuntimeConfig), "emailFrom", "EMAIL_FROM", "onboarding@resend.dev");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [msg.to],
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Resend HTTP ${res.status}`);
      }
      return { provider: "resend", ok: true };
    } catch (err: any) {
      console.error("[mailer] resend failed:", err.message);
      return { provider: "resend", ok: false, error: err.message };
    }
  },
};
