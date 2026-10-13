import type { MailMessage, MailProvider, MailSendResult } from "./types";

export const consoleProvider: MailProvider = {
  name: "console",
  async send(msg: MailMessage): Promise<MailSendResult> {
    console.log(
      JSON.stringify({
        level: "info",
        service: "identity",
        event: "mail.console",
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
      })
    );
    return { provider: "console", ok: true };
  },
};
