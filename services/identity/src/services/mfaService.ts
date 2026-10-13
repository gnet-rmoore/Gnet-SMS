import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { getJwtAccessSecret, getSuperAdminJwtSecret, ACCESS_TOKEN_TTL } from "../middleware/auth";
import { encryptMfaSecret, decryptMfaSecret } from "../lib/mfaCrypto";
import {
  generateBase32Secret,
  verifyTotp,
  otpauthUrl,
} from "../lib/totp";
import {
  parseSecurityPolicy,
  type SecurityPolicy,
  type MfaMode,
} from "../lib/securityPolicy";
import { capabilityService } from "./capabilityService";
import { getSchoolCommercialContext } from "../lib/quotaEnforcement";
import { logSystemEvent } from "../utils/logger";
import { sendSmsOtpViaComms } from "../lib/smsOtpClient";
import { platformOpsService } from "./platformOpsService";
import { normalizeSaPlatformRole, capabilitiesForSaRole } from "../domain/saCapabilities";

const NON_STAFF_ROLES = new Set(["STUDENT", "PARENT"]);

function isStaffRole(role: string): boolean {
  return role !== "SUPER_ADMIN" && !NON_STAFF_ROLES.has(role);
}

export function mfaRequiredForUser(
  policy: SecurityPolicy,
  role: string,
  enrolled: boolean
): "none" | "challenge" | "enroll_required" {
  const mode: MfaMode = policy.mfaMode || "OFF";
  if (mode === "OFF") return "none";

  const rolesConfigured = (policy.mfaRequiredRoles?.length ?? 0) > 0;
  const roleInScope = rolesConfigured
    ? policy.mfaRequiredRoles!.includes(role)
    : isStaffRole(role);

  if (mode === "OPTIONAL") {
    return enrolled && roleInScope ? "challenge" : "none";
  }
  if (mode === "REQUIRED") {
    if (!roleInScope) return "none";
    return enrolled ? "challenge" : "enroll_required";
  }
  return "none";
}

function generateSmsCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function createSmsChallenge(userId: string, phoneE164: string, purpose: string) {
  const code = generateSmsCode();
  const codeHash = bcrypt.hashSync(code, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.mfaSmsChallenge.deleteMany({ where: { userId, purpose } });
  await prisma.mfaSmsChallenge.create({
    data: { userId, phoneE164, codeHash, purpose, expiresAt },
  });
  return code;
}

async function verifySmsChallenge(userId: string, code: string, purpose: string): Promise<boolean> {
  const row = await prisma.mfaSmsChallenge.findFirst({
    where: { userId, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row || !bcrypt.compareSync(code, row.codeHash)) return false;
  await prisma.mfaSmsChallenge.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });
  return true;
}

export function loginMethods(row: { totpSecretEnc?: string | null; phoneE164?: string | null; enrolledAt: Date } | null) {
  if (!row || row.enrolledAt.getTime() <= 0) return [] as string[];
  const methods: string[] = [];
  if (row.totpSecretEnc) methods.push("totp");
  if (row.phoneE164) methods.push("sms");
  return methods.length ? methods : [row.totpSecretEnc ? "totp" : "sms"];
}

function generateBackupCodes(count = 8): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = `${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    plain.push(code);
    hashed.push(bcrypt.hashSync(code, 10));
  }
  return { plain, hashed };
}

export const mfaService = {
  async getEnrollment(userId: string) {
    return prisma.userMfaEnrollment.findUnique({ where: { userId } });
  },

  async enrollStart(userId: string, email: string) {
    const existing = await prisma.userMfaEnrollment.findUnique({ where: { userId } });
    if (existing && existing.enrolledAt.getTime() > 0) {
      throw Object.assign(new Error("MFA already enrolled"), { status: 400 });
    }
    if (existing) {
      await prisma.userMfaEnrollment.delete({ where: { userId } });
    }
    const secret = generateBase32Secret();
    const { plain, hashed } = generateBackupCodes();
    const pending = await prisma.userMfaEnrollment.create({
      data: {
        userId,
        method: "TOTP",
        totpSecretEnc: encryptMfaSecret(secret),
        backupCodes: JSON.stringify(hashed),
        enrolledAt: new Date(0),
      },
    });
    const label = email;
    const otpauth = otpauthUrl(secret, label);
    return {
      enrollmentId: pending.id,
      secret,
      otpauthUrl: otpauth,
      backupCodes: plain,
    };
  },

  async enrollConfirm(userId: string, code: string, req?: any) {
    const row = await prisma.userMfaEnrollment.findUnique({ where: { userId } });
    if (!row?.totpSecretEnc) {
      throw Object.assign(new Error("No pending MFA enrollment"), { status: 400 });
    }
    const secret = decryptMfaSecret(row.totpSecretEnc);
    if (!verifyTotp(secret, code)) {
      throw Object.assign(new Error("Invalid verification code"), { status: 400 });
    }
    await prisma.userMfaEnrollment.update({
      where: { userId },
      data: { enrolledAt: new Date(), lastUsedAt: new Date(), method: row?.phoneE164 ? "BOTH" : "TOTP" },
    });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, schoolId: true } });
    await logSystemEvent("mfa_enrolled", "AUTH", `TOTP MFA enrolled for ${user?.email}`, "INFO", req, {
      category: "SECURITY",
      userId,
      schoolId: user?.schoolId,
    });
    return { ok: true };
  },

  async disable(userId: string, password: string, req?: any) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      throw Object.assign(new Error("Invalid password"), { status: 401 });
    }
    await prisma.userMfaEnrollment.deleteMany({ where: { userId } });
    await logSystemEvent("mfa_disabled", "AUTH", `MFA disabled for ${user.email}`, "WARN", req, {
      category: "SECURITY",
      userId,
      schoolId: user.schoolId,
    });
    return { ok: true };
  },

  async status(userId: string) {
    const row = await prisma.userMfaEnrollment.findUnique({ where: { userId } });
    const enrolled = Boolean(row && row.enrolledAt.getTime() > 0);
    return {
      enrolled,
      methods: enrolled ? loginMethods(row) : [],
      phoneE164: row?.phoneE164 || null,
    };
  },

  signMfaToken(userId: string, opts?: { superAdmin?: boolean }) {
    return jwt.sign(
      { id: userId, purpose: opts?.superAdmin ? "mfa_pending_sa" : "mfa_pending" },
      getJwtAccessSecret(),
      { expiresIn: "5m" }
    );
  },

  verifyMfaToken(token: string): { userId: string; superAdmin: boolean } {
    const decoded = jwt.verify(token, getJwtAccessSecret()) as any;
    if (!decoded.id || !String(decoded.purpose || "").startsWith("mfa_pending")) {
      throw Object.assign(new Error("Invalid MFA token"), { status: 401 });
    }
    return { userId: decoded.id as string, superAdmin: decoded.purpose === "mfa_pending_sa" };
  },

  async enrollSmsStart(userId: string, phoneE164: string, req?: any) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { school: true },
    });
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
    const policy = parseSecurityPolicy(user.school?.securityPolicy);
    if (!policy.allowSmsMfa) {
      throw Object.assign(new Error("SMS MFA is not enabled for this school"), { status: 400 });
    }
    const phone = String(phoneE164 || "").trim();
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      throw Object.assign(new Error("Phone must be E.164 format, e.g. +15551234567"), { status: 400 });
    }
    const existing = await prisma.userMfaEnrollment.findUnique({ where: { userId } });
    await prisma.userMfaEnrollment.upsert({
      where: { userId },
      create: {
        userId,
        method: "SMS",
        phoneE164: phone,
        enrolledAt: new Date(0),
      },
      update: { phoneE164: phone, method: existing?.totpSecretEnc ? "BOTH" : "SMS", enrolledAt: new Date(0) },
    });
    const code = await createSmsChallenge(userId, phone, "ENROLL");
    await sendSmsOtpViaComms({
      phoneE164: phone,
      code,
      purpose: "mfa_enroll",
      emailFallback: user.email,
    });
    await logSystemEvent("mfa_sms_enroll_started", "AUTH", `SMS MFA enroll started for ${user.email}`, "INFO", req, {
      category: "SECURITY",
      userId,
      schoolId: user.schoolId,
    });
    return { ok: true, phoneE164: phone };
  },

  async enrollSmsConfirm(userId: string, code: string, req?: any) {
    const ok = await verifySmsChallenge(userId, code, "ENROLL");
    if (!ok) throw Object.assign(new Error("Invalid verification code"), { status: 400 });
    const row = await prisma.userMfaEnrollment.findUnique({ where: { userId } });
    await prisma.userMfaEnrollment.update({
      where: { userId },
      data: {
        enrolledAt: new Date(),
        lastUsedAt: new Date(),
        method: row?.totpSecretEnc ? "BOTH" : "SMS",
      },
    });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, schoolId: true } });
    await logSystemEvent("mfa_enrolled", "AUTH", `SMS MFA enrolled for ${user?.email}`, "INFO", req, {
      category: "SECURITY",
      userId,
      schoolId: user?.schoolId,
    });
    return { ok: true };
  },

  async sendLoginSmsOtp(mfaToken: string) {
    const { userId } = this.verifyMfaToken(mfaToken);
    const row = await prisma.userMfaEnrollment.findUnique({ where: { userId } });
    if (!row?.phoneE164 || row.enrolledAt.getTime() <= 0) {
      throw Object.assign(new Error("SMS MFA not enrolled"), { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const code = await createSmsChallenge(userId, row.phoneE164, "LOGIN");
    await sendSmsOtpViaComms({
      phoneE164: row.phoneE164,
      code,
      purpose: "mfa_login",
      emailFallback: user?.email,
    });
    return { ok: true, sentTo: row.phoneE164.replace(/.(?=.{4})/g, "•") };
  },

  async verifyLoginCode(mfaToken: string, code: string, req?: any) {
    const { userId, superAdmin } = this.verifyMfaToken(mfaToken);
    const row = await prisma.userMfaEnrollment.findUnique({ where: { userId } });
    if (!row || row.enrolledAt.getTime() <= 0) {
      throw Object.assign(new Error("MFA not enrolled"), { status: 400 });
    }

    let ok = false;
    const normalized = String(code || "").replace(/\s/g, "");
    if (row.totpSecretEnc) {
      const secret = decryptMfaSecret(row.totpSecretEnc);
      if (verifyTotp(secret, normalized)) ok = true;
    }
    if (!ok && row.phoneE164) {
      ok = await verifySmsChallenge(userId, normalized, "LOGIN");
    }
    if (!ok && row.backupCodes) {
      const hashes: string[] = JSON.parse(row.backupCodes);
      const idx = hashes.findIndex((h) => bcrypt.compareSync(normalized.toUpperCase(), h));
      if (idx >= 0) {
        hashes.splice(idx, 1);
        await prisma.userMfaEnrollment.update({
          where: { userId },
          data: { backupCodes: JSON.stringify(hashes), lastUsedAt: new Date() },
        });
        ok = true;
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { school: true },
    });
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

    if (!ok) {
      await logSystemEvent("mfa_verify_failed", "AUTH", `MFA verify failed for ${user.email}`, "WARN", req, {
        category: "SECURITY",
        userId,
        schoolId: user.schoolId,
      });
      throw Object.assign(new Error("Invalid MFA code"), { status: 401 });
    }

    await prisma.userMfaEnrollment.update({
      where: { userId },
      data: { lastUsedAt: new Date() },
    });
    await logSystemEvent("mfa_verify_success", "AUTH", `MFA login for ${user.email}`, "INFO", req, {
      category: "SECURITY",
      userId,
      schoolId: user.schoolId,
    });

    if (superAdmin || user.role === "SUPER_ADMIN") {
      const platformRole = normalizeSaPlatformRole(user.platformRole);
      const capabilities = capabilitiesForSaRole(platformRole);
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, platformRole },
        getSuperAdminJwtSecret(),
        { expiresIn: ACCESS_TOKEN_TTL }
      );
      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          platformRole,
          photoUrl: user.photoUrl,
          signatureUrl: user.signatureUrl,
          preferredLocale: user.preferredLocale,
          mustChangePassword: user.mustChangePassword,
        },
        capabilities,
      };
    }

    const capabilities = await capabilityService.resolveEffective(user.schoolId, user.role);
    const commercial = user.schoolId ? await getSchoolCommercialContext(user.schoolId) : null;
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        schoolStatus: user.school?.status || null,
        capabilities,
      },
      getJwtAccessSecret(),
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        photoUrl: user.photoUrl,
        signatureUrl: user.signatureUrl,
        phone: user.phone,
        mustChangePassword: user.mustChangePassword,
        preferredLocale: user.preferredLocale,
        emailVerified: Boolean(user.emailVerifiedAt),
      },
      school: user.school,
      capabilities,
      entitlements: commercial?.entitlements ?? null,
      quotas: commercial?.quotas ?? null,
    };
  },

  async checkLoginMfa(user: { id: string; role: string; school: { securityPolicy: string | null } | null }) {
    const policy = parseSecurityPolicy(user.school?.securityPolicy);
    const enrollment = await prisma.userMfaEnrollment.findUnique({ where: { userId: user.id } });
    const enrolled = Boolean(enrollment && enrollment.enrolledAt.getTime() > 0);
    const requirement = mfaRequiredForUser(policy, user.role, enrolled);
    if (requirement === "enroll_required") {
      throw Object.assign(
        new Error("Two-factor authentication is required. Enroll in Profile → Security before signing in."),
        { code: "MFA_ENROLLMENT_REQUIRED", status: 403 }
      );
    }
    if (requirement === "challenge") {
      return {
        mfaRequired: true,
        mfaToken: this.signMfaToken(user.id),
        methods: loginMethods(enrollment),
      };
    }
    return null;
  },

  async checkOperatorMfa(user: { id: string; role: string }) {
    if (user.role !== "SUPER_ADMIN") return null;
    const settings = await platformOpsService.ensurePlatformSettings();
    if (!settings.requireOperatorMfa) return null;
    const enrollment = await prisma.userMfaEnrollment.findUnique({ where: { userId: user.id } });
    const enrolled = Boolean(enrollment && enrollment.enrolledAt.getTime() > 0);
    if (!enrolled) {
      throw Object.assign(
        new Error("Platform operator MFA is required. Enroll TOTP or SMS in Profile → Security first."),
        { code: "MFA_ENROLLMENT_REQUIRED", status: 403 }
      );
    }
    return {
      mfaRequired: true,
      mfaToken: this.signMfaToken(user.id, { superAdmin: true }),
      methods: loginMethods(enrollment),
    };
  },
};
