import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { resolveEntitlements } from "../domain/platformPlans";
import { isSchoolLoginAllowed } from "../domain/schoolStatus";
import { getJwtAccessSecret, ACCESS_TOKEN_TTL } from "../middleware/auth";
import { logSystemEvent } from "../utils/logger";

const SANDBOX_KEY_PREFIX = "gnet_sandbox_";
const LIVE_KEY_PREFIX = "gnet_live_";

function generateRawKey(type: "sandbox" | "production"): string {
  const prefix = type === "sandbox" ? SANDBOX_KEY_PREFIX : LIVE_KEY_PREFIX;
  return `${prefix}${crypto.randomBytes(24).toString("base64url")}`;
}

export const apiKeyService = {
  async list(schoolId: string, keyType?: "sandbox" | "production") {
    const where: any = { schoolId, revokedAt: null };
    if (keyType) {
      where.keyType = keyType;
    }
    const rows = await prisma.schoolApiKey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdBy: true,
        lastUsedAt: true,
        createdAt: true,
        keyType: true,
      },
    });
    return rows;
  },

  async create(schoolId: string, name: string, createdBy: string, keyType: "sandbox" | "production" = "sandbox", req?: any) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { planCode: true, entitlementsOverride: true },
    });
    if (!school) {
      throw Object.assign(new Error("School not found"), { status: 404 });
    }

    // Sandbox keys: all tenants can create
    // Production keys: require api_access entitlement
    if (keyType === "production") {
      const entitlements = resolveEntitlements(school.planCode, school.entitlementsOverride);
      if (!entitlements.includes("api_access")) {
        throw Object.assign(new Error("API access requires Premium plan or api_access entitlement"), {
          status: 403,
          code: "FEATURE_NOT_ENTITLED",
          feature: "api_access",
        });
      }
    }

    const label = String(name || "").trim();
    if (!label) {
      throw Object.assign(new Error("Key name is required"), { status: 400 });
    }

    const rawKey = generateRawKey(keyType);
    const keyPrefix = rawKey.slice(0, keyType === "sandbox" ? SANDBOX_KEY_PREFIX.length + 4 : LIVE_KEY_PREFIX.length + 4);
    const keyHash = bcrypt.hashSync(rawKey, 10);

    const row = await prisma.schoolApiKey.create({
      data: {
        schoolId,
        name: label,
        keyType,
        keyPrefix,
        keyHash,
        createdBy,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        keyType: true,
        createdAt: true,
      },
    });

    await logSystemEvent(
      "api_key_added",
      "SETTINGS",
      `School API key created: ${label} (${keyType})`,
      "WARNING",
      req,
      {
        category: "SETTINGS",
        entityType: "SchoolApiKey",
        entityId: row.id,
        schoolId,
        after: { name: label, keyPrefix, keyType },
        tags: ["api_key", `create_${keyType}`],
      }
    );

    return { ...row, secret: rawKey };
  },

  async revoke(schoolId: string, keyId: string, req?: any) {
    const existing = await prisma.schoolApiKey.findFirst({
      where: { id: keyId, schoolId, revokedAt: null },
    });
    if (!existing) {
      throw Object.assign(new Error("API key not found"), { status: 404 });
    }
    const row = await prisma.schoolApiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
    await logSystemEvent(
      "api_key_removed",
      "SETTINGS",
      `School API key revoked: ${existing.name}`,
      "WARNING",
      req,
      {
        category: "SETTINGS",
        entityType: "SchoolApiKey",
        entityId: keyId,
        schoolId,
        before: { name: existing.name, keyPrefix: existing.keyPrefix, keyType: existing.keyType },
        tags: ["api_key", "revoke"],
      }
    );
    return row;
  },

  async verify(rawKey: string, schoolId?: string) {
    const key = String(rawKey || "").trim();
    if (!key) {
      throw Object.assign(new Error("Invalid API key"), { status: 401, code: "INVALID_API_KEY" });
    }

    const isSandbox = key.startsWith(SANDBOX_KEY_PREFIX);
    const isLive = key.startsWith(LIVE_KEY_PREFIX);

    if (!isSandbox && !isLive) {
      throw Object.assign(new Error("Invalid API key prefix"), { status: 401, code: "INVALID_API_KEY" });
    }

    const prefix = isSandbox ? SANDBOX_KEY_PREFIX.length + 4 : LIVE_KEY_PREFIX.length + 4;
    const candidates = await prisma.schoolApiKey.findMany({
      where: { keyPrefix: prefix, revokedAt: null, keyType: isSandbox ? "sandbox" : "production" },
      include: { school: { select: { id: true, planCode: true, entitlementsOverride: true, status: true, trialEndsAt: true } } },
      take: 5,
    });
    const hit = candidates.find((row) => bcrypt.compareSync(key, row.keyHash));
    if (!hit) {
      throw Object.assign(new Error("Invalid API key"), { status: 401, code: "INVALID_API_KEY" });
    }

    if (schoolId && hit.schoolId !== schoolId) {
      throw Object.assign(new Error("API key does not belong to the specified school"), { status: 403 });
    }

    // For production keys, check school status and entitlements
    if (hit.keyType === "production") {
      if (!isSchoolLoginAllowed(hit.school.status, hit.school.trialEndsAt)) {
        throw Object.assign(new Error("School access is not available"), {
          status: 403,
          code: "SCHOOL_SUSPENDED",
        });
      }

      const entitlements = resolveEntitlements(hit.school.planCode, hit.school.entitlementsOverride);
      if (!entitlements.includes("api_access")) {
        throw Object.assign(new Error("API access is not enabled on this school's plan"), {
          status: 403,
          code: "FEATURE_NOT_ENTITLED",
          feature: "api_access",
        });
      }
    }
    // Sandbox keys: only check school is not suspended (no api_access entitlement required)
    else {
      if (!isSchoolLoginAllowed(hit.school.status, hit.school.trialEndsAt)) {
        throw Object.assign(new Error("School access is not available"), {
          status: 403,
          code: "SCHOOL_SUSPENDED",
        });
      }
    }

    await prisma.schoolApiKey.update({
      where: { id: hit.id },
      data: { lastUsedAt: new Date() },
    });

    const accessToken = jwt.sign(
      {
        id: `apikey:${hit.id}`,
        role: "API_CLIENT",
        schoolId: hit.schoolId,
        apiKeyId: hit.id,
        capabilities: [],
        keyType: hit.keyType,
      },
      getJwtAccessSecret(),
      { expiresIn: "15m" }
    );

    return {
      accessToken,
      schoolId: hit.schoolId,
      apiKeyId: hit.id,
      tokenType: "Bearer",
      expiresIn: "15m",
      keyType: hit.keyType,
    };
  },
};

  async revoke(schoolId: string, keyId: string, req?: any) {
    const existing = await prisma.schoolApiKey.findFirst({
      where: { id: keyId, schoolId, revokedAt: null },
    });
    if (!existing) {
      throw Object.assign(new Error("API key not found"), { status: 404 });
    }
    const row = await prisma.schoolApiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
    await logSystemEvent(
      "api_key_removed",
      "SETTINGS",
      `School API key revoked: ${existing.name}`,
      "WARNING",
      req,
      {
        category: "SETTINGS",
        entityType: "SchoolApiKey",
        entityId: keyId,
        schoolId,
        before: { name: existing.name, keyPrefix: existing.keyPrefix },
        tags: ["api_key", "revoke"],
      }
    );
    return row;
  },

  async verify(rawKey: string) {
    const key = String(rawKey || "").trim();
    if (!key.startsWith(KEY_PREFIX) || key.length < 20) {
      throw Object.assign(new Error("Invalid API key"), { status: 401, code: "INVALID_API_KEY" });
    }
    const prefix = key.slice(0, KEY_PREFIX.length + 4);
    const candidates = await prisma.schoolApiKey.findMany({
      where: { keyPrefix: prefix, revokedAt: null },
      include: { school: { select: { id: true, planCode: true, entitlementsOverride: true, status: true, trialEndsAt: true } } },
      take: 5,
    });
    const hit = candidates.find((row) => bcrypt.compareSync(key, row.keyHash));
    if (!hit) {
      throw Object.assign(new Error("Invalid API key"), { status: 401, code: "INVALID_API_KEY" });
    }

    if (!isSchoolLoginAllowed(hit.school.status, hit.school.trialEndsAt)) {
      throw Object.assign(new Error("School access is not available"), {
        status: 403,
        code: "SCHOOL_SUSPENDED",
      });
    }

    const entitlements = resolveEntitlements(hit.school.planCode, hit.school.entitlementsOverride);
    if (!entitlements.includes("api_access")) {
      throw Object.assign(new Error("API access is not enabled on this school's plan"), {
        status: 403,
        code: "FEATURE_NOT_ENTITLED",
        feature: "api_access",
      });
    }

    await prisma.schoolApiKey.update({
      where: { id: hit.id },
      data: { lastUsedAt: new Date() },
    });

    const accessToken = jwt.sign(
      {
        id: `apikey:${hit.id}`,
        role: "API_CLIENT",
        schoolId: hit.schoolId,
        apiKeyId: hit.id,
        capabilities: [],
      },
      getJwtAccessSecret(),
      { expiresIn: "15m" }
    );

    return {
      accessToken,
      schoolId: hit.schoolId,
      apiKeyId: hit.id,
      tokenType: "Bearer",
      expiresIn: ACCESS_TOKEN_TTL,
    };
  },
};
