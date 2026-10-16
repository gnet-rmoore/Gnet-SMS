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

function invalidCredentialsError(message = "Invalid credentials") {
  return Object.assign(new Error(message), {
    code: "INVALID_CREDENTIALS",
    status: 401,
  });
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
  async sessionForUserId(userId: string) {
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
          phone: user.phone,
          mustChangePassword: user.mustChangePassword,
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
      },
      school: user.school,
      capabilities,
      entitlements: commercial?.entitlements ?? null,
      quotas: commercial?.quotas ?? null,
    };
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
