import type { MailMessage, MailProvider, MailSendResult } from "./types";
import type { MailRuntimeConfig } from "../mailRuntimeConfig";
import { cfgString } from "../mailRuntimeConfig";

export const mailgunProvider: MailProvider = {
  name: "mailgun",
  async send(msg: MailMessage, cfg?: MailRuntimeConfig): Promise<MailSendResult> {
    const runtime = cfg || ({} as MailRuntimeConfig);
    const apiKey = cfgString(runtime, "mailgunApiKey", "MAILGUN_API_KEY");
    const domain = cfgString(runtime, "mailgunDomain", "MAILGUN_DOMAIN");
    if (!apiKey || !domain) {
      return {
        provider: "mailgun",
        ok: false,
        error: "MAILGUN_API_KEY and MAILGUN_DOMAIN required",
      };
    }
    try {
      const from = cfgString(runtime, "emailFrom", "EMAIL_FROM", `noreply@${domain}`);
      const body = new URLSearchParams({
        from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
      });
      if (msg.html) body.set("html", msg.html);

      const region = cfgString(runtime, "mailgunRegion", "MAILGUN_REGION", "us").toLowerCase();
      const base =
        region === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
      const auth = Buffer.from(`api:${apiKey}`).toString("base64");
      const res = await fetch(`${base}/v3/${domain}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Mailgun HTTP ${res.status}`);
      }
      return { provider: "mailgun", ok: true };
    } catch (err: any) {
      console.error("[mailer] mailgun failed:", err.message);
      return { provider: "mailgun", ok: false, error: err.message };
    }
  },
};
