import dns from "node:dns/promises";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { logSystemEvent } from "../utils/logger";
import { getJwtAccessSecret } from "../middleware/auth";
import { capabilityService } from "./capabilityService";
import { isSchoolLoginAllowed } from "../domain/schoolStatus";
import {
  listPlatformPlans,
  resolveEntitlements,
  resolvePlan,
  resolveQuotas,
  isPlatformPlanCode,
  isBillingStatus,
  computeLedgerMrrUsd,
  setRuntimePlansCatalog,
  normalizeFeatureKeys,
  sanitizePlanCode,
  PLATFORM_PLANS,
  type PlatformPlan,
  type BillingStatus,
  needsFeatureCatalogExpansion,
} from "../domain/platformPlans";
import {
  assertSaCapability as assertSaRoleCapability,
  capabilitiesForSaRole,
  normalizeSaPlatformRole,
  SA_PLATFORM_ROLES,
  type SaCapability,
  type SaPlatformRole,
} from "../domain/saCapabilities";
import {
  parseSecurityPolicy,
  serializeSecurityPolicy,
  DEFAULT_SECURITY_POLICY,
} from "../lib/securityPolicy";
import { ACCESS_TOKEN_TTL } from "../middleware/auth";
import { emptyHeadcounts, headcountsFromRoleGroups } from "../domain/superAdminDirectory";
import { superAdminService } from "./superAdminService";
import { sendMail, appBaseUrl, generateTempPassword } from "../lib/mailer";
import bcrypt from "bcryptjs";
import {
  createPlatformCheckout,
  resolvePlatformConsoleSession,
  verifyPlatformStripeWebhook,
  platformStripeEnabled,
} from "../lib/platformBillingCheckout";

type Actor = { id: string; role: string; schoolId?: string | null; platformRole?: string | null };

async function loadSaPlatformRole(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformRole: true, role: true },
  });
  if (!u || u.role !== "SUPER_ADMIN") return "ANALYST";
  return normalizeSaPlatformRole(u.platformRole);
}

async function requireCap(actor: Actor, cap: SaCapability) {
  const role = actor.platformRole || (await loadSaPlatformRole(actor.id));
  assertSaRoleCapability(role, cap);
}

function rowToPlatformPlan(row: {
  code: string;
  label: string;
  description: string;
  maxStudents: number | null;
  maxStaff: number | null;
  maxStorageMb: number | null;
  featuresJson: string;
  monthlyPriceUsd: number;
  trialDays: number | null;
  isActive: boolean;
  sortOrder: number;
}): PlatformPlan {
  let featuresRaw: unknown = [];
  try {
    featuresRaw = JSON.parse(row.featuresJson || "[]");
  } catch {
    featuresRaw = [];
  }
  return {
    code: row.code,
    label: row.label,
    description: row.description,
    maxStudents: row.maxStudents,
    maxStaff: row.maxStaff,
    maxStorageMb: row.maxStorageMb,
    features: normalizeFeatureKeys(featuresRaw),
    monthlyPriceUsd: row.monthlyPriceUsd,
    trialDays: row.trialDays ?? undefined,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

let catalogReady: Promise<void> | null = null;

async function refreshPlansCatalogFromDb() {
  const rows = await prisma.platformPlan.findMany({ orderBy: [{ sortOrder: "asc" }, { code: "asc" }] });
  if (rows.length === 0) {
    setRuntimePlansCatalog(null);
    return;
  }
  setRuntimePlansCatalog(rows.map(rowToPlatformPlan));
}

/** Seed DB catalog from code defaults when empty; expand legacy feature sets once; refresh cache. */
async function ensurePlansCatalog() {
  if (!catalogReady) {
    catalogReady = (async () => {
      const count = await prisma.platformPlan.count();
      if (count === 0) {
        for (const p of Object.values(PLATFORM_PLANS)) {
          await prisma.platformPlan.create({
            data: {
              code: p.code,
              label: p.label,
              description: p.description,
              maxStudents: p.maxStudents,
              maxStaff: p.maxStaff,
              maxStorageMb: p.maxStorageMb,
              featuresJson: JSON.stringify(p.features),
              monthlyPriceUsd: p.monthlyPriceUsd,
              trialDays: p.trialDays ?? null,
              isActive: p.isActive !== false,
              sortOrder: p.sortOrder ?? 0,
            },
          });
        }
      } else {
        // One-time expand built-in plan feature lists from the old 8-key catalog.
        for (const p of Object.values(PLATFORM_PLANS)) {
          const row = await prisma.platformPlan.findUnique({ where: { code: p.code } });
          if (!row) {
            await prisma.platformPlan.create({
              data: {
                code: p.code,
                label: p.label,
                description: p.description,
                maxStudents: p.maxStudents,
                maxStaff: p.maxStaff,
                maxStorageMb: p.maxStorageMb,
                featuresJson: JSON.stringify(p.features),
                monthlyPriceUsd: p.monthlyPriceUsd,
                trialDays: p.trialDays ?? null,
                isActive: p.isActive !== false,
                sortOrder: p.sortOrder ?? 0,
              },
            });
            continue;
          }
          let stored: string[] = [];
          try {
            stored = JSON.parse(row.featuresJson || "[]");
            if (!Array.isArray(stored)) stored = [];
          } catch {
            stored = [];
          }
          if (needsFeatureCatalogExpansion(stored.map(String))) {
            await prisma.platformPlan.update({
              where: { code: p.code },
              data: {
                featuresJson: JSON.stringify(p.features),
                description: p.description,
              },
            });
          }
        }
      }
      await refreshPlansCatalogFromDb();
    })();
  }
  await catalogReady;
  await refreshPlansCatalogFromDb();
}

async function countActiveOwners(excludeUserId?: string) {
  const owners = await prisma.user.findMany({
    where: {
      role: "SUPER_ADMIN",
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true, platformRole: true },
  });
  return owners.filter((u) => normalizeSaPlatformRole(u.platformRole) === "OWNER").length;
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const idx = next++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]);
    }
  }
  const n = Math.min(Math.max(1, concurrency), Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

function normalizeHostname(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

/** Hostnames treated as the shared platform (not a school custom domain). */
function collectPlatformHosts(): Set<string> {
  const platformHosts = new Set(
    [
      "localhost",
      "127.0.0.1",
      ...(process.env.PLATFORM_HOSTS || "")
        .split(",")
        .map((h) => normalizeHostname(h))
        .filter(Boolean),
    ]
  );
  try {
    const appHost = new URL(appBaseUrl()).hostname;
    if (appHost) platformHosts.add(normalizeHostname(appHost));
  } catch {
    /* ignore */
  }
  const edge = normalizeHostname(process.env.PLATFORM_EDGE_HOSTNAME || "");
  if (edge) platformHosts.add(edge);
  const appDomain = normalizeHostname(process.env.APP_DOMAIN || "");
  if (appDomain) {
    platformHosts.add(appDomain);
    platformHosts.add(`www.${appDomain}`);
  }
  return platformHosts;
}

/** Public CNAME target operators should point school domains at. */
function edgeCnameTarget(): string {
  const explicit = normalizeHostname(process.env.PLATFORM_CNAME_TARGET || "");
  if (explicit) return explicit;
  const edge = normalizeHostname(process.env.PLATFORM_EDGE_HOSTNAME || "");
  if (edge) return edge;
  try {
    return normalizeHostname(new URL(appBaseUrl()).hostname) || "app.example.com";
  } catch {
    return "app.example.com";
  }
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

export const platformOpsService = {
  async assertSaCapability(actor: Actor, cap: SaCapability) {
    await requireCap(actor, cap);
  },

  async listPlans() {
    await ensurePlansCatalog();
    return listPlatformPlans();
  },

  /** Public marketing catalog — active plans only, no auth. */
  async listPublicPlans() {
    await ensurePlansCatalog();
    return listPlatformPlans({ activeOnly: true }).map((p) => ({
      code: p.code,
      label: p.label,
      description: p.description,
      maxStudents: p.maxStudents,
      maxStaff: p.maxStaff,
      maxStorageMb: p.maxStorageMb,
      features: p.features,
      monthlyPriceUsd: p.monthlyPriceUsd,
      trialDays: p.trialDays ?? null,
      sortOrder: p.sortOrder ?? 0,
    }));
  },

  async updatePlan(
    codeRaw: string,
    body: {
      label?: string;
      description?: string;
      maxStudents?: number | null;
      maxStaff?: number | null;
      maxStorageMb?: number | null;
      features?: string[];
      monthlyPriceUsd?: number;
      trialDays?: number | null;
      isActive?: boolean;
      sortOrder?: number;
    },
    actor: Actor,
    req?: any
  ) {
    await requireCap(actor, "plans.manage");
    await ensurePlansCatalog();
    const code = sanitizePlanCode(codeRaw);
    const row = await prisma.platformPlan.findUnique({ where: { code } });
    if (!row) {
      throw Object.assign(new Error("Plan not found"), { status: 404, code: "PLAN_NOT_FOUND" });
    }

    const data: Record<string, unknown> = {};
    if (body.label !== undefined) {
      const label = String(body.label || "").trim();
      if (!label) throw Object.assign(new Error("Label required"), { status: 400 });
      data.label = label;
    }
    if (body.description !== undefined) data.description = String(body.description || "");
    for (const key of ["maxStudents", "maxStaff", "maxStorageMb"] as const) {
      if (body[key] !== undefined) {
        const v = body[key];
        if (v === null || v === undefined || v === ("" as any)) data[key] = null;
        else {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0) {
            throw Object.assign(new Error(`Invalid ${key}`), { status: 400 });
          }
          data[key] = Math.floor(n);
        }
      }
    }
    if (body.features !== undefined) {
      data.featuresJson = JSON.stringify(normalizeFeatureKeys(body.features));
    }
    if (body.monthlyPriceUsd !== undefined) {
      const price = Number(body.monthlyPriceUsd);
      if (!Number.isFinite(price) || price < 0) {
        throw Object.assign(new Error("Invalid monthlyPriceUsd"), { status: 400 });
      }
      data.monthlyPriceUsd = price;
    }
    if (body.trialDays !== undefined) {
      if (body.trialDays === null || body.trialDays === ("" as any)) data.trialDays = null;
      else {
        const d = Number(body.trialDays);
        if (!Number.isFinite(d) || d < 0) {
          throw Object.assign(new Error("Invalid trialDays"), { status: 400 });
        }
        data.trialDays = Math.floor(d);
      }
    }
    if (body.sortOrder !== undefined) {
      data.sortOrder = Math.floor(Number(body.sortOrder) || 0);
    }
    if (body.isActive !== undefined) {
      const nextActive = Boolean(body.isActive);
      if (!nextActive) {
        const inUse = await prisma.school.count({ where: { planCode: code } });
        if (inUse > 0) {
          throw Object.assign(
            new Error(`Cannot retire plan ${code}: ${inUse} school(s) still assigned. Reassign first.`),
            { status: 400, code: "PLAN_IN_USE" }
          );
        }
      }
      data.isActive = nextActive;
    }

    const updated = await prisma.platformPlan.update({ where: { code }, data: data as any });
    await refreshPlansCatalogFromDb();
    await logSystemEvent(
      "plan_catalog_updated",
      "SUPER_ADMIN",
      `Updated plan catalog ${code}`,
      "INFO",
      req
    );
    return rowToPlatformPlan(updated);
  },

  async createPlan(
    body: {
      code: string;
      label: string;
      description?: string;
      maxStudents?: number | null;
      maxStaff?: number | null;
      maxStorageMb?: number | null;
      features?: string[];
      monthlyPriceUsd?: number;
      trialDays?: number | null;
      sortOrder?: number;
    },
    actor: Actor,
    req?: any
  ) {
    await requireCap(actor, "plans.manage");
    await ensurePlansCatalog();
    const code = sanitizePlanCode(body.code);
    if (!code || code.length < 2) {
      throw Object.assign(new Error("Invalid plan code"), { status: 400 });
    }
    const label = String(body.label || "").trim();
    if (!label) throw Object.assign(new Error("Label required"), { status: 400 });
    const clash = await prisma.platformPlan.findUnique({ where: { code } });
    if (clash) {
      throw Object.assign(new Error("Plan code already exists"), { status: 409, code: "PLAN_EXISTS" });
    }
    const price = Number(body.monthlyPriceUsd ?? 0);
    if (!Number.isFinite(price) || price < 0) {
      throw Object.assign(new Error("Invalid monthlyPriceUsd"), { status: 400 });
    }
    const created = await prisma.platformPlan.create({
      data: {
        code,
        label,
        description: String(body.description || ""),
        maxStudents: body.maxStudents == null ? null : Math.floor(Number(body.maxStudents)),
        maxStaff: body.maxStaff == null ? null : Math.floor(Number(body.maxStaff)),
        maxStorageMb: body.maxStorageMb == null ? null : Math.floor(Number(body.maxStorageMb)),
        featuresJson: JSON.stringify(normalizeFeatureKeys(body.features || ["core"])),
        monthlyPriceUsd: price,
        trialDays: body.trialDays == null ? null : Math.floor(Number(body.trialDays)),
        isActive: true,
        sortOrder: Math.floor(Number(body.sortOrder) || 100),
      },
    });
    await refreshPlansCatalogFromDb();
    await logSystemEvent("plan_catalog_created", "SUPER_ADMIN", `Created plan ${code}`, "INFO", req);
    return rowToPlatformPlan(created);
  },

  async assignPlan(
    schoolId: string,
    body: {
      planCode: string;
      trialEndsAt?: string | null;
      entitlementsOverride?: string[] | null;
      quotaOverrides?: Record<string, number | null> | null;
      customDomain?: string | null;
    },
    actor: Actor,
    req?: any
  ) {
    await requireCap(actor, "plans.manage");
    await ensurePlansCatalog();
    if (!isPlatformPlanCode(body.planCode)) {
      throw Object.assign(new Error("Invalid plan code"), { status: 400, code: "INVALID_PLAN" });
    }
    const plan = resolvePlan(body.planCode);
    if (plan.isActive === false) {
      throw Object.assign(new Error("Plan is retired"), { status: 400, code: "PLAN_INACTIVE" });
    }

    const existing = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!existing) {
      throw Object.assign(new Error("School not found"), { status: 404 });
    }

    const data: any = { planCode: body.planCode };
    if (body.trialEndsAt !== undefined) {
      data.trialEndsAt = body.trialEndsAt ? new Date(body.trialEndsAt) : null;
    } else if (plan.trialDays && body.planCode === "TRIAL") {
      data.trialEndsAt = new Date(Date.now() + plan.trialDays * 86400000);
      if (data.status === undefined) {
        /* keep school status; optionally set TRIAL */
      }
    }
    if (body.entitlementsOverride !== undefined) {
      data.entitlementsOverride =
        body.entitlementsOverride === null
          ? null
          : JSON.stringify(body.entitlementsOverride);
    }
    if (body.quotaOverrides !== undefined) {
      data.quotaOverrides =
        body.quotaOverrides === null ? null : JSON.stringify(body.quotaOverrides);
    }
    if (body.customDomain !== undefined) {
      const domain = body.customDomain ? normalizeHostname(String(body.customDomain)) : null;
      if (domain) {
        data._pendingDomain = domain;
      } else {
        data.customDomain = null;
        data.domainVerifyToken = null;
        data.domainVerifiedAt = null;
      }
    }
    if (body.planCode === "TRIAL") {
      data.status = "TRIAL";
    }

    const pendingDomain = data._pendingDomain as string | undefined;
    delete data._pendingDomain;

    let school = await prisma.school.update({ where: { id: schoolId }, data });

    if (pendingDomain) {
      school = await this.applyCustomDomain(schoolId, pendingDomain, actor, req);
    }

    await logSystemEvent(
      "plan_assigned",
      "SUPER_ADMIN",
      `Assigned plan ${body.planCode} to school ${school.slug} (${school.id})`,
      "INFO",
      { ...req, user: { id: actor.id, schoolId } }
    );

    const overrideFields: string[] = [];
    if (body.entitlementsOverride !== undefined) overrideFields.push("entitlementsOverride");
    if (body.quotaOverrides !== undefined) overrideFields.push("quotaOverrides");
    if (overrideFields.length > 0) {
      const before = {
        planCode: existing.planCode,
        entitlementsOverride: existing.entitlementsOverride,
        quotaOverrides: existing.quotaOverrides,
      };
      const after = {
        planCode: school.planCode,
        entitlementsOverride: school.entitlementsOverride,
        quotaOverrides: school.quotaOverrides,
      };
      await logSystemEvent(
        "entitlement_override",
        "SUPER_ADMIN",
        `Entitlement/quota override for ${school.slug} (${school.id}): ${overrideFields.join(", ")}`,
        "WARN",
        { ...req, user: { id: actor.id, schoolId } },
        {
          entityType: "School",
          entityId: school.id,
          before,
          after,
          tags: overrideFields,
        }
      );
    }

    return this.enrichSchoolCommercial(school);
  },

  enrichSchoolCommercial(school: any) {
    const entitlements = resolveEntitlements(school.planCode, school.entitlementsOverride);
    const quotas = resolveQuotas(school.planCode, school.quotaOverrides);
    const plan = resolvePlan(school.planCode);
    const domainVerified = Boolean(school.domainVerifiedAt);
    const txtHost = school.customDomain ? `_gnet-sms.${school.customDomain}` : null;
    const cnameTarget = edgeCnameTarget();
    return {
      ...school,
      plan,
      entitlements,
      quotas,
      domainVerified,
      domainTxtHost: txtHost,
      domainTxtValue: school.domainVerifyToken || null,
      listPriceUsd: plan.monthlyPriceUsd,
      domainEdge: {
        cnameTarget,
        cnameRecord: school.customDomain
          ? { host: school.customDomain, type: "CNAME", value: cnameTarget }
          : null,
        https:
          "Terminate TLS at the platform edge (optional Docker profile `edge` with Caddy on-demand TLS). The app does not store certificates.",
        steps: [
          "Confirm the school plan includes the custom_domain entitlement (Enterprise or override).",
          "Save the hostname, then add the TXT ownership record and click Verify TXT.",
          `Add a DNS CNAME from the hostname to ${cnameTarget} (or an A record to the edge IP).`,
          "Enable HTTPS on the edge (compose profile `edge`, or your CDN). Login uses resolve-host for Host → school.",
        ],
      },
    };
  },

  async applyCustomDomain(schoolId: string, domainRaw: string, actor: Actor, req?: any) {
    await requireCap(actor, "plans.manage");
    const domain = normalizeHostname(domainRaw);
    if (!domain || !domain.includes(".")) {
      throw Object.assign(new Error("Invalid custom domain"), { status: 400, code: "INVALID_DOMAIN" });
    }
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw Object.assign(new Error("School not found"), { status: 404 });
    const entitlements = resolveEntitlements(school.planCode, school.entitlementsOverride);
    if (!entitlements.includes("custom_domain")) {
      throw Object.assign(new Error("Custom domain requires ENTERPRISE (or custom_domain entitlement)"), {
        status: 403,
        code: "ENTITLEMENT_REQUIRED",
      });
    }
    const clash = await prisma.school.findFirst({
      where: { customDomain: domain, NOT: { id: schoolId } },
      select: { id: true },
    });
    if (clash) {
      throw Object.assign(new Error("Domain already assigned to another school"), {
        status: 409,
        code: "DOMAIN_IN_USE",
      });
    }
    const token = crypto.randomBytes(16).toString("hex");
    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: {
        customDomain: domain,
        domainVerifyToken: token,
        domainVerifiedAt: null,
      },
    });
    await logSystemEvent(
      "custom_domain_set",
      "SUPER_ADMIN",
      `Custom domain ${domain} set for ${updated.slug}; awaiting TXT verify`,
      "INFO",
      { ...req, user: { id: actor.id, schoolId } }
    );
    return updated;
  },

  async setCustomDomain(schoolId: string, domain: string | null, actor: Actor, req?: any) {
    if (!domain) {
      await requireCap(actor, "plans.manage");
      const updated = await prisma.school.update({
        where: { id: schoolId },
        data: { customDomain: null, domainVerifyToken: null, domainVerifiedAt: null },
      });
      return this.enrichSchoolCommercial(updated);
    }
    const updated = await this.applyCustomDomain(schoolId, domain, actor, req);
    return this.enrichSchoolCommercial(updated);
  },

  async verifyCustomDomain(schoolId: string, actor: Actor, req?: any) {
    await requireCap(actor, "plans.manage");
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school?.customDomain || !school.domainVerifyToken) {
      throw Object.assign(new Error("No pending domain verification"), { status: 400 });
    }
    const name = `_gnet-sms.${school.customDomain}`;
    let txtFlat: string[] = [];
    try {
      const records = await dns.resolveTxt(name);
      txtFlat = records.map((parts) => parts.join(""));
    } catch (err: any) {
      throw Object.assign(
        new Error(`DNS lookup failed for ${name}: ${err?.code || err?.message || "unknown"}`),
        { status: 400, code: "DNS_LOOKUP_FAILED" }
      );
    }
    if (!txtFlat.includes(school.domainVerifyToken)) {
      throw Object.assign(
        new Error(`TXT record at ${name} does not match expected token`),
        { status: 400, code: "DNS_TXT_MISMATCH", found: txtFlat }
      );
    }
    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: { domainVerifiedAt: new Date() },
    });
    await logSystemEvent(
      "custom_domain_verified",
      "SUPER_ADMIN",
      `Verified custom domain ${school.customDomain} for ${school.slug}`,
      "INFO",
      { ...req, user: { id: actor.id, schoolId } }
    );
    return this.enrichSchoolCommercial(updated);
  },

  async resolveHost(hostRaw: string) {
    const host = normalizeHostname(hostRaw);
    if (!host) {
      return { matched: false as const };
    }
    const platformHosts = collectPlatformHosts();
    if (platformHosts.has(host)) {
      return { matched: false as const, reason: "platform_host" as const };
    }
    const school = await prisma.school.findFirst({
      where: {
        customDomain: host,
        domainVerifiedAt: { not: null },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        brandColor: true,
        logoUrl: true,
        defaultLocale: true,
        status: true,
      },
    });
    if (!school) return { matched: false as const };
    return {
      matched: true as const,
      schoolId: school.id,
      schoolSlug: school.slug,
      schoolName: school.name,
      brandColor: school.brandColor,
      logoUrl: school.logoUrl,
      defaultLocale: school.defaultLocale,
      status: school.status,
    };
  },

  /**
   * Caddy on_demand_tls ask — HTTP 200 only when the certificate may be issued.
   * Allows platform hosts + verified school custom domains.
   */
  async domainTlsAsk(domainRaw: string): Promise<{ allow: boolean; reason: string }> {
    const host = normalizeHostname(domainRaw);
    if (!host || !host.includes(".")) {
      return { allow: false, reason: "invalid" };
    }
    if (collectPlatformHosts().has(host)) {
      return { allow: true, reason: "platform_host" };
    }
    const school = await prisma.school.findFirst({
      where: { customDomain: host, domainVerifiedAt: { not: null } },
      select: { id: true },
    });
    if (school) return { allow: true, reason: "verified_custom_domain" };
    return { allow: false, reason: "unknown_host" };
  },

  async getDomainEdgeGuide(actor: Actor) {
    await requireCap(actor, "plans.manage");
    const cnameTarget = edgeCnameTarget();
    const verified = await prisma.school.findMany({
      where: { customDomain: { not: null }, domainVerifiedAt: { not: null } },
      select: {
        id: true,
        slug: true,
        name: true,
        customDomain: true,
        domainVerifiedAt: true,
        planCode: true,
      },
      orderBy: { customDomain: "asc" },
    });
    const domains = verified.map((s) => s.customDomain!).filter(Boolean);
    const nginxSnippet = [
      "# Example — prefer a single catch-all SPA (frontend-spa already uses server_name _).",
      "# Point each verified hostname at this edge, then rely on /api/public/resolve-host.",
      ...domains.map(
        (d) =>
          `# ${d} → CNAME ${cnameTarget}`
      ),
    ].join("\n");
    const caddySnippet = `{
  email \${ACME_EMAIL}
  on_demand_tls {
    ask http://api-gateway:8081/api/public/domain-tls-ask
  }
}

:443 {
  tls {
    on_demand
  }
  reverse_proxy frontend-spa:80
}

:80 {
  reverse_proxy frontend-spa:80
}
`;
    return {
      cnameTarget,
      platformHosts: [...collectPlatformHosts()],
      edgeProfile: "docker compose --profile edge up -d",
      docsPath: "docs/CUSTOM_DOMAIN_EDGE.md",
      verifiedDomains: verified,
      nginxSnippet,
      caddySnippet,
      steps: [
        "Set PLATFORM_EDGE_HOSTNAME / PLATFORM_CNAME_TARGET in Identity env to your public edge hostname.",
        "For each school: save domain → TXT verify → CNAME to cnameTarget.",
        "Run compose profile `edge` (Caddy) or terminate TLS at your CDN in front of frontend-spa:80.",
      ],
    };
  },

  async updateSchoolBilling(
    schoolId: string,
    body: { billingStatus: string; reason?: string },
    actor: Actor,
    req?: any
  ) {
    await requireCap(actor, "plans.manage");
    if (!isBillingStatus(body.billingStatus)) {
      throw Object.assign(new Error("Invalid billingStatus"), { status: 400 });
    }
    const status = body.billingStatus as BillingStatus;
    const data: Record<string, unknown> = { billingStatus: status };
    if (status === "COMP" || status === "ACTIVE_PAID") {
      data.billingProvider = "ledger";
      data.currentPeriodEnd = new Date(Date.now() + 30 * 86400000);
    }
    if (status === "CANCELLED" || status === "TRIAL") {
      data.currentPeriodEnd = null;
    }
    const school = await prisma.school.update({ where: { id: schoolId }, data });
    await logSystemEvent(
      "school_billing_updated",
      "SUPER_ADMIN",
      `Billing ${status} for ${school.slug}; reason=${String(body.reason || "").slice(0, 200)}`,
      "INFO",
      { ...req, user: { id: actor.id, schoolId } }
    );
    return this.enrichSchoolCommercial(school);
  },

  async startBillingCheckout(schoolId: string, actor: Actor, req?: any) {
    await requireCap(actor, "plans.manage");
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw Object.assign(new Error("School not found"), { status: 404 });
    const plan = resolvePlan(school.planCode);
    if (plan.monthlyPriceUsd <= 0) {
      throw Object.assign(new Error("Plan has no list price — use Mark COMP or change plan"), {
        status: 400,
        code: "NO_LIST_PRICE",
      });
    }
    const base = appBaseUrl();
    const session = await createPlatformCheckout({
      schoolId: school.id,
      planCode: plan.code,
      amountUsd: plan.monthlyPriceUsd,
      schoolName: school.name,
      successUrl: `${base}/super-admin/schools/${school.id}?billing=success`,
      cancelUrl: `${base}/super-admin/schools/${school.id}?billing=cancel`,
      customerEmail: school.contactEmail || undefined,
    });
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        platformCheckoutSessionId: session.id,
        billingProvider: session.provider,
      },
    });
    await logSystemEvent(
      "platform_checkout_started",
      "SUPER_ADMIN",
      `Checkout ${session.provider} ${session.id} for ${school.slug} plan=${plan.code} $${plan.monthlyPriceUsd}`,
      "INFO",
      { ...req, user: { id: actor.id, schoolId } }
    );
    return session;
  },

  async markSchoolPaid(
    schoolId: string,
    opts: { provider: string; sessionId?: string; planCode?: string },
    actorId?: string | null,
    req?: any
  ) {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw Object.assign(new Error("School not found"), { status: 404 });
    const planCode = opts.planCode && isPlatformPlanCode(opts.planCode) ? opts.planCode : school.planCode;
    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: {
        billingStatus: "ACTIVE_PAID",
        billingProvider: opts.provider,
        platformCheckoutSessionId: opts.sessionId || school.platformCheckoutSessionId,
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        ...(planCode ? { planCode } : {}),
        status: school.status === "TRIAL" ? "ACTIVE" : school.status,
      },
    });
    await logSystemEvent(
      "platform_checkout_paid",
      "SUPER_ADMIN",
      `School ${updated.slug} marked ACTIVE_PAID via ${opts.provider}`,
      "INFO",
      { ...req, user: { id: actorId || "system", schoolId } }
    );
    return this.enrichSchoolCommercial(updated);
  },

  async completeConsoleCheckout(sessionId: string, actor: Actor, req?: any) {
    await requireCap(actor, "plans.manage");
    const resolved = resolvePlatformConsoleSession(sessionId);
    if (!resolved) {
      throw Object.assign(new Error("Unknown or already-completed console session"), {
        status: 404,
        code: "SESSION_NOT_FOUND",
      });
    }
    return this.markSchoolPaid(
      resolved.schoolId,
      { provider: "console", sessionId, planCode: resolved.planCode },
      actor.id,
      req
    );
  },

  async handlePlatformStripeWebhook(rawBody: Buffer | string, signature: string | undefined) {
    const paid = await verifyPlatformStripeWebhook(rawBody, signature);
    if (!paid) return { ok: false as const, reason: "ignored" as const };
    const school = await this.markSchoolPaid(paid.schoolId, {
      provider: "stripe",
      planCode: paid.planCode,
    });
    return { ok: true as const, school };
  },

  async computePlatformMrr() {
    const schools = await prisma.school.findMany({
      select: { planCode: true, billingStatus: true },
    });
    const mrr = computeLedgerMrrUsd(schools);
    const paidCount = schools.filter((s) => s.billingStatus === "ACTIVE_PAID").length;
    return {
      billingConnected: true,
      revenue: mrr,
      mrr,
      mrrCurrency: "USD",
      paidSchoolCount: paidCount,
      checkoutMode: platformStripeEnabled() ? "stripe" : "console",
      note: platformStripeEnabled()
        ? "Ledger MRR from ACTIVE_PAID list prices; Stripe checkout enabled"
        : "Ledger MRR; Stripe checkout optional (STRIPE_SECRET_KEY unset — console checkout)",
    };
  },


  async setUserActive(
    userId: string,
    isActive: boolean,
    actor: Actor,
    req?: any
  ) {
    await requireCap(actor, "users.disable");
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, schoolId: true, isActive: true },
    });
    if (!target) throw Object.assign(new Error("User not found"), { status: 404 });
    if (target.role === "SUPER_ADMIN") {
      throw Object.assign(new Error("Cannot disable Super Admin via this endpoint"), {
        status: 403,
      });
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        schoolId: true,
      },
    });
    await logSystemEvent(
      isActive ? "user_unlocked" : "user_disabled",
      "SUPER_ADMIN",
      `${isActive ? "Unlocked" : "Disabled"} user ${target.email} (${target.id})`,
      "WARN",
      { ...req, user: { id: actor.id, schoolId: target.schoolId } }
    );
    return updated;
  },

  async exportSchoolsCsv(actor: Actor) {
    await requireCap(actor, "reports.read");
    const { items: schools } = await superAdminService.getSchools({ page: 1, pageSize: 5000 });
    return toCsv(
      schools.map((s: any) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        status: s.status,
        country: s.country,
        planCode: s.planCode || "",
        studentCount: s.studentCount,
        staffCount: s.staffCount,
        parentCount: s.parentCount,
        userCount: s.userCount,
        contactEmail: s.contactEmail,
        createdAt: s.createdAt,
      }))
    );
  },

  async exportUsersCsv(actor: Actor, schoolId?: string) {
    await requireCap(actor, "reports.read");
    const users = await prisma.user.findMany({
      where: schoolId ? { schoolId } : { schoolId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        school: { select: { name: true, slug: true } },
      },
    });
    return toCsv(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        schoolName: u.school?.name || "",
        schoolSlug: u.school?.slug || "",
        createdAt: u.createdAt.toISOString(),
      }))
    );
  },

  async exportSchoolDsr(schoolId: string, actor: Actor) {
    await requireCap(actor, "export.dsr");
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw Object.assign(new Error("School not found"), { status: 404 });
    const users = await prisma.user.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        dob: true,
        gender: true,
        isActive: true,
        createdAt: true,
        preferredLocale: true,
      },
    });
    await logSystemEvent(
      "dsr_export",
      "SUPER_ADMIN",
      `DSR export for school ${school.slug} (${users.length} users)`,
      "WARN",
      { user: { id: actor.id, schoolId } }
    );
    return {
      exportedAt: new Date().toISOString(),
      school: {
        id: school.id,
        name: school.name,
        slug: school.slug,
        country: school.country,
        contactEmail: school.contactEmail,
      },
      users,
    };
  },

  async schoolHealth(schoolId: string, actor: Actor) {
    await requireCap(actor, "schools.read");
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw Object.assign(new Error("School not found"), { status: 404 });
    const countsMap = headcountsFromRoleGroups(
      (await prisma.user.groupBy({
        by: ["schoolId", "role"],
        where: { schoolId },
        _count: { _all: true },
      })) as any
    );
    const counts = countsMap.get(schoolId) || emptyHeadcounts();
    const quotas = resolveQuotas(school.planCode, school.quotaOverrides);
    const admins = await prisma.user.findMany({
      where: { schoolId, role: "SCHOOL_ADMIN" },
      select: { id: true, email: true, updatedAt: true, isActive: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });
    const lastAdminActivity = admins[0]?.updatedAt || null;
    const trialExpired =
      school.trialEndsAt && school.trialEndsAt.getTime() < Date.now() && school.status === "TRIAL";
    const studentQuotaOk =
      quotas.maxStudents == null || counts.studentCount <= quotas.maxStudents;
    const staffQuotaOk = quotas.maxStaff == null || counts.staffCount <= quotas.maxStaff;

    let score = 100;
    if (school.status === "SUSPENDED") score -= 40;
    if (!school.onboardingComplete) score -= 15;
    if (trialExpired) score -= 20;
    if (!studentQuotaOk || !staffQuotaOk) score -= 15;
    if (!admins.some((a) => a.isActive)) score -= 20;
    if (lastAdminActivity && Date.now() - lastAdminActivity.getTime() > 30 * 86400000) score -= 10;
    score = Math.max(0, Math.min(100, score));

    return {
      schoolId,
      score,
      status: school.status,
      onboardingComplete: school.onboardingComplete,
      planCode: school.planCode,
      trialEndsAt: school.trialEndsAt,
      trialExpired: Boolean(trialExpired),
      counts,
      quotas,
      quotaOk: { students: studentQuotaOk, staff: staffQuotaOk },
      lastAdminActivity,
      activeSchoolAdmins: admins.filter((a) => a.isActive).length,
    };
  },

  async updateInternalNotes(schoolId: string, notes: string, actor: Actor, req?: any) {
    await requireCap(actor, "schools.write");
    const school = await prisma.school.update({
      where: { id: schoolId },
      data: { internalNotes: notes },
    });
    await logSystemEvent(
      "school_notes_updated",
      "SUPER_ADMIN",
      `Updated internal notes for ${school.slug}`,
      "INFO",
      { ...req, user: { id: actor.id, schoolId } }
    );
    return { id: school.id, internalNotes: school.internalNotes };
  },

  async getPlatformSettings(actor: Actor) {
    await requireCap(actor, "settings.manage");
    const row = await this.ensurePlatformSettings();
    const defaultSecurityPolicy = parseSecurityPolicy(row.defaultSecurityPolicy);
    return {
      ...row,
      defaultSecurityPolicy,
      jwtAccessTtl: ACCESS_TOKEN_TTL,
    };
  },

  async ensurePlatformSettings() {
    return prisma.platformSettings.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    });
  },

  async updatePlatformSettings(
    body: {
      maintenanceMode?: boolean;
      maintenanceMessage?: string | null;
      defaultSecurityPolicy?: Partial<typeof DEFAULT_SECURITY_POLICY> | null;
      requireOperatorMfa?: boolean;
      requireRegistrationEmailConfirm?: boolean;
    },
    actor: Actor,
    req?: any
  ) {
    await requireCap(actor, "settings.manage");
    const data: any = { updatedById: actor.id };
    if (body.maintenanceMode !== undefined) data.maintenanceMode = Boolean(body.maintenanceMode);
    if (body.maintenanceMessage !== undefined) data.maintenanceMessage = body.maintenanceMessage;
    if (body.requireOperatorMfa !== undefined) {
      if (body.requireOperatorMfa) {
        const enrolled = await prisma.userMfaEnrollment.count({
          where: {
            enrolledAt: { gt: new Date(0) },
            user: { role: "SUPER_ADMIN", isActive: true },
          },
        });
        if (enrolled < 1) {
          throw Object.assign(
            new Error("At least one active Super Admin must enroll MFA before requiring operator MFA"),
            { status: 400 }
          );
        }
      }
      data.requireOperatorMfa = Boolean(body.requireOperatorMfa);
    }
    if (body.requireRegistrationEmailConfirm !== undefined) {
      data.requireRegistrationEmailConfirm = Boolean(body.requireRegistrationEmailConfirm);
    }
    if (body.defaultSecurityPolicy !== undefined) {
      if (body.defaultSecurityPolicy === null) {
        data.defaultSecurityPolicy = null;
      } else {
        const current = parseSecurityPolicy(
          (await this.ensurePlatformSettings()).defaultSecurityPolicy
        );
        data.defaultSecurityPolicy = serializeSecurityPolicy({
          ...current,
          ...body.defaultSecurityPolicy,
        });
      }
    }
    const row = await prisma.platformSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    });
    await logSystemEvent(
      "platform_settings_updated",
      "SUPER_ADMIN",
      `Platform settings updated (maintenance=${row.maintenanceMode})`,
      "WARN",
      req
    );
    return row;
  },

  async deliveryDiagnostics(actor: Actor) {
    await requireCap(actor, "audit.read");
    const [mailRows, systemItems] = await Promise.all([
      prisma.mailDeliveryLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { school: { select: { name: true, slug: true } } },
      }),
      prisma.systemLog.findMany({
        where: {
          OR: [
            { module: { contains: "MAIL", mode: "insensitive" } },
            { module: { contains: "INVITE", mode: "insensitive" } },
            { action: { contains: "invite", mode: "insensitive" } },
            { action: { contains: "email", mode: "insensitive" } },
            { details: { contains: "invite", mode: "insensitive" } },
            { details: { contains: "mail", mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          school: { select: { name: true, slug: true } },
          user: { select: { name: true, email: true } },
        },
      }),
    ]);
    const sent = mailRows.filter((r) => r.ok).length;
    const failed = mailRows.filter((r) => !r.ok).length;
    const items = [
      ...mailRows.map((r) => ({
        id: r.id,
        kind: "mail_delivery" as const,
        action: r.ok ? "mail_sent" : "mail_failed",
        module: "MAIL_BROADCAST",
        details: `${r.to} · ${r.subject} · ${r.provider}${r.error ? ` · ${r.error}` : ""}`,
        ok: r.ok,
        to: r.to,
        subject: r.subject,
        provider: r.provider,
        createdAt: r.createdAt,
        school: r.school,
      })),
      ...systemItems.map((item) => ({
        ...item,
        kind: "system_log" as const,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      items,
      mailDelivery: { sent, failed, recent: mailRows.length },
      note: "MailDeliveryLog for broadcasts; system logs for invites/legacy mail events.",
    };
  },

  async broadcastToSchoolAdmins(
    body: { subject: string; message: string },
    actor: Actor,
    req?: any
  ) {
    await requireCap(actor, "broadcast");
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    if (!subject || !message) {
      throw Object.assign(new Error("subject and message are required"), { status: 400 });
    }
    const admins = await prisma.user.findMany({
      where: { role: "SCHOOL_ADMIN", isActive: true, schoolId: { not: null } },
      select: { id: true, email: true, schoolId: true },
    });

    const results = await mapPool(admins, 5, async (admin) => {
      try {
        const sent = await sendMail({ to: admin.email, subject, text: message });
        await prisma.mailDeliveryLog.create({
          data: {
            to: admin.email,
            subject,
            provider: sent.provider,
            ok: sent.ok,
            error: sent.ok ? null : "send failed",
            schoolId: admin.schoolId,
            actorId: actor.id,
          },
        });
        return { email: admin.email, ok: sent.ok, provider: sent.provider };
      } catch (err: any) {
        await prisma.mailDeliveryLog.create({
          data: {
            to: admin.email,
            subject,
            provider: "error",
            ok: false,
            error: String(err?.message || err).slice(0, 500),
            schoolId: admin.schoolId,
            actorId: actor.id,
          },
        });
        return { email: admin.email, ok: false, error: String(err?.message || err) };
      }
    });

    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;

    await logSystemEvent(
      "platform_broadcast",
      "SUPER_ADMIN",
      `Broadcast "${subject}" to ${admins.length} school admins (sent=${sent}, failed=${failed})`,
      "INFO",
      req
    );
    return {
      queued: admins.length,
      sent,
      failed,
      recipientsPreview: admins.slice(0, 20).map((a) => a.email),
      note: failed
        ? "Some deliveries failed — see delivery diagnostics / MailDeliveryLog."
        : "Fan-out completed via sendMail.",
    };
  },

  async startImpersonation(
    targetUserId: string,
    body: { reason: string; minutes?: number },
    actor: Actor,
    req?: any
  ) {
    await requireCap(actor, "impersonate");
    const reason = String(body.reason || "").trim();
    if (reason.length < 5) {
      throw Object.assign(new Error("Impersonation reason required (min 5 chars)"), {
        status: 400,
        code: "REASON_REQUIRED",
      });
    }
    const minutes = Math.min(120, Math.max(5, Number(body.minutes) || 30));
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { school: true },
    });
    if (!target || !target.schoolId || !target.school) {
      throw Object.assign(new Error("Target must be a school user"), { status: 400 });
    }
    if (target.role === "SUPER_ADMIN") {
      throw Object.assign(new Error("Cannot impersonate Super Admin"), { status: 403 });
    }
    if (!target.isActive) {
      throw Object.assign(new Error("Target account is inactive"), { status: 400 });
    }
    if (!isSchoolLoginAllowed(target.school.status)) {
      throw Object.assign(new Error("School is not login-allowed"), { status: 403 });
    }

    const capabilities = await capabilityService.resolveEffective(target.schoolId, target.role);
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    const accessToken = jwt.sign(
      {
        id: target.id,
        email: target.email,
        role: target.role,
        schoolId: target.schoolId,
        schoolStatus: target.school.status,
        capabilities,
        impersonatedBy: actor.id,
        impersonationExpiresAt: expiresAt.toISOString(),
      },
      getJwtAccessSecret(),
      { expiresIn: `${minutes}m` }
    );

    await logSystemEvent(
      "impersonation_start",
      "SUPER_ADMIN",
      `Impersonation of ${target.email} (${target.id}) by ${actor.id}; reason=${reason}; minutes=${minutes}`,
      "WARN",
      { ...req, user: { id: actor.id, schoolId: target.schoolId } }
    );

    return {
      accessToken,
      expiresAt: expiresAt.toISOString(),
      reason,
      impersonatedBy: actor.id,
      user: {
        id: target.id,
        email: target.email,
        name: target.name,
        role: target.role,
        photoUrl: target.photoUrl,
        mustChangePassword: false,
      },
      school: target.school,
      capabilities,
    };
  },

  async startImpersonationBySchool(
    schoolId: string,
    body: { reason: string; minutes?: number },
    actor: Actor,
    req?: any
  ) {
    await requireCap(actor, "impersonate");
    const reason = String(body.reason || "").trim();
    if (reason.length < 5) {
      throw Object.assign(new Error("Impersonation reason required (min 5 chars)"), {
        status: 400,
        code: "REASON_REQUIRED",
      });
    }
    const minutes = Math.min(120, Math.max(5, Number(body.minutes) || 30));

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      throw Object.assign(new Error("School not found"), { status: 404 });
    }
    if (!isSchoolLoginAllowed(school.status)) {
      throw Object.assign(new Error("School is not login-allowed"), { status: 403 });
    }

    const candidates = await prisma.user.findMany({
      where: {
        schoolId,
        isActive: true,
        role: { not: "SUPER_ADMIN" },
      },
      orderBy: { name: "asc" },
    });

    let target = candidates.find((u) => u.role === "SCHOOL_ADMIN") || candidates.find((u) => u.role === "IT_ADMIN") || candidates[0];

    if (!target) {
      throw Object.assign(new Error("No active school users found to impersonate"), { status: 400 });
    }

    const targetWithSchool = await prisma.user.findUnique({
      where: { id: target.id },
      include: { school: true },
    });
    if (!targetWithSchool) {
      throw Object.assign(new Error("Target not found"), { status: 404 });
    }

    const capabilities = await capabilityService.resolveEffective(schoolId, targetWithSchool.role);
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    const accessToken = jwt.sign(
      {
        id: targetWithSchool.id,
        email: targetWithSchool.email,
        role: targetWithSchool.role,
        schoolId: targetWithSchool.schoolId,
        schoolStatus: targetWithSchool.school?.status || school.status,
        capabilities,
        impersonatedBy: actor.id,
        impersonationExpiresAt: expiresAt.toISOString(),
      },
      getJwtAccessSecret(),
      { expiresIn: `${minutes}m` }
    );

    await logSystemEvent(
      "impersonation_start",
      "SUPER_ADMIN",
      `Impersonation of ${targetWithSchool.email} (${targetWithSchool.id}) by ${actor.id}; reason=${reason}; minutes=${minutes}; via=school:${schoolId}`,
      "WARN",
      { ...req, user: { id: actor.id, schoolId } }
    );

    return {
      accessToken,
      expiresAt: expiresAt.toISOString(),
      reason,
      impersonatedBy: actor.id,
      user: {
        id: targetWithSchool.id,
        email: targetWithSchool.email,
        name: targetWithSchool.name,
        role: targetWithSchool.role,
        photoUrl: targetWithSchool.photoUrl,
        mustChangePassword: false,
      },
      school: targetWithSchool.school || school,
      capabilities,
    };
  },

  async endImpersonation(actor: Actor, req?: any) {
    await requireCap(actor, "impersonate");
    await logSystemEvent(
      "impersonation_end",
      "SUPER_ADMIN",
      `Impersonation ended by operator ${actor.id}`,
      "WARN",
      req
    );
    return { ok: true };
  },

  async listOperators(actor: Actor) {
    await requireCap(actor, "operators.manage");
    const users = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN" },
      select: {
        id: true,
        name: true,
        email: true,
        platformRole: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return users.map((u) => ({
      ...u,
      platformRole: normalizeSaPlatformRole(u.platformRole),
      capabilities: capabilitiesForSaRole(u.platformRole),
    }));
  },

  async setOperatorRole(
    userId: string,
    platformRole: string,
    actor: Actor,
    req?: any
  ) {
    await requireCap(actor, "operators.manage");
    if (userId === actor.id) {
      throw Object.assign(new Error("Cannot change your own operator role"), { status: 400 });
    }
    const role = normalizeSaPlatformRole(platformRole) as SaPlatformRole;
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.role !== "SUPER_ADMIN") {
      throw Object.assign(new Error("Operator not found"), { status: 404 });
    }
    const prevRole = normalizeSaPlatformRole(target.platformRole);
    if (prevRole === "OWNER" && role !== "OWNER" && target.isActive) {
      const remaining = await countActiveOwners(userId);
      if (remaining < 1) {
        throw Object.assign(new Error("Cannot demote the last active OWNER"), {
          status: 400,
          code: "LAST_OWNER",
        });
      }
    }
    const actorRole = normalizeSaPlatformRole(
      actor.platformRole || (await loadSaPlatformRole(actor.id))
    );
    if (role === "OWNER" && actorRole !== "OWNER") {
      throw Object.assign(new Error("Only OWNER can grant OWNER"), { status: 403 });
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { platformRole: role },
      select: { id: true, email: true, name: true, platformRole: true },
    });
    await logSystemEvent(
      "operator_role_changed",
      "SUPER_ADMIN",
      `Set ${target.email} platformRole=${role}`,
      "WARN",
      req
    );
    return {
      ...updated,
      platformRole: role,
      capabilities: capabilitiesForSaRole(role),
    };
  },

  async createOperator(
    body: {
      name: string;
      email: string;
      platformRole?: string;
      password?: string;
    },
    actor: Actor,
    req?: any
  ) {
    await requireCap(actor, "operators.manage");
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    if (!name || name.length < 2) {
      throw Object.assign(new Error("Name required"), { status: 400 });
    }
    if (!email || !email.includes("@")) {
      throw Object.assign(new Error("Valid email required"), { status: 400 });
    }
    const role = normalizeSaPlatformRole(body.platformRole || "SUPPORT") as SaPlatformRole;
    if (!(SA_PLATFORM_ROLES as readonly string[]).includes(role)) {
      throw Object.assign(new Error("Invalid platform role"), { status: 400 });
    }
    const actorRole = normalizeSaPlatformRole(
      actor.platformRole || (await loadSaPlatformRole(actor.id))
    );
    if (role === "OWNER" && actorRole !== "OWNER") {
      throw Object.assign(new Error("Only OWNER can grant OWNER"), { status: 403 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw Object.assign(new Error("An account with this email already exists"), {
        status: 409,
        code: "EMAIL_EXISTS",
      });
    }

    const tempPassword =
      typeof body.password === "string" && body.password.trim().length >= 8
        ? body.password.trim()
        : generateTempPassword();
    const passwordHash = bcrypt.hashSync(tempPassword, 10);

    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "SUPER_ADMIN",
        platformRole: role,
        schoolId: null,
        isActive: true,
        mustChangePassword: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        platformRole: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    await logSystemEvent(
      "operator_created",
      "SUPER_ADMIN",
      `Created platform operator ${email} role=${role}`,
      "WARN",
      req
    );

    const loginUrl = `${appBaseUrl()}/login`;
    void sendMail({
      to: email,
      subject: "Your Gnet SMS platform operator account",
      text: [
        `Hello ${name},`,
        "",
        "A platform operator account was created for you.",
        "",
        `Email: ${email}`,
        `Temporary password: ${tempPassword}`,
        "",
        `Sign in: ${loginUrl}`,
        "",
        "You will be asked to change your password on first login.",
      ].join("\n"),
    }).catch((err) => console.warn("[platformOps] operator invite email failed:", err?.message || err));

    return {
      ...created,
      platformRole: role,
      capabilities: capabilitiesForSaRole(role),
      tempPassword,
    };
  },

  async setOperatorActive(userId: string, isActive: boolean, actor: Actor, req?: any) {
    await requireCap(actor, "operators.manage");
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.role !== "SUPER_ADMIN") {
      throw Object.assign(new Error("Operator not found"), { status: 404 });
    }
    if (userId === actor.id && !isActive) {
      throw Object.assign(new Error("Cannot deactivate your own account"), { status: 400 });
    }
    const targetRole = normalizeSaPlatformRole(target.platformRole);
    if (!isActive && targetRole === "OWNER") {
      const remaining = await countActiveOwners(userId);
      if (remaining < 1) {
        throw Object.assign(new Error("Cannot deactivate the last active OWNER"), {
          status: 400,
          code: "LAST_OWNER",
        });
      }
    }
    if (isActive === target.isActive) {
      return {
        id: target.id,
        name: target.name,
        email: target.email,
        platformRole: targetRole,
        isActive: target.isActive,
        capabilities: capabilitiesForSaRole(targetRole),
      };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        platformRole: true,
        isActive: true,
      },
    });
    await logSystemEvent(
      isActive ? "operator_reactivated" : "operator_deactivated",
      "SUPER_ADMIN",
      `${isActive ? "Reactivated" : "Deactivated"} operator ${target.email}`,
      "WARN",
      req
    );
    return {
      ...updated,
      platformRole: normalizeSaPlatformRole(updated.platformRole),
      capabilities: capabilitiesForSaRole(updated.platformRole),
    };
  },

  async resetOperatorPassword(userId: string, actor: Actor, req?: any) {
    await requireCap(actor, "operators.manage");
    if (userId === actor.id) {
      throw Object.assign(new Error("Use profile settings to change your own password"), {
        status: 400,
      });
    }
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.role !== "SUPER_ADMIN") {
      throw Object.assign(new Error("Operator not found"), { status: 404 });
    }
    const tempPassword = generateTempPassword();
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: bcrypt.hashSync(tempPassword, 10),
        mustChangePassword: true,
      },
    });
    await logSystemEvent(
      "operator_password_reset",
      "SUPER_ADMIN",
      `Reset password for operator ${target.email}`,
      "WARN",
      req
    );
    return {
      id: target.id,
      email: target.email,
      name: target.name,
      mustChangePassword: true,
      tempPassword,
    };
  },

  async requestSchoolDelete(
    schoolId: string,
    reason: string,
    actor: Actor,
    req?: any
  ) {
    await requireCap(actor, "schools.delete");
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw Object.assign(new Error("School not found"), { status: 404 });
    const reasonTrim = String(reason || "").trim();
    if (reasonTrim.length < 5) {
      throw Object.assign(new Error("Delete reason required"), { status: 400 });
    }
    await prisma.destructiveActionRequest.updateMany({
      where: { schoolId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    const row = await prisma.destructiveActionRequest.create({
      data: {
        action: "DELETE_SCHOOL",
        schoolId,
        requestedById: actor.id,
        reason: reasonTrim,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        status: "PENDING",
      },
    });
    await logSystemEvent(
      "delete_requested",
      "SUPER_ADMIN",
      `Delete requested for ${school.slug}: ${reasonTrim}`,
      "WARN",
      { ...req, user: { id: actor.id, schoolId } }
    );
    return row;
  },

  async approveSchoolDelete(
    requestId: string,
    actor: Actor,
    opts: { forceSelfApprove?: boolean } = {},
    req?: any
  ) {
    await requireCap(actor, "schools.delete");
    const row = await prisma.destructiveActionRequest.findUnique({ where: { id: requestId } });
    if (!row || row.status !== "PENDING") {
      throw Object.assign(new Error("Pending delete request not found"), { status: 404 });
    }
    if (row.expiresAt.getTime() < Date.now()) {
      await prisma.destructiveActionRequest.update({
        where: { id: requestId },
        data: { status: "EXPIRED" },
      });
      throw Object.assign(new Error("Delete request expired"), { status: 400 });
    }
    if (row.requestedById === actor.id && !opts.forceSelfApprove) {
      throw Object.assign(
        new Error("A second Super Admin must approve. OWNER may pass forceSelfApprove=true only when solo."),
        { status: 400, code: "DUAL_CONTROL_REQUIRED" }
      );
    }
    if (row.requestedById === actor.id) {
      const owners = await prisma.user.count({
        where: { role: "SUPER_ADMIN", isActive: true },
      });
      if (owners > 1) {
        throw Object.assign(new Error("Self-approve blocked when multiple Super Admins exist"), {
          status: 400,
        });
      }
      const role = await loadSaPlatformRole(actor.id);
      if (normalizeSaPlatformRole(role) !== "OWNER") {
        throw Object.assign(new Error("Only OWNER may force self-approve"), { status: 403 });
      }
    }

    await superAdminService.deleteSchool(row.schoolId);
    const done = await prisma.destructiveActionRequest.update({
      where: { id: requestId },
      data: {
        status: "EXECUTED",
        approvedById: actor.id,
        executedAt: new Date(),
      },
    });
    await logSystemEvent(
      "school_deleted",
      "SUPER_ADMIN",
      `School ${row.schoolId} deleted via dual-control request ${requestId}`,
      "ERROR",
      req
    );
    return done;
  },

  async listPendingDeletes(actor: Actor) {
    await requireCap(actor, "schools.delete");
    return prisma.destructiveActionRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { school: { select: { id: true, name: true, slug: true } } },
    });
  },

  async reportsBreakdown(actor: Actor) {
    await requireCap(actor, "reports.read");
    const { items: schools } = await superAdminService.getSchools({ page: 1, pageSize: 5000 });
    const mrr = await this.computePlatformMrr();
    return {
      schools: schools.map((s: any) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        status: s.status,
        planCode: s.planCode,
        billingStatus: s.billingStatus,
        studentCount: s.studentCount,
        staffCount: s.staffCount,
        parentCount: s.parentCount,
        userCount: s.userCount,
      })),
      ...mrr,
    };
  },

  async seedDemoSchool(actor: Actor, req?: any) {
    await requireCap(actor, "schools.write");
    const demoPasswordHash = bcrypt.hashSync("demo123", 10);

    const existing = await prisma.school.findFirst({
      where: { OR: [{ slug: "demo-school" }, { name: "Demo International School" }] },
    });
    if (existing) {
      throw Object.assign(new Error("Demo school already exists"), { status: 400, code: "DEMO_EXISTS" });
    }

    const school = await prisma.school.create({
      data: {
        name: "Demo International School",
        slug: "demo-school",
        schoolCode: "DEMO123",
        country: "United Kingdom",
        timezone: "Europe/London",
        contactEmail: "info@demoschool.com",
        status: "ACTIVE",
        planCode: "ENTERPRISE",
        billingStatus: "ACTIVE_PAID",
      },
    });

    const staffRoles = [
      { role: "SCHOOL_ADMIN", email: "demo.admin@demoschool.com", name: "Demo School Admin" },
      { role: "PRINCIPAL", email: "demo.principal@demoschool.com", name: "Demo Principal" },
      { role: "VPI", email: "demo.vpi@demoschool.com", name: "Demo VP Instruction" },
      { role: "VPA", email: "demo.vpa@demoschool.com", name: "Demo VP Administration" },
      { role: "REGISTRAR", email: "demo.registrar@demoschool.com", name: "Demo Registrar" },
      { role: "ACCOUNTANT", email: "demo.accountant@demoschool.com", name: "Demo Accountant" },
      { role: "IT_ADMIN", email: "demo.itadmin@demoschool.com", name: "Demo IT Admin" },
      { role: "TRANSPORTATION", email: "demo.transport@demoschool.com", name: "Demo Transport Manager" },
      { role: "MAINTENANCE", email: "demo.maintenance@demoschool.com", name: "Demo Maintenance Manager" },
      { role: "LIBRARIAN", email: "demo.librarian@demoschool.com", name: "Demo Librarian" },
      { role: "NURSE", email: "demo.nurse@demoschool.com", name: "Demo Nurse" },
      { role: "COUNSELOR", email: "demo.counselor@demoschool.com", name: "Demo Counselor" },
      { role: "SECURITY", email: "demo.security@demoschool.com", name: "Demo Security Chief" },
      { role: "PROCUREMENT", email: "demo.procurement@demoschool.com", name: "Demo Procurement Officer" },
      { role: "ATHLETICS_DIRECTOR", email: "demo.athletics@demoschool.com", name: "Demo Athletics Director" },
      { role: "HOSTEL_WARDEN", email: "demo.hostel@demoschool.com", name: "Demo Hostel Warden" },
      { role: "CAFETERIA_MANAGER", email: "demo.cafeteria@demoschool.com", name: "Demo Cafeteria Manager" },
    ];

    const users = [];
    for (const s of staffRoles) {
      const u = await prisma.user.upsert({
        where: { email: s.email },
        update: { schoolId: school.id, passwordHash: demoPasswordHash, role: s.role, name: s.name, isActive: true },
        create: { email: s.email, name: s.name, passwordHash: demoPasswordHash, role: s.role, schoolId: school.id, isActive: true },
      });
      users.push(u);
    }

    for (let i = 1; i <= 5; i++) {
      const u = await prisma.user.upsert({
        where: { email: `demo.teacher${i}@demoschool.com` },
        update: { schoolId: school.id, passwordHash: demoPasswordHash, role: "TEACHER", name: `Demo Teacher ${i}`, isActive: true },
        create: { email: `demo.teacher${i}@demoschool.com`, name: `Demo Teacher ${i}`, passwordHash: demoPasswordHash, role: "TEACHER", schoolId: school.id, isActive: true },
      });
      users.push(u);
    }

    for (let i = 1; i <= 20; i++) {
      const u = await prisma.user.upsert({
        where: { email: `demo.student${i}@demoschool.com` },
        update: { schoolId: school.id, passwordHash: demoPasswordHash, role: "STUDENT", name: `Demo Student ${i}`, isActive: true },
        create: { email: `demo.student${i}@demoschool.com`, name: `Demo Student ${i}`, passwordHash: demoPasswordHash, role: "STUDENT", schoolId: school.id, isActive: true },
      });
      users.push(u);
    }

    await logSystemEvent(
      "demo_school_seeded",
      "SUPER_ADMIN",
      `Seeded demo school ${school.slug} with staff/teachers/students (demo123)`,
      "INFO",
      req,
      { schoolId: school.id }
    );

    return {
      school,
      counts: { staff: staffRoles.length, teachers: 5, students: 20 },
      password: "demo123",
      message: "Demo school seeded successfully",
    };
  },
};

export async function getMaintenanceGate(): Promise<{
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
}> {
  try {
    const row = await prisma.platformSettings.findUnique({ where: { id: "default" } });
    return {
      maintenanceMode: Boolean(row?.maintenanceMode),
      maintenanceMessage: row?.maintenanceMessage || null,
    };
  } catch {
    return { maintenanceMode: false, maintenanceMessage: null };
  }
}
