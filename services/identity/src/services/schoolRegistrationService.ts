import prisma from "../lib/prisma";
import {
  appBaseUrl,
  generateRawToken,
  hashIp,
  hashToken,
  sendMail,
} from "../lib/mailer";
import { resolveEmailLocale, tEmail, type AppLocale } from "../i18n/emailCatalogs";
import { provisionSchool } from "./schoolProvisioning";
import { platformOpsService } from "./platformOpsService";
import { logSystemEvent } from "../utils/logger";

const DEFAULT_NEEDS_INFO: Record<AppLocale, string> = {
  en: "Please reply with more details.",
  fr: "Veuillez répondre avec plus de détails.",
  ar: "يرجى الرد بمزيد من التفاصيل.",
  es: "Responda con más detalles.",
  de: "Bitte antworten Sie mit weiteren Details.",
  "zh-Hans": "请回复更多详细信息。",
  hi: "कृपया अधिक विवरण के साथ उत्तर दें।",
};

async function registrationEmailLocale(schoolId?: string | null): Promise<AppLocale> {
  if (!schoolId) return "en";
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { defaultLocale: true },
  });
  return resolveEmailLocale(null, school?.defaultLocale);
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const schoolRegistrationService = {
  async isSlugAvailable(slug: string) {
    const normalized = String(slug || "").toLowerCase().trim();
    if (!SLUG_RE.test(normalized) || normalized.length < 2) {
      return { available: false, reason: "invalid_format" };
    }
    const taken =
      (await prisma.school.findUnique({ where: { slug: normalized } })) ||
      (await prisma.schoolRegistration.findFirst({
        where: {
          requestedSlug: normalized,
          status: { in: ["SUBMITTED", "NEEDS_INFO", "APPROVED"] },
        },
      }));
    return { available: !taken, slug: normalized };
  },

  async submit(data: any, meta: { ip?: string; userAgent?: string }) {
    const organizationName = String(data.organizationName || "").trim();
    const requestedSlug = String(data.requestedSlug || "").toLowerCase().trim();
    const country = String(data.country || "").trim();
    const timezone = String(data.timezone || "UTC").trim();
    const applicantName = String(data.applicantName || "").trim();
    const applicantEmail = String(data.applicantEmail || "").toLowerCase().trim();
    const applicantPhone = data.applicantPhone ? String(data.applicantPhone).trim() : null;
    const locale = resolveEmailLocale(data.locale || null, null);
    const address = data.address ? String(data.address).trim() : null;
    const message = data.message ? String(data.message).trim() : null;
    const estimatedStudents = data.estimatedStudents != null ? Number(data.estimatedStudents) : null;

    if (!organizationName || !requestedSlug || !country || !applicantName || !applicantEmail) {
      throw Object.assign(new Error("Missing required fields"), { status: 400 });
    }

    const slugCheck = await this.isSlugAvailable(requestedSlug);
    if (!slugCheck.available) {
      throw Object.assign(new Error("Slug is not available"), { status: 409 });
    }

    const confirmationToken = generateRawToken(24);
    const row = await prisma.schoolRegistration.create({
      data: {
        organizationName,
        requestedSlug,
        country,
        timezone,
        address,
        estimatedStudents: Number.isFinite(estimatedStudents as number) ? estimatedStudents : null,
        message,
        applicantName,
        applicantEmail,
        applicantPhone,
        status: "SUBMITTED",
        confirmationToken: hashToken(confirmationToken),
        locale,
        ipHash: hashIp(meta.ip),
        userAgent: meta.userAgent?.slice(0, 500) || null,
      },
    });

    const confirmUrl = `${appBaseUrl()}/register-school/confirm?token=${confirmationToken}&id=${row.id}`;
    const confirmMail = tEmail(locale, "registrationConfirm", {
      confirmUrl,
      organizationName: row.organizationName,
    });
    await sendMail({
      to: applicantEmail,
      subject: confirmMail.subject,
      text: confirmMail.text,
    });

    return {
      id: row.id,
      status: row.status,
      organizationName: row.organizationName,
      applicantEmail: row.applicantEmail,
      locale,
      message: "Registration submitted. Check your email to confirm your application before review.",
    };
  },

  async resendConfirmation(id: string) {
    const row = await prisma.schoolRegistration.findUnique({ where: { id } });
    if (!row) throw Object.assign(new Error("Registration not found"), { status: 404 });
    if (row.emailConfirmedAt) {
      return { id: row.id, status: row.status, email: row.applicantEmail, alreadyConfirmed: true };
    }
    const confirmationToken = generateRawToken(24);
    const updated = await prisma.schoolRegistration.update({
      where: { id },
      data: { confirmationToken: hashToken(confirmationToken) },
    });
    const locale = resolveEmailLocale(updated.locale, null);
    const confirmUrl = `${appBaseUrl()}/register-school/confirm?token=${confirmationToken}&id=${updated.id}`;
    const confirmMail = tEmail(locale, "registrationConfirm", {
      confirmUrl,
      organizationName: updated.organizationName,
    });
    await sendMail({
      to: updated.applicantEmail,
      subject: confirmMail.subject,
      text: confirmMail.text,
    });
    return { id: updated.id, status: updated.status, email: updated.applicantEmail, resent: true };
  },

  async confirmEmail(id: string, rawToken: string) {
    const row = await prisma.schoolRegistration.findUnique({ where: { id } });
    if (!row) throw Object.assign(new Error("Registration not found"), { status: 404 });
    if (!row.confirmationToken || row.confirmationToken !== hashToken(rawToken)) {
      throw Object.assign(new Error("Invalid confirmation token"), { status: 400 });
    }
    if (row.emailConfirmedAt) {
      return { id: row.id, status: row.status, emailConfirmed: true };
    }
    const updated = await prisma.schoolRegistration.update({
      where: { id },
      data: { emailConfirmedAt: new Date() },
    });
    return { id: updated.id, status: updated.status, emailConfirmed: true };
  },

  async list(
    status?: string,
    query: { q?: string; page?: number | string; pageSize?: number | string } = {}
  ) {
    const where: any = status ? { status } : {};
    const q = (query.q || "").trim();
    if (q) {
      where.OR = [
        { organizationName: { contains: q, mode: "insensitive" } },
        { requestedSlug: { contains: q, mode: "insensitive" } },
        { applicantName: { contains: q, mode: "insensitive" } },
        { applicantEmail: { contains: q, mode: "insensitive" } },
      ];
    }
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50));
    const [total, items] = await Promise.all([
      prisma.schoolRegistration.count({ where }),
      prisma.schoolRegistration.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, total, page, pageSize };
  },

  async getById(id: string) {
    const row = await prisma.schoolRegistration.findUnique({ where: { id } });
    if (!row) throw Object.assign(new Error("Registration not found"), { status: 404 });
    return row;
  },

  async requestInfo(id: string, notes: string, reviewerId?: string) {
    const row = await this.getById(id);
    if (!["SUBMITTED", "NEEDS_INFO"].includes(row.status)) {
      throw Object.assign(new Error("Invalid status for request-info"), { status: 400 });
    }
    const updated = await prisma.schoolRegistration.update({
      where: { id },
      data: {
        status: "NEEDS_INFO",
        reviewNotes: notes || row.reviewNotes,
        reviewedBy: reviewerId || null,
        reviewedAt: new Date(),
      },
    });
    const locale = await registrationEmailLocale(updated.schoolId);
    const needsInfoMail = tEmail(locale, "registrationNeedsInfo", {
      organizationName: updated.organizationName,
      notes: notes || updated.reviewNotes || DEFAULT_NEEDS_INFO[locale],
    });
    await sendMail({
      to: updated.applicantEmail,
      subject: needsInfoMail.subject,
      text: needsInfoMail.text,
    });
    return updated;
  },

  async reject(id: string, notes: string, reviewerId?: string) {
    const row = await this.getById(id);
    if (["APPROVED", "REJECTED", "WITHDRAWN"].includes(row.status)) {
      throw Object.assign(new Error("Registration already closed"), { status: 409 });
    }
    const updated = await prisma.schoolRegistration.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewNotes: notes || row.reviewNotes,
        reviewedBy: reviewerId || null,
        reviewedAt: new Date(),
      },
    });
    const locale = await registrationEmailLocale(updated.schoolId);
    const rejectMail = tEmail(locale, "registrationRejected", {
      organizationName: updated.organizationName,
      notes: notes || updated.reviewNotes || "",
    });
    await sendMail({
      to: updated.applicantEmail,
      subject: rejectMail.subject,
      text: rejectMail.text,
    });
    return updated;
  },

  async approve(id: string, reviewerId: string | undefined, req?: any) {
    const row = await this.getById(id);
    if (row.status === "APPROVED" && row.schoolId) {
      throw Object.assign(new Error("Registration already approved"), { status: 409 });
    }
    if (!["SUBMITTED", "NEEDS_INFO"].includes(row.status)) {
      throw Object.assign(new Error("Registration cannot be approved in current status"), { status: 400 });
    }
    const settings = await platformOpsService.ensurePlatformSettings();
    const requireConfirm =
      settings.requireRegistrationEmailConfirm !== false &&
      process.env.REQUIRE_REGISTRATION_EMAIL_CONFIRM !== "false";
    if (!row.emailConfirmedAt && requireConfirm) {
      // Soft: allow approve but warn via notes; still require confirm in production default
      if (process.env.NODE_ENV === "production") {
        throw Object.assign(new Error("Applicant email not confirmed"), { status: 400 });
      }
    }

    const provisioned = await provisionSchool(
      {
        name: row.organizationName,
        slug: row.requestedSlug,
        country: row.country,
        timezone: row.timezone,
        contactEmail: row.applicantEmail,
        contactPhone: row.applicantPhone || undefined,
        address: row.address || undefined,
        status: "ACTIVE",
        onboardingSource: "PUBLIC_FORM",
        approvedBy: reviewerId,
      },
      req
    );

    const updated = await prisma.schoolRegistration.update({
      where: { id },
      data: {
        status: "APPROVED",
        schoolId: provisioned.school.id,
        reviewedBy: reviewerId || null,
        reviewedAt: new Date(),
      },
    });

    if (req) {
      await logSystemEvent(
        "SCHOOL_REGISTRATION_APPROVED",
        "SCHOOLS",
        `Approved registration ${id} → school ${provisioned.school.slug}`,
        "INFO",
        req
      );
    }

    return { registration: updated, ...provisioned };
  },
};
