import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { logSystemEvent } from "../utils/logger";
import { generateTempPassword } from "../lib/mailer";
import { maskSecret } from "../lib/mailRuntimeConfig";
import {
  encryptCredentialSecret,
  decryptCredentialSecret,
} from "../lib/credentialCrypto";
import {
  parseSecurityPolicy,
  validatePasswordAgainstPolicy,
  DEFAULT_SECURITY_POLICY,
} from "../lib/securityPolicy";
import { assertCanSetUserPassword, PasswordResetDeniedError } from "../domain/passwordResetPolicy";
import {
  emptyHeadcounts,
  headcountsFromRoleGroups,
  rolesForDirectoryKind,
  type DirectoryListKind,
  type SchoolHeadcounts,
} from "../domain/superAdminDirectory";
import {
  ALLOWED_SCHOOL_STATUSES,
  provisionSchool,
  resendInvite,
} from "./schoolProvisioning";
import { schoolRegistrationService } from "./schoolRegistrationService";
import { inferAuditCategory } from "../domain/auditCategories";

function inferCategorySafe(module: string, action: string) {
  try {
    return inferAuditCategory(module, action);
  } catch {
    return "SYSTEM";
  }
}

async function assertPasswordForSchool(schoolId: string | null | undefined, password: string) {
  let policy = DEFAULT_SECURITY_POLICY;
  if (schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { securityPolicy: true },
    });
    policy = parseSecurityPolicy(school?.securityPolicy);
  }
  const err = validatePasswordAgainstPolicy(password, policy);
  if (err) {
    throw Object.assign(new Error(err), { status: 400, code: "PASSWORD_POLICY" });
  }
}

async function loadHeadcountsBySchoolId(schoolIds?: string[]): Promise<Map<string, SchoolHeadcounts>> {
  const where =
    schoolIds && schoolIds.length > 0
      ? { schoolId: { in: schoolIds } }
      : { schoolId: { not: null } };
  const rows = await prisma.user.groupBy({
    by: ["schoolId", "role"],
    where,
    _count: { _all: true },
  });
  return headcountsFromRoleGroups(rows as any);
}

function withHeadcounts<T extends { id: string; _count?: { users: number } }>(
  school: T,
  counts: SchoolHeadcounts
) {
  return {
    ...school,
    studentCount: counts.studentCount,
    staffCount: counts.staffCount,
    parentCount: counts.parentCount,
    userCount: counts.userCount,
    _count: { users: counts.userCount },
  };
}

const directoryUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  phone: true,
  gradeLevelId: true,
  photoUrl: true,
  joiningDate: true,
} as const;

/**
 * Ported from src/server/services/superAdminService.ts.
 * registerSchool now uses shared provisionSchool (invite + mailer).
 */
export const superAdminService = {
  async getSchools(query: { q?: string; status?: string; page?: number | string; pageSize?: number | string } = {}) {
    const where: any = {};
    const q = (query.q || "").trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { contactEmail: { contains: q, mode: "insensitive" } },
      ];
    }
    if (query.status) where.status = String(query.status).toUpperCase();
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50));
    const [total, schools] = await Promise.all([
      prisma.school.count({ where }),
      prisma.school.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const countsMap = await loadHeadcountsBySchoolId(schools.map((s) => s.id));
    return {
      items: schools.map((s) => withHeadcounts(s, countsMap.get(s.id) || emptyHeadcounts())),
      total,
      page,
      pageSize,
    };
  },

  async getSchoolById(id: string) {
    const school = await prisma.school.findUnique({ where: { id } });
    if (!school) {
      throw Object.assign(new Error("School not found"), { status: 404 });
    }
    const countsMap = await loadHeadcountsBySchoolId([id]);
    return withHeadcounts(school, countsMap.get(id) || emptyHeadcounts());
  },

  async listSchoolDirectory(
    schoolId: string,
    kind: DirectoryListKind,
    query: { q?: string; page?: number | string; pageSize?: number | string } = {}
  ) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, slug: true },
    });
    if (!school) {
      throw Object.assign(new Error("School not found"), { status: 404 });
    }

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const q = (query.q || "").trim();

    const roleFilter = rolesForDirectoryKind(kind);
    const where: any = { schoolId };
    if (roleFilter === "staff") {
      where.role = { notIn: ["STUDENT", "PARENT", "SUPER_ADMIN"] };
    } else {
      where.role = { in: roleFilter };
    }
    if (q) {
      where.AND = [
        {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: [{ name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: directoryUserSelect,
      }),
    ]);

    return { school, kind, items, total, page, pageSize };
  },

  async resetUserPassword(
    userId: string,
    body: { password?: string; mustChangePassword?: boolean; reason?: string },
    actor: { id: string; role: string; schoolId: string | null },
    req?: any
  ) {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        schoolId: true,
      },
    });
    if (!target) {
      throw Object.assign(new Error("User not found"), { status: 404 });
    }
    if (target.role === "SUPER_ADMIN") {
      throw Object.assign(new Error("Cannot reset another Super Admin password via this endpoint"), {
        status: 403,
        code: "PASSWORD_RESET_FORBIDDEN",
      });
    }

    try {
      assertCanSetUserPassword(actor, target, { isSelfChange: false });
    } catch (err) {
      if (err instanceof PasswordResetDeniedError) {
        throw Object.assign(new Error(err.message), { status: err.status, code: err.code });
      }
      throw err;
    }

    const password =
      typeof body.password === "string" && body.password.trim()
        ? body.password.trim()
        : generateTempPassword();
    await assertPasswordForSchool(target.schoolId, password);
    const mustChange =
      body.mustChangePassword !== undefined ? Boolean(body.mustChangePassword) : true;

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: bcrypt.hashSync(password, 10),
        mustChangePassword: mustChange,
      },
    });

    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    await logSystemEvent(
      "password_reset",
      "SUPER_ADMIN",
      `Super Admin reset password for ${target.email} (${target.id}) school=${target.schoolId || "none"}${
        reason ? ` reason=${reason}` : ""
      }`,
      "WARNING",
      {
        ...req,
        user: {
          ...(req?.user || {}),
          id: actor.id,
          schoolId: target.schoolId,
        },
      },
      {
        category: "AUTH",
        entityType: "User",
        entityId: target.id,
        schoolId: target.schoolId,
        userEmail: target.email,
        after: { mustChangePassword: mustChange, reason: reason || null },
        tags: ["password", "reset", "super_admin"],
      }
    );

    return {
      id: target.id,
      email: target.email,
      name: target.name,
      role: target.role,
      schoolId: target.schoolId,
      mustChangePassword: mustChange,
      tempPassword: password,
    };
  },

  async registerSchool(data: any, req: any) {
    return provisionSchool(
      {
        name: data.name,
        slug: data.slug,
        country: data.country,
        timezone: data.timezone,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        planCode: data.planCode,
        status: data.status === "TRIAL" ? "TRIAL" : "ACTIVE",
        onboardingSource: "SUPER_ADMIN",
        approvedBy: (req as any)?.user?.id,
      },
      req
    );
  },

  async resendSchoolInvite(schoolId: string) {
    return resendInvite(schoolId);
  },

  listRegistrations: schoolRegistrationService.list.bind(schoolRegistrationService),
  getRegistration: schoolRegistrationService.getById.bind(schoolRegistrationService),
  approveRegistration: schoolRegistrationService.approve.bind(schoolRegistrationService),
  rejectRegistration: schoolRegistrationService.reject.bind(schoolRegistrationService),
  requestRegistrationInfo: schoolRegistrationService.requestInfo.bind(schoolRegistrationService),

  async getStats() {
    const [totalSchools, totalUsers, activeSchools, suspendedSchools, pendingRegistrations, studentCount, staffCount] =
      await Promise.all([
        prisma.school.count(),
        prisma.user.count({ where: { schoolId: { not: null } } }),
        prisma.school.count({ where: { status: { in: ["ACTIVE", "TRIAL"] } } }),
        prisma.school.count({ where: { status: "SUSPENDED" } }),
        prisma.schoolRegistration.count({ where: { status: { in: ["SUBMITTED", "NEEDS_INFO"] } } }),
        prisma.user.count({ where: { role: "STUDENT", schoolId: { not: null } } }),
        prisma.user.count({
          where: {
            schoolId: { not: null },
            role: { notIn: ["STUDENT", "PARENT", "SUPER_ADMIN"] },
          },
        }),
      ]);

    const recentRaw = await prisma.school.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    });
    const countsMap = await loadHeadcountsBySchoolId(recentRaw.map((s) => s.id));
    const recentSchools = recentRaw.map((s) => withHeadcounts(s, countsMap.get(s.id) || emptyHeadcounts()));

    const recentLogs = await prisma.systemLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, role: true } } },
    });

    const billingRows = await prisma.school.findMany({
      select: { planCode: true, billingStatus: true },
    });
    const { computeLedgerMrrUsd } = await import("../domain/platformPlans");
    const { platformStripeEnabled } = await import("../lib/platformBillingCheckout");
    const mrr = computeLedgerMrrUsd(billingRows);
    const paidSchoolCount = billingRows.filter((s) => s.billingStatus === "ACTIVE_PAID").length;
    const checkoutMode = platformStripeEnabled() ? "stripe" : "console";

    return {
      totalSchools,
      activeSchools,
      suspendedSchools,
      pendingRegistrations,
      totalUsers,
      activeStudents: studentCount,
      totalStudents: studentCount,
      totalStaff: staffCount,
      totalTeachers: staffCount,
      revenue: mrr,
      mrr,
      billingConnected: true,
      checkoutMode,
      paidSchoolCount,
      billingNote: platformStripeEnabled()
        ? "Ledger MRR from ACTIVE_PAID list prices; Stripe checkout enabled"
        : "Ledger MRR; Stripe checkout optional (STRIPE_SECRET_KEY unset — console checkout)",
      recentSchools,
      recentLogs,
      trends: {
        months: [] as string[],
        enrollment: [] as number[],
        revenue: [] as number[],
      },
    };
  },

  async getUsers(
    query: {
      q?: string;
      role?: string;
      schoolId?: string;
      isActive?: string;
      page?: number | string;
      pageSize?: number | string;
    } = {}
  ) {
    const where: any = {};
    const q = (query.q || "").trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
    if (query.role) where.role = String(query.role).toUpperCase();
    if (query.schoolId) where.schoolId = query.schoolId;
    if (query.isActive === "true") where.isActive = true;
    if (query.isActive === "false") where.isActive = false;

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50));
    const select = {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      photoUrl: true,
      schoolId: true,
      school: { select: { name: true, slug: true } },
    } as const;
    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select,
      }),
    ]);
    return { items, total, page, pageSize };
  },

  async getLogs(query: {
    level?: string;
    module?: string;
    category?: string;
    search?: string;
    q?: string;
    from?: string;
    to?: string;
    userId?: string;
    schoolId?: string;
    action?: string;
    page?: number | string;
    pageSize?: number | string;
  } = {}) {
    try {
      const where: any = {};
      const levelRaw = query.level ? String(query.level).toUpperCase() : "";
      const level =
        levelRaw === "WARN" ? "WARNING" : levelRaw;
      const module = query.module ? String(query.module).toUpperCase() : "";
      const category = query.category ? String(query.category).toUpperCase() : "";
      const q = (query.q || query.search || "").trim();
      const action = query.action ? String(query.action).trim() : "";

      if (level) {
        // Accept both WARN and WARNING in historical rows
        where.level = level === "WARNING" ? { in: ["WARNING", "WARN"] } : level;
      }
      if (module) where.module = module;
      if (category) where.category = category;
      if (query.userId) where.userId = String(query.userId);
      if (query.schoolId) where.schoolId = String(query.schoolId);
      if (action) where.action = { contains: action, mode: "insensitive" };

      if (query.from || query.to) {
        where.createdAt = {};
        if (query.from) {
          const from = new Date(query.from);
          if (!Number.isNaN(from.getTime())) where.createdAt.gte = from;
        }
        if (query.to) {
          const to = new Date(query.to);
          if (!Number.isNaN(to.getTime())) where.createdAt.lte = to;
        }
      }

      if (q) {
        where.OR = [
          { action: { contains: q, mode: "insensitive" } },
          { details: { contains: q, mode: "insensitive" } },
          { userName: { contains: q, mode: "insensitive" } },
          { userEmail: { contains: q, mode: "insensitive" } },
          { module: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { entityType: { contains: q, mode: "insensitive" } },
          { entityId: { contains: q, mode: "insensitive" } },
          { ipAddress: { contains: q, mode: "insensitive" } },
        ];
      }

      const page = Math.max(1, Number(query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

      const [total, items] = await Promise.all([
        prisma.systemLog.count({ where }),
        prisma.systemLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            user: { select: { name: true, role: true, email: true } },
            school: { select: { name: true, slug: true } },
          },
        }),
      ]);

      // Normalize level for clients
      const normalized = items.map((row) => ({
        ...row,
        level: row.level === "WARN" ? "WARNING" : row.level,
        category: row.category || inferCategorySafe(row.module, row.action),
      }));

      return { items: normalized, total, page, pageSize };
    } catch (err) {
      console.warn("Prisma error in superAdminService.getLogs, returning fallback data:", err);
      return { items: [], total: 0, page: 1, pageSize: 20 };
    }
  },

  async getLogSummary(query: { from?: string; to?: string } = {}) {
    try {
      const where: any = {};
      if (query.from || query.to) {
        where.createdAt = {};
        if (query.from) {
          const from = new Date(query.from);
          if (!Number.isNaN(from.getTime())) where.createdAt.gte = from;
        }
        if (query.to) {
          const to = new Date(query.to);
          if (!Number.isNaN(to.getTime())) where.createdAt.lte = to;
        }
      }
      const [byCategory, byLevel, total] = await Promise.all([
        prisma.systemLog.groupBy({ by: ["category"], where, _count: { _all: true } }),
        prisma.systemLog.groupBy({ by: ["level"], where, _count: { _all: true } }),
        prisma.systemLog.count({ where }),
      ]);
      return {
        total,
        byCategory: Object.fromEntries(
          byCategory.map((r) => [r.category || "SYSTEM", r._count._all])
        ),
        byLevel: Object.fromEntries(
          byLevel.map((r) => [
            r.level === "WARN" ? "WARNING" : r.level || "INFO",
            r._count._all,
          ])
        ),
      };
    } catch (err) {
      console.warn("getLogSummary failed:", err);
      return { total: 0, byCategory: {}, byLevel: {} };
    }
  },

  async getCredentials() {
    try {
      const rows = await prisma.systemCredential.findMany({ orderBy: { createdAt: "desc" } });
      return rows.map((row) => {
        const plain = decryptCredentialSecret(row.secret);
        return {
          ...row,
          secret: plain ? maskSecret(plain) : null,
        };
      });
    } catch (err) {
      console.warn("Prisma error in superAdminService.getCredentials, returning fallback array:", err);
      return [];
    }
  },

  async createCredential(data: any, req?: any) {
    const name = String(data?.name ?? "").trim();
    const key = String(data?.key ?? "").trim();
    if (!name) {
      throw Object.assign(new Error("Credential name is required"), {
        status: 400,
        code: "CREDENTIAL_NAME_REQUIRED",
      });
    }
    if (!key) {
      throw Object.assign(new Error("Credential key is required"), {
        status: 400,
        code: "CREDENTIAL_KEY_REQUIRED",
      });
    }
    const provider = data?.provider ? String(data.provider).trim().toUpperCase() : null;
    const rawSecret = typeof data?.secret === "string" ? data.secret : "";
    const hasSecret = rawSecret.trim() !== "";
    try {
      const row = await prisma.systemCredential.create({
        data: {
          name,
          key,
          provider,
          secret: hasSecret ? encryptCredentialSecret(rawSecret) : null,
          metadata: data?.metadata ?? undefined,
        },
      });
      await logSystemEvent(
        "api_key_added",
        "SETTINGS",
        `Credential created: ${name} (${provider || "n/a"})`,
        "WARNING",
        req,
        {
          category: "SETTINGS",
          entityType: "SystemCredential",
          entityId: row.id,
          after: { name, provider, key },
          tags: ["credential", "create"],
        }
      );
      return { ...row, secret: hasSecret ? maskSecret(rawSecret) : null };
    } catch (err: any) {
      if (err?.code === "P2002") {
        throw Object.assign(new Error("A credential with this key already exists"), {
          status: 409,
          code: "CREDENTIAL_KEY_EXISTS",
        });
      }
      console.error("Error creating system credential:", err);
      throw err;
    }
  },

  async deleteCredential(id: string, req?: any) {
    const before = await prisma.systemCredential.findUnique({ where: { id } });
    if (!before) {
      throw Object.assign(new Error("Credential not found"), {
        status: 404,
        code: "CREDENTIAL_NOT_FOUND",
      });
    }
    try {
      const row = await prisma.systemCredential.delete({ where: { id } });
      await logSystemEvent(
        "api_key_removed",
        "SETTINGS",
        `Credential removed: ${before.name || id}`,
        "WARNING",
        req,
        {
          category: "SETTINGS",
          entityType: "SystemCredential",
          entityId: id,
          before: { name: before.name, provider: before.provider, key: before.key },
          tags: ["credential", "delete"],
        }
      );
      return row;
    } catch (err: any) {
      if (err?.code === "P2025") {
        throw Object.assign(new Error("Credential not found"), {
          status: 404,
          code: "CREDENTIAL_NOT_FOUND",
        });
      }
      console.error("Error deleting system credential:", err);
      throw err;
    }
  },

  async updateSchoolStatus(id: string, status: string, req?: any) {
    if (!ALLOWED_SCHOOL_STATUSES.includes(status as any)) {
      throw Object.assign(new Error(`Invalid status: ${status}`), { status: 400 });
    }
    const before = await prisma.school.findUnique({
      where: { id },
      select: { id: true, name: true, status: true, slug: true },
    });
    const data: any = { status };
    if (status === "SUSPENDED") data.suspendedAt = new Date();
    if (status === "ACTIVE" || status === "TRIAL") {
      data.suspendedAt = null;
      data.suspendReason = null;
    }
    const school = await prisma.school.update({ where: { id }, data });
    const action =
      status === "SUSPENDED"
        ? "tenant_suspended"
        : status === "ACTIVE" || status === "TRIAL"
          ? "tenant_activated"
          : "tenant_status_changed";
    await logSystemEvent(
      action,
      "SCHOOLS",
      `School ${before?.name || id} status ${before?.status || "?"} → ${status}`,
      status === "SUSPENDED" ? "WARNING" : "INFO",
      req,
      {
        category: "SCHOOLS",
        schoolId: id,
        entityType: "School",
        entityId: id,
        before: before ? { status: before.status, name: before.name } : null,
        after: { status, name: school.name },
        tags: ["school", "status", status.toLowerCase()],
      }
    );
    return school;
  },

  async updateSchool(id: string, data: any) {
    const { name, slug, country, timezone, contactEmail, planCode, trialEndsAt } = data;
    return await prisma.school.update({
      where: { id },
      data: {
        name,
        slug,
        country,
        ...(timezone !== undefined ? { timezone } : {}),
        contactEmail,
        ...(planCode !== undefined ? { planCode } : {}),
        ...(trialEndsAt !== undefined ? { trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null } : {}),
      },
    });
  },

  async deleteSchool(id: string) {
    try {
      await prisma.destructiveActionRequest.deleteMany({ where: { schoolId: id } });
      // Only identity-owned rows are cleaned up here now. Classroom/Academic/
      // Lifecycle/Staff/Finance/Ops/Comms services own the rest and should react
      // to a school.deleted event once the event bus lands (roadmap §5).
      await prisma.user.deleteMany({ where: { schoolId: id } });
      return await prisma.school.delete({ where: { id } });
    } catch (err) {
      console.warn("Cascade delete failed, attempting direct delete:", err);
      return await prisma.school.delete({ where: { id } });
    }
  },
};
