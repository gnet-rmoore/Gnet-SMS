import { consoleProvider } from "./console";
import { mailgunProvider } from "./mailgun";
import { resendProvider } from "./resend";
import { sendgridProvider } from "./sendgrid";
import { sesProvider } from "./ses";
import { smtpProvider } from "./smtp";
import type { MailProvider } from "./types";
import { loadMailRuntimeConfig } from "../mailRuntimeConfig";

/** Supported production providers (+ console for local dev). */
export const MAIL_PROVIDERS = [
  "console",
  "smtp",
  "sendgrid",
  "ses",
  "mailgun",
  "resend",
] as const;

export type MailProviderName = (typeof MAIL_PROVIDERS)[number];

const registry: Record<MailProviderName, MailProvider> = {
  console: consoleProvider,
  smtp: smtpProvider,
  sendgrid: sendgridProvider,
  ses: sesProvider,
  mailgun: mailgunProvider,
  resend: resendProvider,
};

/** Sync resolver — env only (tests / legacy). */
export function resolveMailProvider(): MailProvider {
  const raw = (process.env.EMAIL_PROVIDER || "console").toLowerCase();
  const name = (MAIL_PROVIDERS.includes(raw as MailProviderName)
    ? raw
    : "console") as MailProviderName;
  return registry[name];
}

/** Async resolver — Super Admin DB settings with env fallback. */
export async function resolveMailProviderWithConfig(): Promise<{
  provider: MailProvider;
  config: Awaited<ReturnType<typeof loadMailRuntimeConfig>>;
}> {
  const config = await loadMailRuntimeConfig();
  const name = config.provider;
  return { provider: registry[name] || consoleProvider, config };
}

export type { MailMessage, MailSendResult } from "./types";
