/**
 * Enforce SaaS seat quotas when creating students or staff.
 */
import prisma from "./prisma";
import { resolveQuotas } from "../domain/platformPlans";
import { headcountsFromRoleGroups, isStaffDirectoryRole } from "../domain/superAdminDirectory";

export async function assertStudentQuota(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { planCode: true, quotaOverrides: true },
  });
  if (!school) {
    throw Object.assign(new Error("School not found"), { status: 404 });
  }
  const quotas = resolveQuotas(school.planCode, school.quotaOverrides);
  if (quotas.maxStudents == null) return;

  const rows = await prisma.user.groupBy({
    by: ["schoolId", "role"],
    where: { schoolId, role: "STUDENT", isActive: true },
    _count: { _all: true },
  });
  const counts = headcountsFromRoleGroups(rows as any).get(schoolId);
  const current = counts?.studentCount ?? 0;
  if (current >= quotas.maxStudents) {
    throw Object.assign(
      new Error(
        `Student seat limit reached (${quotas.maxStudents}). Upgrade your plan or contact support.`
      ),
      { status: 403, code: "QUOTA_EXCEEDED", quota: "maxStudents", limit: quotas.maxStudents }
    );
  }
}

export async function assertStaffQuota(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { planCode: true, quotaOverrides: true },
  });
  if (!school) {
    throw Object.assign(new Error("School not found"), { status: 404 });
  }
  const quotas = resolveQuotas(school.planCode, school.quotaOverrides);
  if (quotas.maxStaff == null) return;

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
  if (staffCount >= quotas.maxStaff) {
    throw Object.assign(
      new Error(`Staff seat limit reached (${quotas.maxStaff}). Upgrade your plan or contact support.`),
      { status: 403, code: "QUOTA_EXCEEDED", quota: "maxStaff", limit: quotas.maxStaff }
    );
  }
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
