import prisma from "../lib/prisma";
import { logSystemEvent } from "../utils/logger";
import {
  invalidateMailRuntimeCache,
  loadMailRuntimeConfig,
  maskSecret,
  parseEmailSecrets,
  type MailRuntimeConfig,
} from "../lib/mailRuntimeConfig";
import { sendMail } from "../lib/mailer";
import type { MailProviderName } from "../lib/mailProviders";

const SECRET_KEYS = [
  "sendgridApiKey",
  "resendApiKey",
  "mailgunApiKey",
  "awsAccessKeyId",
  "awsSecretAccessKey",
  "smtpPass",
] as const;

export type EmailSettingsPublic = {
  emailProvider: MailProviderName;
  emailFrom: string;
  requireEmailVerification: boolean;
  configured: boolean;
  source: "database" | "environment";
  secrets: Record<string, string | null>;
};

function isMaskedPlaceholder(value: unknown): boolean {
  return typeof value === "string" && value.includes("*");
}

function mergeSecrets(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown> | undefined
): Record<string, unknown> {
  const next = { ...existing };
  if (!incoming) return next;
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined || value === null || value === "") continue;
    if (isMaskedPlaceholder(value)) continue;
    next[key] = value;
  }
  return next;
}

function publicSecrets(secrets: Record<string, unknown>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const key of [
    ...SECRET_KEYS,
    "mailgunDomain",
    "mailgunRegion",
    "awsRegion",
    "smtpHost",
    "smtpPort",
    "smtpUser",
    "smtpSecure",
  ]) {
    const raw = secrets[key];
    if (SECRET_KEYS.includes(key as (typeof SECRET_KEYS)[number])) {
      out[key] = raw ? maskSecret(String(raw)) : null;
    } else if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
      out[key] = String(raw);
    } else {
      out[key] = null;
    }
  }
  return out;
}

function hasProviderSecrets(provider: MailProviderName, secrets: Record<string, unknown>): boolean {
  switch (provider) {
    case "sendgrid":
      return Boolean(secrets.sendgridApiKey);
    case "resend":
      return Boolean(secrets.resendApiKey);
    case "mailgun":
      return Boolean(secrets.mailgunApiKey && secrets.mailgunDomain);
    case "ses":
      return Boolean(secrets.awsAccessKeyId && secrets.awsSecretAccessKey);
    case "smtp":
      return Boolean(secrets.smtpHost);
    case "console":
      return true;
    default:
      return false;
  }
}

export const emailSettingsService = {
  async getPublicSettings(): Promise<EmailSettingsPublic> {
    const row = await prisma.platformSettings.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    });
    const secrets = parseEmailSecrets(row.emailSecretsJson);
    const provider = (row.emailProvider ||
      process.env.EMAIL_PROVIDER ||
      "console") as MailProviderName;
    const emailFrom =
      String(row.emailFrom || "").trim() ||
      process.env.EMAIL_FROM?.trim() ||
      "noreply@yoursms.local";
    const dbConfigured =
      Boolean(row.emailProvider) || Object.keys(secrets).length > 0 || Boolean(row.emailFrom);
    return {
      emailProvider: provider,
      emailFrom,
      requireEmailVerification: Boolean(row.requireEmailVerification),
      configured: hasProviderSecrets(provider, secrets),
      source: dbConfigured ? "database" : "environment",
      secrets: publicSecrets(secrets),
    };
  },

  async updateSettings(
    body: {
      emailProvider?: string;
      emailFrom?: string;
      requireEmailVerification?: boolean;
      secrets?: Record<string, unknown>;
    },
    actorId: string,
    req?: any
  ) {
    const row = await prisma.platformSettings.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    });
    const mergedSecrets = mergeSecrets(parseEmailSecrets(row.emailSecretsJson), body.secrets);
    const data: any = { updatedById: actorId };
    if (body.emailProvider !== undefined) {
      data.emailProvider = String(body.emailProvider || "console").toLowerCase();
    }
    if (body.emailFrom !== undefined) {
      data.emailFrom = String(body.emailFrom || "").trim() || null;
    }
    if (body.requireEmailVerification !== undefined) {
      data.requireEmailVerification = Boolean(body.requireEmailVerification);
    }
    if (body.secrets !== undefined) {
      data.emailSecretsJson = JSON.stringify(mergedSecrets);
    }

    const updated = await prisma.platformSettings.update({
      where: { id: "default" },
      data,
    });
    invalidateMailRuntimeCache();

    await logSystemEvent(
      "email_settings_updated",
      "SUPER_ADMIN",
      `Email provider set to ${updated.emailProvider || "console"}`,
      "WARN",
      req,
      {
        category: "SETTINGS",
        entityType: "PlatformSettings",
        entityId: "default",
        after: {
          emailProvider: updated.emailProvider,
          emailFrom: updated.emailFrom,
        },
        tags: ["email", "credentials"],
      }
    );

    return this.getPublicSettings();
  },

  async sendTestEmail(to: string, actorId: string) {
    const cfg = await loadMailRuntimeConfig();
    const result = await sendMail({
      to,
      subject: "SMS test email",
      text: `This is a test message from your School Management System.\n\nActive provider: ${cfg.provider}\nFrom: ${cfg.emailFrom}`,
      html: `<p>This is a test message from your School Management System.</p><p><strong>Provider:</strong> ${cfg.provider}<br/><strong>From:</strong> ${cfg.emailFrom}</p>`,
    });
    await logSystemEvent(
      "email_test_sent",
      "SUPER_ADMIN",
      `Test email to ${to} via ${result.provider} (${result.ok ? "ok" : "failed"})`,
      result.ok ? "INFO" : "WARNING",
      undefined,
      {
        category: "SETTINGS",
        entityType: "PlatformSettings",
        entityId: "default",
        userId: actorId,
        after: { provider: result.provider, ok: result.ok },
        tags: ["email", "test"],
      }
    );
    return result;
  },
};
