import prisma from "../lib/prisma";
import { serializeGradebookConfig, parseGradebookConfig } from "../lib/gradebookConfig";
import {
  parsePayrollAttendanceRules,
  serializePayrollAttendanceRules,
} from "../lib/payrollAttendanceRules";
import {
  parseSecurityPolicy,
  serializeSecurityPolicy,
} from "../lib/securityPolicy";
import { parseAdmissionPolicy, mergeAdmissionPolicy } from "../lib/admissionPolicy";
import { createBackgroundUploadUrl } from "../lib/storage";
import {
  parseCertificateDefaults,
  serializeCertificateDefaults,
} from "../lib/certificateDefaults";
import {
  parseDocumentSignatories,
  serializeDocumentSignatories,
} from "../lib/documentSignatories";
import {
  mergeRoleReceiptTemplates,
  parseReceiptTemplatesByRole,
  receiptTemplateRoleKey,
  RECEIPT_TYPES_FOR_ROLE,
  serializeReceiptTemplatesByRole,
  type ReceiptTemplatesByType,
} from "../lib/receiptTemplates";
import { resolveReceiptTemplateId } from "../lib/receiptTemplateIds";
import { isSchoolLoginAllowed, isTrialExpired } from "../domain/schoolStatus";
import { resolveEntitlements, resolvePlan, resolveQuotas } from "../domain/platformPlans";

/**
 * Ported from src/server/services/schoolService.ts.
 * getSchoolStats dropped classroom/exam/application/attendance counts —
 * those models live in Classroom/Academic/Lifecycle now. Identity only
 * reports what it owns (User, SystemLog); other counts should be composed
 * client-side (or via a future stats-aggregation endpoint per service).
 */
export const schoolService = {
  async getBySlugPublic(slug: string) {
    const school = await prisma.school.findUnique({ where: { slug: slug.toLowerCase().trim() } });
    if (!school) return null;
    if (!isSchoolLoginAllowed(school.status, school.trialEndsAt)) return null;
    const policy = parseAdmissionPolicy(school.admissionPolicy);
    return {
      id: school.id,
      name: school.name,
      slug: school.slug,
      brandColor: school.brandColor,
      logoUrl: school.logoUrl,
      status: school.status,
      admissionPolicy: policy,
    };
  },

  async getAdmissionPolicy(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, status: true, admissionPolicy: true, slug: true, name: true },
    });
    if (!school) return null;
    return {
      schoolId: school.id,
      slug: school.slug,
      name: school.name,
      status: school.status,
      admissionPolicy: parseAdmissionPolicy(school.admissionPolicy),
    };
  },

  async getSchoolById(schoolId: string) {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return null;
    return {
      ...school,
      payrollAttendanceRules: parsePayrollAttendanceRules(school.payrollAttendanceRules),
      securityPolicy: parseSecurityPolicy(school.securityPolicy),
      admissionPolicy: parseAdmissionPolicy(school.admissionPolicy),
      certificateDefaults: parseCertificateDefaults(school.certificateDefaults),
      documentSignatories: parseDocumentSignatories(school.documentSignatories),
      holidayTypes: parseHolidayTypes(school.holidayTypes),
      receiptTemplatesByRole: parseReceiptTemplatesByRole(
        school.receiptTemplatesByRole,
        school.receiptTemplates,
        school.receiptTemplate
      ),
    };
  },

  async getSchoolEntitlements(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { planCode: true, entitlementsOverride: true },
    });
    if (!school) return null;
    return resolveEntitlements(school.planCode, school.entitlementsOverride);
  },

  async getSchoolCommercial(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { planCode: true, entitlementsOverride: true, quotaOverrides: true },
    });
    if (!school) return null;
    return {
      entitlements: resolveEntitlements(school.planCode, school.entitlementsOverride),
      quotas: resolveQuotas(school.planCode, school.quotaOverrides),
    };
  },

  /** Read-only SaaS plan + entitlements for school admins (assigned by Super Admin). */
  async getSchoolSubscription(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        planCode: true,
        billingStatus: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        entitlementsOverride: true,
        quotaOverrides: true,
      },
    });
    if (!school) return null;
    const plan = resolvePlan(school.planCode);
    const entitlements = resolveEntitlements(school.planCode, school.entitlementsOverride);
    const quotas = resolveQuotas(school.planCode, school.quotaOverrides);
    return {
      planCode: school.planCode || plan.code,
      plan: {
        code: plan.code,
        label: plan.label,
        description: plan.description,
        monthlyPriceUsd: plan.monthlyPriceUsd,
      },
      billingStatus: school.billingStatus || "TRIAL",
      trialEndsAt: school.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: school.currentPeriodEnd?.toISOString() ?? null,
      listPriceUsd: plan.monthlyPriceUsd,
      hasCustomEntitlements: Boolean(school.entitlementsOverride),
      hasCustomQuotas: Boolean(school.quotaOverrides),
      entitlements,
      quotas,
    };
  },

  async getSchoolStats(schoolId: string) {
    try {
      const [studentCount, teacherCount, recentLogs] = await Promise.all([
        prisma.user.count({ where: { schoolId, role: "STUDENT" } }),
        prisma.user.count({ where: { schoolId, role: "TEACHER" } }),
        prisma.systemLog.findMany({
          where: { schoolId },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true } } },
        }),
      ]);

      return {
        totalStudents: studentCount,
        totalTeachers: teacherCount,
        totalClassrooms: null,
        totalExams: null,
        totalApplications: null,
        pendingApplications: null,
        attendanceToday: null,
        recentLogs,
      };
    } catch (err) {
      console.warn(`Prisma error in getSchoolStats for ${schoolId}, returning empty counts:`, err);
      return {
        totalStudents: 0,
        totalTeachers: 0,
        totalClassrooms: null,
        totalExams: null,
        totalApplications: null,
        pendingApplications: null,
        attendanceToday: null,
        recentLogs: [],
      };
    }
  },

  async completeOnboarding(schoolId: string) {
    return prisma.school.update({
      where: { id: schoolId },
      data: { onboardingComplete: true },
    });
  },

  async setAdmissionPolicyReviewed(schoolId: string, reviewed: boolean) {
    return prisma.school.update({
      where: { id: schoolId },
      data: { admissionPolicyReviewed: reviewed },
    });
  },

  async updateReceiptTemplate(
    schoolId: string,
    actorRole: string,
    data: { receiptTemplate?: string; receiptTemplates?: Partial<ReceiptTemplatesByType> }
  ) {
    const roleKey = receiptTemplateRoleKey(actorRole);
    if (!roleKey) throw new Error("Role cannot configure receipt templates");

    const existing = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        receiptTemplate: true,
        receiptTemplates: true,
        receiptTemplatesByRole: true,
      },
    });
    if (!existing) throw new Error("School not found");

    let byRole = parseReceiptTemplatesByRole(
      existing.receiptTemplatesByRole,
      existing.receiptTemplates,
      existing.receiptTemplate
    );

    if (data.receiptTemplates && typeof data.receiptTemplates === "object") {
      byRole = mergeRoleReceiptTemplates(byRole, roleKey, data.receiptTemplates);
    } else if (data.receiptTemplate != null) {
      const single = resolveReceiptTemplateId(data.receiptTemplate);
      const patch: Partial<ReceiptTemplatesByType> = {};
      for (const typeKey of RECEIPT_TYPES_FOR_ROLE[roleKey]) {
        patch[typeKey] = single;
      }
      byRole = mergeRoleReceiptTemplates(byRole, roleKey, patch);
    }

    await prisma.school.update({
      where: { id: schoolId },
      data: {
        receiptTemplatesByRole: serializeReceiptTemplatesByRole(byRole),
      },
    });
    return this.getSchoolById(schoolId);
  },

  async updateSchool(schoolId: string, data: any) {
    const needsExisting = data.admissionPolicy !== undefined;

    const existing = needsExisting
      ? await prisma.school.findUnique({
          where: { id: schoolId },
          select: { admissionPolicy: true },
        })
      : null;

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: {
        name: data.name,
        logoUrl: data.logoUrl,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.region !== undefined ? { region: data.region || null } : {}),
        ...(data.city !== undefined ? { city: data.city || null } : {}),
        timezone: data.timezone,
        ...(data.defaultLocale !== undefined
          ? { defaultLocale: String(data.defaultLocale || "en") }
          : {}),
        ...(data.holidayEnabled !== undefined
          ? { holidayEnabled: Boolean(data.holidayEnabled) }
          : {}),
        ...(data.holidayTypes !== undefined
          ? { holidayTypes: serializeHolidayTypes(data.holidayTypes) }
          : {}),
        gradeSheetTemplate: data.gradeSheetTemplate,
        reportCardTemplate: data.reportCardTemplate,
        ...(data.certificateTemplate !== undefined
          ? { certificateTemplate: String(data.certificateTemplate || "CERT_CLASSIC_BROWN") }
          : {}),
        ...(data.certificateDefaults !== undefined
          ? {
              certificateDefaults: serializeCertificateDefaults(data.certificateDefaults),
            }
          : {}),
        ...(data.documentSignatories !== undefined
          ? {
              documentSignatories: serializeDocumentSignatories(data.documentSignatories),
            }
          : {}),
        brandColor: data.brandColor,
        gradebookConfig:
          data.gradebookConfig != null
            ? typeof data.gradebookConfig === "string"
              ? JSON.stringify(parseGradebookConfig(data.gradebookConfig).categories)
              : serializeGradebookConfig({
                  categories: Array.isArray(data.gradebookConfig)
                    ? data.gradebookConfig
                    : data.gradebookConfig.categories || [],
                })
            : data.gradebookConfig,
        ...(data.payrollAttendanceRules !== undefined
          ? {
              payrollAttendanceRules: serializePayrollAttendanceRules(
                typeof data.payrollAttendanceRules === "string"
                  ? parsePayrollAttendanceRules(data.payrollAttendanceRules)
                  : data.payrollAttendanceRules
              ),
            }
          : {}),
        ...(data.securityPolicy !== undefined
          ? {
              securityPolicy: serializeSecurityPolicy(
                typeof data.securityPolicy === "string"
                  ? parseSecurityPolicy(data.securityPolicy)
                  : data.securityPolicy
              ),
            }
          : {}),
        ...(data.examDeliveryDefault !== undefined
          ? {
              examDeliveryDefault: ["ONLINE", "OFFLINE", "HYBRID"].includes(
                String(data.examDeliveryDefault).toUpperCase()
              )
                ? String(data.examDeliveryDefault).toUpperCase()
                : "ONLINE",
            }
          : {}),
        ...(data.admissionPolicy !== undefined
          ? {
              admissionPolicy: mergeAdmissionPolicy(
                existing?.admissionPolicy,
                data.admissionPolicy
              ),
            }
          : {}),
        ...(data.guideRequired !== undefined
          ? { guideRequired: Boolean(data.guideRequired) }
          : {}),
      },
    });
    return {
      ...updated,
      payrollAttendanceRules: parsePayrollAttendanceRules(updated.payrollAttendanceRules),
      securityPolicy: parseSecurityPolicy(updated.securityPolicy),
      admissionPolicy: parseAdmissionPolicy(updated.admissionPolicy),
      certificateDefaults: parseCertificateDefaults(updated.certificateDefaults),
      documentSignatories: parseDocumentSignatories(updated.documentSignatories),
    };
  },

  async updateAdmissionPolicy(schoolId: string, patch: Record<string, unknown>) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { admissionPolicy: true, slug: true, name: true },
    });
    if (!school) {
      throw Object.assign(new Error("School not found"), { status: 404 });
    }
    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: {
        admissionPolicy: mergeAdmissionPolicy(school.admissionPolicy, patch as any),
      },
    });
    return {
      schoolId: updated.id,
      slug: updated.slug,
      name: updated.name,
      admissionPolicy: parseAdmissionPolicy(updated.admissionPolicy),
    };
  },

  async presignBackgroundUpload(schoolId: string, data: { fileName: string; mimeType: string }) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true },
    });
    if (!school) {
      throw Object.assign(new Error("School not found"), { status: 404 });
    }
    const fileName = String(data?.fileName || "background.jpg");
    const mimeType = String(data?.mimeType || "image/jpeg");
    return createBackgroundUploadUrl({ schoolId, fileName, mimeType });
  },
};

// Canonical holiday locality keys. "national" is the primary value used by the
// academic service + frontend; "public" is accepted as a legacy alias and
// normalized to "national".
const HOLIDAY_TYPES = ["national", "regional", "international"] as const;

function normalizeHolidayType(value: string): (typeof HOLIDAY_TYPES)[number] | null {
  if (value === "public") return "national";
  return HOLIDAY_TYPES.includes(value as (typeof HOLIDAY_TYPES)[number]) ? (value as (typeof HOLIDAY_TYPES)[number]) : null;
}

function parseHolidayTypes(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const valid = parsed.map((v) => normalizeHolidayType(String(v)));
    const filtered = valid.filter((v): v is (typeof HOLIDAY_TYPES)[number] => v !== null);
    return filtered.length ? filtered : null;
  } catch {
    return null;
  }
}

function serializeHolidayTypes(value: unknown): string | null {
  if (value == null) return null;
  const arr = Array.isArray(value)
    ? value.map((v) => normalizeHolidayType(String(v))).filter((v): v is (typeof HOLIDAY_TYPES)[number] => v !== null)
    : null;
  return arr && arr.length ? JSON.stringify(arr) : null;
}
