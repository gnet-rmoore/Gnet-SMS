import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { getJwtAccessSecret, getSuperAdminJwtSecret, ACCESS_TOKEN_TTL } from "../middleware/auth";
import { isSchoolLoginAllowed, isTrialExpired } from "../domain/schoolStatus";
import { capabilityService } from "./capabilityService";
import { normalizeSaPlatformRole, capabilitiesForSaRole } from "../domain/saCapabilities";
import { getMaintenanceGate } from "./platformOpsService";
import { emailAuthService } from "./emailAuthService";
import { getSchoolCommercialContext } from "../lib/quotaEnforcement";
import { mfaService } from "./mfaService";
import { parentAccessService } from "./parentAccessService";
import { isParentPhoneLoginEnabled, normalizePhone } from "../domain/parentAccess";

function invalidCredentialsError(message = "Invalid credentials") {
  return Object.assign(new Error(message), {
    code: "INVALID_CREDENTIALS",
    status: 401,
  });
}

async function assertSchoolLoginGates(user: any, school: any) {
  if (!user.isActive) {
    throw Object.assign(new Error("Account is inactive"), {
      code: "ACCOUNT_INACTIVE",
      status: 403,
    });
  }
  if (!(await emailAuthService.isEmailVerified(user))) {
    throw Object.assign(
      new Error("Email not verified. Check your inbox or request a new verification link."),
      { code: "EMAIL_NOT_VERIFIED", status: 403 }
    );
  }
  const maintenance = await getMaintenanceGate();
  if (maintenance.maintenanceMode) {
    throw Object.assign(
      new Error(maintenance.maintenanceMessage || "Platform is in maintenance mode. Try again later."),
      { code: "MAINTENANCE_MODE", status: 503 }
    );
  }
  if (school && !isSchoolLoginAllowed(school.status, school.trialEndsAt)) {
    const trialExpired = isTrialExpired(school.status, school.trialEndsAt);
    throw Object.assign(
      new Error(
        trialExpired
          ? "Your school's trial has ended. Contact support to upgrade or extend access."
          : `School access is ${String(school.status).toLowerCase()}. Contact support.`
      ),
      {
        code: trialExpired ? "TRIAL_EXPIRED" : "SCHOOL_SUSPENDED",
        status: 403,
        schoolStatus: trialExpired ? "TRIAL_EXPIRED" : school.status,
        schoolName: school.name,
        schoolSlug: school.slug,
      }
    );
  }
}

export const authService = {
  async login(email: string, password: string) {
    console.log(`Attempting login for: ${email}`);
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { school: true },
      });

      if (!user) {
        throw invalidCredentialsError();
      }
      if (user.role === "SUPER_ADMIN") {
        return this.superAdminLogin(email, password);
      }
      if (!user.isActive) {
        throw Object.assign(new Error("Account is inactive"), { code: "ACCOUNT_INACTIVE", status: 403 });
      }
      if (!bcrypt.compareSync(password, user.passwordHash)) {
        throw invalidCredentialsError();
      }

      if (!(await emailAuthService.isEmailVerified(user))) {
        throw Object.assign(
          new Error("Email not verified. Check your inbox or request a new verification link."),
          { code: "EMAIL_NOT_VERIFIED", status: 403 }
        );
      }

      const maintenance = await getMaintenanceGate();
      if (maintenance.maintenanceMode) {
        throw Object.assign(
          new Error(maintenance.maintenanceMessage || "Platform is in maintenance mode. Try again later."),
          { code: "MAINTENANCE_MODE", status: 503 }
        );
      }

      if (user.school && !isSchoolLoginAllowed(user.school.status, user.school.trialEndsAt)) {
        const trialExpired = isTrialExpired(user.school.status, user.school.trialEndsAt);
        throw Object.assign(
          new Error(
            trialExpired
              ? "Your school's trial has ended. Contact support to upgrade or extend access."
              : `School access is ${user.school.status.toLowerCase()}. Contact support.`
          ),
          {
            code: trialExpired ? "TRIAL_EXPIRED" : "SCHOOL_SUSPENDED",
            status: 403,
            schoolStatus: trialExpired ? "TRIAL_EXPIRED" : user.school.status,
            schoolName: user.school.name,
            schoolSlug: user.school.slug,
          }
        );
      }

      const capabilities = await capabilityService.resolveEffective(user.schoolId, user.role);
      const commercial = user.schoolId ? await getSchoolCommercialContext(user.schoolId) : null;

      const mfaChallenge = await mfaService.checkLoginMfa({
        id: user.id,
        role: user.role,
        school: user.school,
      });
      if (mfaChallenge) {
        return mfaChallenge;
      }

      const accessToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
          schoolStatus: user.school?.status || null,
          capabilities,
          authMethod: "PASSWORD",
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
          authMethod: "PASSWORD",
          preferredLocale: user.preferredLocale,
          emailVerified: Boolean(user.emailVerifiedAt),
        },
        school: user.school,
        capabilities,
        entitlements: commercial?.entitlements ?? null,
        quotas: commercial?.quotas ?? null,
      };
    } catch (err: any) {
      console.error("Prisma error during login:", err);
      if (err.code || err.clientVersion) {
        if (err.status) throw err;
        throw new Error(`Database connection error: ${err.message}`);
      }
      throw err;
    }
  },

  /** Refresh session payload (capabilities) for an authenticated user. */
  async sessionForUserId(userId: string, authMethod = "PASSWORD") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { school: true },
    });
    if (!user || !user.isActive) {
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    }

    // Super Admin tokens must stay signed with SUPER_ADMIN_JWT_SECRET.
    // Re-minting with JWT_ACCESS_SECRET breaks /api/super-admin/* (authenticateSuperAdmin).
    if (user.role === "SUPER_ADMIN") {
      const platformRole = normalizeSaPlatformRole(user.platformRole);
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, platformRole, authMethod },
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
          phone: user.phone,
          mustChangePassword: user.mustChangePassword,
          authMethod,
          preferredLocale: user.preferredLocale,
        },
        school: null,
        capabilities: null,
      };
    }

    if (user.school && !isSchoolLoginAllowed(user.school.status, user.school.trialEndsAt)) {
      const trialExpired = isTrialExpired(user.school.status, user.school.trialEndsAt);
      throw Object.assign(
        new Error(
          trialExpired
            ? "Your school's trial has ended. Contact support to upgrade or extend access."
            : `School access is ${user.school.status.toLowerCase()}. Contact support.`
        ),
        {
          code: trialExpired ? "TRIAL_EXPIRED" : "SCHOOL_SUSPENDED",
          status: 403,
          schoolStatus: trialExpired ? "TRIAL_EXPIRED" : user.school.status,
          schoolName: user.school.name,
          schoolSlug: user.school.slug,
        }
      );
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
        authMethod,
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
        authMethod,
        preferredLocale: user.preferredLocale,
      },
      school: user.school,
      capabilities,
      entitlements: commercial?.entitlements ?? null,
      quotas: commercial?.quotas ?? null,
    };
  },

  async completeSchoolLogin(input: {
    user: any;
    school: any;
    authMethod?: string;
    schoolIdOverride?: string | null;
  }) {
    const { user, school } = input;
    const authMethod = input.authMethod || "PASSWORD";
    const resolvedSchoolId = input.schoolIdOverride ?? school?.id ?? user.schoolId ?? null;
    const capabilities = await capabilityService.resolveEffective(resolvedSchoolId, user.role);
    const commercial = resolvedSchoolId ? await getSchoolCommercialContext(resolvedSchoolId) : null;
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        schoolId: resolvedSchoolId,
        schoolStatus: school?.status || null,
        capabilities,
        authMethod,
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
        authMethod,
        preferredLocale: user.preferredLocale,
        emailVerified: Boolean(user.emailVerifiedAt),
      },
      school,
      capabilities,
      entitlements: commercial?.entitlements ?? null,
      quotas: commercial?.quotas ?? null,
    };
  },

  async parentAccessCodeLogin(code: string) {
    const rows = await parentAccessService.findByAccessCode(code);
    if (rows.length !== 1) throw invalidCredentialsError();
    const row = rows[0];
    if (!row.user || row.user.role !== "PARENT" || !row.school) {
      throw invalidCredentialsError();
    }
    await parentAccessService.assertParentInSchool(row.userId, row.schoolId);
    await parentAccessService.verifyAccessCode(row.userId, row.schoolId, code);
    await assertSchoolLoginGates(row.user, row.school);
    const mfaChallenge = await mfaService.checkLoginMfa(
      { id: row.user.id, role: row.user.role, school: row.school },
      { authMethod: "ACCESS_CODE", schoolId: row.schoolId, schoolSlug: row.school.slug }
    );
    if (mfaChallenge) return mfaChallenge;
    return this.completeSchoolLogin({
      user: row.user,
      school: row.school,
      authMethod: "ACCESS_CODE",
    });
  },

  async parentPhoneSendCode(schoolSlug: string, phone: string) {
    if (!isParentPhoneLoginEnabled()) {
      throw Object.assign(new Error("Parent phone sign-in is disabled"), {
        code: "PARENT_PHONE_LOGIN_NOT_ALLOWED",
        status: 403,
      });
    }
    const school = await parentAccessService.resolveSchoolBySlug(schoolSlug);
    const phoneE164 = normalizePhone(phone);
    if (!school || !phoneE164) return { ok: true };
    const row = await parentAccessService.findEnabledPhoneLogin(school.id, phoneE164);
    if (!row) return { ok: true };
    try {
      return await parentAccessService.sendParentPhoneLoginCode(school.id, phoneE164, row.user.email);
    } catch {
      return { ok: true };
    }
  },

  async parentPhoneLogin(schoolSlug: string, phone: string, code: string) {
    if (!isParentPhoneLoginEnabled()) {
      throw Object.assign(new Error("Parent phone sign-in is disabled"), {
        code: "PARENT_PHONE_LOGIN_NOT_ALLOWED",
        status: 403,
      });
    }
    const school = await parentAccessService.resolveSchoolBySlug(schoolSlug);
    const phoneE164 = normalizePhone(phone);
    if (!school || !phoneE164) throw invalidCredentialsError();
    const row = await parentAccessService.findEnabledPhoneLogin(school.id, phoneE164);
    if (!row || row.user.role !== "PARENT") throw invalidCredentialsError();
    await parentAccessService.assertPhoneLoginAllowed(school);
    try {
      await parentAccessService.verifyPhoneLoginCode(row, school.id, code);
    } catch (err: any) {
      throw Object.assign(err, {
        code: err?.code === "TOO_MANY_ATTEMPTS" ? "TOO_MANY_ATTEMPTS" : "PARENT_PHONE_INVALID_OR_EXPIRED",
      });
    }
    const user = await prisma.user.findUnique({ where: { id: row.userId }, include: { school: true } });
    if (!user) throw invalidCredentialsError();
    await assertSchoolLoginGates(user, school);
    return this.completeSchoolLogin({ user, school, authMethod: "PHONE_OTP" });
  },

  async completeParentAccessCodeMfaLogin(user: any, school: any) {
    await parentAccessService.assertParentInSchool(user.id, school.id);
    await assertSchoolLoginGates(user, school);
    return this.completeSchoolLogin({ user, school, authMethod: "ACCESS_CODE" });
  },

  async superAdminLogin(email: string, password: string) {
    console.log(`Attempting super admin login for: ${email}`);
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || user.role !== "SUPER_ADMIN" || !bcrypt.compareSync(password, user.passwordHash)) {
        throw invalidCredentialsError("Invalid super admin credentials");
      }
      if (!user.isActive) {
        throw Object.assign(new Error("Account is inactive"), { code: "ACCOUNT_INACTIVE", status: 403 });
      }

      const mfaChallenge = await mfaService.checkOperatorMfa(user);
      if (mfaChallenge) return mfaChallenge;

      const platformRole = normalizeSaPlatformRole(user.platformRole);
      const capabilities = capabilitiesForSaRole(platformRole);
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, platformRole, authMethod: "PASSWORD" },
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
          authMethod: "PASSWORD",
        },
        capabilities,
      };
    } catch (err: any) {
      console.error("Prisma error during super admin login:", err);
      if (err?.code === "INVALID_CREDENTIALS") {
        throw err;
      }
      if (err.code || err.clientVersion) {
        throw new Error(`Database connection error: ${err.message}`);
      }
      throw err;
    }
  },
};
