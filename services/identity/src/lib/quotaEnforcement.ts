/**
 * Enforce SaaS seat quotas when creating students or staff.
 */
import prisma from "./prisma";
import { resolveQuotas } from "../domain/platformPlans";
import { headcountsFromRoleGroups, isStaffDirectoryRole } from "../domain/superAdminDirectory";

export async function studentQuotaHeadroom(
  schoolId: string
): Promise<{ limit: number; remaining: number } | null> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { planCode: true, quotaOverrides: true },
  });
  if (!school) {
    throw Object.assign(new Error("School not found"), { status: 404 });
  }
  const quotas = resolveQuotas(school.planCode, school.quotaOverrides);
  if (quotas.maxStudents == null) return null;

  const rows = await prisma.user.groupBy({
    by: ["schoolId", "role"],
    where: { schoolId, role: "STUDENT", isActive: true },
    _count: { _all: true },
  });
  const counts = headcountsFromRoleGroups(rows as any).get(schoolId);
  const current = counts?.studentCount ?? 0;
  return { limit: quotas.maxStudents, remaining: Math.max(0, quotas.maxStudents - current) };
}

export async function assertStudentQuota(schoolId: string) {
  const headroom = await studentQuotaHeadroom(schoolId);
  if (!headroom || headroom.remaining > 0) return;
  throw Object.assign(
    new Error(
      `Student seat limit reached (${headroom.limit}). Upgrade your plan or contact support.`
    ),
    { status: 403, code: "QUOTA_EXCEEDED", quota: "maxStudents", limit: headroom.limit }
  );
}

export async function staffQuotaHeadroom(
  schoolId: string
): Promise<{ limit: number; remaining: number } | null> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { planCode: true, quotaOverrides: true },
  });
  if (!school) {
    throw Object.assign(new Error("School not found"), { status: 404 });
  }
  const quotas = resolveQuotas(school.planCode, school.quotaOverrides);
  if (quotas.maxStaff == null) return null;

  const rows = await prisma.user.groupBy({
    by: ["schoolId", "role"],
    where: { schoolId, isActive: true, NOT: { role: { in: ["STUDENT", "PARENT", "SUPER_ADMIN"] } } },
    _count: { _all: true },
  });
  let staffCount = 0;
  for (const row of rows) {
    if (isStaffDirectoryRole(row.role)) {
      staffCount += typeof row._count === "number" ? row._count : row._count._all;
    }
  }
  return { limit: quotas.maxStaff, remaining: Math.max(0, quotas.maxStaff - staffCount) };
}

export async function assertStaffQuota(schoolId: string) {
  const headroom = await staffQuotaHeadroom(schoolId);
  if (!headroom || headroom.remaining > 0) return;
  throw Object.assign(
    new Error(`Staff seat limit reached (${headroom.limit}). Upgrade your plan or contact support.`),
    { status: 403, code: "QUOTA_EXCEEDED", quota: "maxStaff", limit: headroom.limit }
  );
}

export async function getSchoolCommercialContext(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { planCode: true, entitlementsOverride: true, quotaOverrides: true },
  });
  if (!school) return null;
  const { resolveEntitlements } = await import("../domain/platformPlans");
  return {
    entitlements: resolveEntitlements(school.planCode, school.entitlementsOverride),
    quotas: resolveQuotas(school.planCode, school.quotaOverrides),
  };
}
