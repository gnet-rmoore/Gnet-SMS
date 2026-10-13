import prisma from "./prisma";
import type { MailProviderName } from "./mailProviders";

/** Runtime mail configuration — DB (Super Admin) with env fallback. */
export type MailRuntimeConfig = {
  provider: MailProviderName;
  emailFrom: string;
  sendgridApiKey?: string;
  resendApiKey?: string;
  mailgunApiKey?: string;
  mailgunDomain?: string;
  mailgunRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
};

const PROVIDER_NAMES = new Set([
  "console",
  "smtp",
  "sendgrid",
  "ses",
  "mailgun",
  "resend",
]);

let cache: { at: number; config: MailRuntimeConfig } | null = null;
const CACHE_MS = 30_000;

export function invalidateMailRuntimeCache() {
  cache = null;
}

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = String(value);
  if (s.length <= 4) return "****";
  return `${"*".repeat(Math.min(8, s.length - 4))}${s.slice(-4)}`;
}

export function parseEmailSecrets(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeProvider(raw: string | null | undefined): MailProviderName {
  const name = String(raw || process.env.EMAIL_PROVIDER || "console").toLowerCase();
  return (PROVIDER_NAMES.has(name) ? name : "console") as MailProviderName;
}

function pickSecret(
  secrets: Record<string, unknown>,
  cfgKey: string,
  envKey: string
): string | undefined {
  const fromDb = secrets[cfgKey];
  if (fromDb !== undefined && fromDb !== null && String(fromDb).trim() !== "") {
    return String(fromDb);
  }
  const fromEnv = process.env[envKey];
  return fromEnv?.trim() || undefined;
}

function pickBool(
  secrets: Record<string, unknown>,
  cfgKey: string,
  envKey: string
): boolean | undefined {
  if (secrets[cfgKey] !== undefined && secrets[cfgKey] !== null) {
    const v = secrets[cfgKey];
    if (v === true || v === "true") return true;
    if (v === false || v === "false") return false;
    return Boolean(v);
  }
  if (process.env[envKey] !== undefined) {
    return process.env[envKey] === "true";
  }
  return undefined;
}

export async function loadMailRuntimeConfig(): Promise<MailRuntimeConfig> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) {
    return cache.config;
  }

  let row: { emailProvider?: string | null; emailFrom?: string | null; emailSecretsJson?: string | null } | null =
    null;
  try {
    row = await prisma.platformSettings.findUnique({ where: { id: "default" } });
  } catch {
    row = null;
  }

  const secrets = parseEmailSecrets(row?.emailSecretsJson);
  const provider = normalizeProvider(row?.emailProvider);
  const emailFrom =
    String(row?.emailFrom || "").trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "noreply@yoursms.local";

  const config: MailRuntimeConfig = {
    provider,
    emailFrom,
    sendgridApiKey: pickSecret(secrets, "sendgridApiKey", "SENDGRID_API_KEY"),
    resendApiKey: pickSecret(secrets, "resendApiKey", "RESEND_API_KEY"),
    mailgunApiKey: pickSecret(secrets, "mailgunApiKey", "MAILGUN_API_KEY"),
    mailgunDomain: pickSecret(secrets, "mailgunDomain", "MAILGUN_DOMAIN"),
    mailgunRegion: pickSecret(secrets, "mailgunRegion", "MAILGUN_REGION"),
    awsAccessKeyId: pickSecret(secrets, "awsAccessKeyId", "AWS_ACCESS_KEY_ID"),
    awsSecretAccessKey: pickSecret(secrets, "awsSecretAccessKey", "AWS_SECRET_ACCESS_KEY"),
    awsRegion: pickSecret(secrets, "awsRegion", "AWS_REGION"),
    smtpHost: pickSecret(secrets, "smtpHost", "SMTP_HOST"),
    smtpPort: pickSecret(secrets, "smtpPort", "SMTP_PORT"),
    smtpUser: pickSecret(secrets, "smtpUser", "SMTP_USER"),
    smtpPass: pickSecret(secrets, "smtpPass", "SMTP_PASS"),
    smtpSecure: pickBool(secrets, "smtpSecure", "SMTP_SECURE"),
  };

  cache = { at: now, config };
  return config;
}

export function cfgString(
  cfg: MailRuntimeConfig,
  cfgKey: keyof MailRuntimeConfig,
  envKey: string,
  fallback = ""
): string {
  const fromCfg = cfg[cfgKey];
  if (fromCfg !== undefined && fromCfg !== null && String(fromCfg).trim() !== "") {
    return String(fromCfg);
  }
  return process.env[envKey]?.trim() || fallback;
}
