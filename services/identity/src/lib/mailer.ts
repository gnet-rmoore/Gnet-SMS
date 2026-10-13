import crypto from "node:crypto";
import { consoleProvider } from "./mailProviders/console";
import { resolveMailProviderWithConfig, type MailMessage } from "./mailProviders";

export type { MailMessage } from "./mailProviders";

/**
 * Transactional mailer for Identity.
 * EMAIL_PROVIDER: console | smtp | sendgrid | ses | mailgun | resend
 * Super Admin email settings in PlatformSettings override env when set.
 */
export async function sendMail(msg: MailMessage): Promise<{ provider: string; ok: boolean }> {
  const { provider, config } = await resolveMailProviderWithConfig();
  const result = await provider.send(msg, config);
  if (result.ok) {
    return { provider: result.provider, ok: true };
  }
  if (provider.name === "console") {
    return { provider: result.provider, ok: false };
  }
  console.warn(`[mailer] ${provider.name} failed — falling back to console`, result.error);
  const fallback = await consoleProvider.send(msg);
  return { provider: fallback.provider, ok: fallback.ok };
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateRawToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
}

export function hashIp(ip?: string | null): string | null {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export function appBaseUrl(): string {
  const raw = process.env.APP_URL || "http://localhost:8080";
  return raw.split(",")[0].trim().replace(/\/$/, "");
}
