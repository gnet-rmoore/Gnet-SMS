import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import {
  appBaseUrl,
  generateRawToken,
  hashToken,
  sendMail,
} from "../lib/mailer";
import { resolveEmailLocale, tEmail } from "../i18n/emailCatalogs";

const RESET_TTL_MS = 60 * 60 * 1000;
const VERIFY_RESEND_COOLDOWN_MS = 60 * 1000;

async function userLocale(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredLocale: true, school: { select: { defaultLocale: true } } },
  });
  return resolveEmailLocale(user?.preferredLocale, user?.school?.defaultLocale);
}

export const emailAuthService = {
  async isEmailVerificationRequired(): Promise<boolean> {
    try {
      const row = await prisma.platformSettings.findUnique({ where: { id: "default" } });
      if (row && row.requireEmailVerification !== undefined) {
        return Boolean(row.requireEmailVerification);
      }
    } catch {
      /* fall through */
    }
    return process.env.REQUIRE_EMAIL_VERIFICATION === "true";
  },

  requireEmailVerification(): boolean {
    return process.env.REQUIRE_EMAIL_VERIFICATION === "true";
  },

  async isEmailVerified(user: { emailVerifiedAt: Date | null; role: string }): Promise<boolean> {
    if (user.role === "SUPER_ADMIN") return true;
    if (!(await this.isEmailVerificationRequired())) return true;
    return Boolean(user.emailVerifiedAt);
  },

  async sendVerificationEmail(userId: string): Promise<{ sent: boolean }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { school: true },
    });
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
    if (user.emailVerifiedAt) return { sent: false };

    if (
      user.emailVerificationSentAt &&
      Date.now() - user.emailVerificationSentAt.getTime() < VERIFY_RESEND_COOLDOWN_MS
    ) {
      throw Object.assign(new Error("Please wait before requesting another verification email"), {
        status: 429,
      });
    }

    const raw = generateRawToken(24);
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationTokenHash: hashToken(raw),
        emailVerificationSentAt: new Date(),
      },
    });

    const verifyUrl = `${appBaseUrl()}/verify-email?token=${raw}`;
    const locale = resolveEmailLocale(user.preferredLocale, user.school?.defaultLocale);
    const mail = tEmail(locale, "emailVerify", { name: user.name, verifyUrl });
    await sendMail({ to: user.email, subject: mail.subject, text: mail.text });
    return { sent: true };
  },

  async verifyEmail(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const user = await prisma.user.findFirst({
      where: { emailVerificationTokenHash: tokenHash },
    });
    if (!user) {
      throw Object.assign(new Error("Invalid or expired verification link"), { status: 400 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationSentAt: null,
      },
    });
    return { email: user.email, verified: true };
  },

  async requestPasswordReset(email: string) {
    const normalized = String(email || "").toLowerCase().trim();
    const generic = {
      message: "If an account exists for that email, a reset link has been sent.",
    };
    if (!normalized) return generic;

    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user || !user.isActive) return generic;

    const raw = generateRawToken(24);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: hashToken(raw),
        passwordResetExpiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });

    const resetUrl = `${appBaseUrl()}/reset-password?token=${raw}`;
    const locale = await userLocale(user.id);
    const mail = tEmail(locale, "passwordReset", { name: user.name, resetUrl });
    await sendMail({ to: user.email, subject: mail.subject, text: mail.text });
    return generic;
  },

  async resetPassword(rawToken: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw Object.assign(new Error("Password must be at least 8 characters"), { status: 400 });
    }
    const tokenHash = hashToken(rawToken);
    const user = await prisma.user.findFirst({
      where: { passwordResetTokenHash: tokenHash },
    });
    if (!user) {
      throw Object.assign(new Error("Invalid or expired reset link"), { status: 400 });
    }
    if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw Object.assign(new Error("Reset link has expired"), { status: 410 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: bcrypt.hashSync(newPassword, 10),
        mustChangePassword: false,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });
    return { ok: true };
  },

  /** Mark verified when user completes invite accept (proved inbox access). */
  async markVerifiedOnInviteAccept(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationSentAt: null,
      },
    });
  },
};
