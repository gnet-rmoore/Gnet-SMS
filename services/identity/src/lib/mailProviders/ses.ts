import type { MailMessage, MailProvider, MailSendResult } from "./types";
import type { MailRuntimeConfig } from "../mailRuntimeConfig";
import { cfgString } from "../mailRuntimeConfig";

export const sesProvider: MailProvider = {
  name: "ses",
  async send(msg: MailMessage, cfg?: MailRuntimeConfig): Promise<MailSendResult> {
    try {
      const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses").catch(() => ({
        SESClient: null,
        SendEmailCommand: null,
      }));
      if (!SESClient || !SendEmailCommand) {
        return { provider: "ses", ok: false, error: "@aws-sdk/client-ses not installed" };
      }

      const runtime = cfg || ({} as MailRuntimeConfig);
      const region = cfgString(runtime, "awsRegion", "AWS_REGION", "us-east-1");
      const from = cfgString(runtime, "emailFrom", "EMAIL_FROM");
      if (!from) {
        return { provider: "ses", ok: false, error: "EMAIL_FROM required for SES" };
      }

      const accessKeyId = cfgString(runtime, "awsAccessKeyId", "AWS_ACCESS_KEY_ID");
      const secretAccessKey = cfgString(runtime, "awsSecretAccessKey", "AWS_SECRET_ACCESS_KEY");

      const client = new SESClient({
        region,
        credentials:
          accessKeyId && secretAccessKey
            ? {
                accessKeyId,
                secretAccessKey,
              }
            : undefined,
      });

      await client.send(
        new SendEmailCommand({
          Source: from,
          Destination: { ToAddresses: [msg.to] },
          Message: {
            Subject: { Data: msg.subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: msg.text, Charset: "UTF-8" },
              ...(msg.html ? { Html: { Data: msg.html, Charset: "UTF-8" } } : {}),
            },
          },
        })
      );
      return { provider: "ses", ok: true };
    } catch (err: any) {
      console.error("[mailer] ses failed:", err.message);
      return { provider: "ses", ok: false, error: err.message };
    }
  },
};
