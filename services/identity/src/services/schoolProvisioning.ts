import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";
import {
  appBaseUrl,
  generateRawToken,
  generateTempPassword,
  hashToken,
  sendMail,
} from "../lib/mailer";
import { resolveEmailLocale, tEmail } from "../i18n/emailCatalogs";
import { logSystemEvent } from "../utils/logger";
import { ALLOWED_SCHOOL_STATUSES } from "../domain/schoolStatus";

export { isSchoolLoginAllowed, ALLOWED_SCHOOL_STATUSES } from "../domain/schoolStatus";

export type ProvisionSchoolInput = {
  name: string;
  slug: string;
  country: string;
  timezone: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  planCode?: string;
  status?: string;
  onboardingSource?: string;
  approvedBy?: string;
};

/**
 * Shared provision path for Super Admin register and public-form approve.
 */
export async function provisionSchool(data: ProvisionSchoolInput, req?: any) {
  const {
    name,
    slug,
    country,
    timezone,
    contactEmail,
    contactPhone,
    address,
    planCode,
    status = "ACTIVE",
    onboardingSource = "SUPER_ADMIN",
    approvedBy,
  } = data;

  const existingSchool = await prisma.school.findFirst({
    where: { OR: [{ slug }, { contactEmail }] },
  });
  if (existingSchool) {
    throw Object.assign(new Error("A school with this slug or contact email already exists"), { status: 409 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: contactEmail } });
  if (existingUser) {
    throw Object.assign(new Error("A user with this contact email already exists"), { status: 409 });
  }

  const school = await prisma.school.create({
    data: {
      name,
      slug: slug.toLowerCase().trim(),
      schoolCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
      country,
      timezone,
      contactEmail: contactEmail.toLowerCase().trim(),
      contactPhone: contactPhone || null,
      address: address || null,
      planCode: planCode || null,
      status,
      onboardingSource,
      approvedAt: status === "ACTIVE" || status === "TRIAL" ? new Date() : null,
      approvedBy: approvedBy || null,
      admissionPolicy: JSON.stringify({
        publicApplyEnabled: true,
        returningApplyEnabled: true,
        requireEntranceFee: false,
        requiredDocTypes: [],
        requireClassroomOnEnroll: false,
      }),
    },
  });

  const tempPassword = generateTempPassword();
  const passwordHash = bcrypt.hashSync(tempPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email: contactEmail.toLowerCase().trim(),
      name: `${name} Admin`,
      passwordHash,
      role: "SCHOOL_ADMIN",
      schoolId: school.id,
      mustChangePassword: true,
    },
  });

  const rawInvite = generateRawToken();
  const invite = await prisma.inviteToken.create({
    data: {
      schoolId: school.id,
      userId: admin.id,
      tokenHash: hashToken(rawInvite),
      purpose: "SCHOOL_ADMIN_ONBOARD",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const inviteUrl = `${appBaseUrl()}/invite/${rawInvite}`;
  const welcomeLocale = resolveEmailLocale(null, school.defaultLocale);
  const welcomeMail = tEmail(welcomeLocale, "welcomeSchool", {
    schoolName: school.name,
    email: admin.email,
    tempPassword,
    inviteUrl,
    slug: school.slug,
  });
  await sendMail({
    to: admin.email,
    subject: welcomeMail.subject,
    text: welcomeMail.text,
  });

  if (req) {
    await logSystemEvent(
      "SCHOOL_PROVISIONED",
      "SCHOOLS",
      `School ${name} provisioned (${onboardingSource})`,
      "INFO",
      req
    );
  }

  try {
    const { seedStarterPack } = await import("../lib/starterPack");
    await seedStarterPack(school.id);
  } catch (err: any) {
    console.warn("[provision] starter pack skipped:", err.message);
  }

  return {
    school,
    admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    tempPassword,
    inviteToken: rawInvite,
    inviteUrl,
    inviteExpiresAt: invite.expiresAt,
  };
}

export async function acceptInvite(rawToken: string, newPassword: string) {
  if (!newPassword || newPassword.length < 8) {
    throw Object.assign(new Error("Password must be at least 8 characters"), { status: 400 });
  }

  const tokenHash = hashToken(rawToken);
  const invite = await prisma.inviteToken.findUnique({ where: { tokenHash } });
  if (!invite) {
    throw Object.assign(new Error("Invalid invite token"), { status: 404 });
  }
  if (invite.usedAt) {
    throw Object.assign(new Error("Invite already used"), { status: 409 });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    throw Object.assign(new Error("Invite expired"), { status: 410 });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  const user = await prisma.user.update({
    where: { id: invite.userId },
    data: { passwordHash, mustChangePassword: false, isActive: true },
    include: { school: true },
  });

  await prisma.inviteToken.update({
    where: { id: invite.id },
    data: { usedAt: new Date() },
  });

  const { emailAuthService } = await import("./emailAuthService");
  await emailAuthService.markVerifiedOnInviteAccept(user.id);

  return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, school: user.school };
}

export async function resendInvite(schoolId: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw Object.assign(new Error("School not found"), { status: 404 });

  const admin = await prisma.user.findFirst({
    where: { schoolId, role: "SCHOOL_ADMIN" },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) throw Object.assign(new Error("No school admin found"), { status: 404 });

  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: bcrypt.hashSync(tempPassword, 10), mustChangePassword: true },
  });

  const rawInvite = generateRawToken();
  await prisma.inviteToken.create({
    data: {
      schoolId,
      userId: admin.id,
      tokenHash: hashToken(rawInvite),
      purpose: "SCHOOL_ADMIN_ONBOARD",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const inviteUrl = `${appBaseUrl()}/invite/${rawInvite}`;
  const inviteLocale = resolveEmailLocale(null, school.defaultLocale);
  const inviteMail = tEmail(inviteLocale, "inviteResent", {
    schoolName: school.name,
    email: admin.email,
    tempPassword,
    inviteUrl,
  });
  await sendMail({
    to: admin.email,
    subject: inviteMail.subject,
    text: inviteMail.text,
  });

  return { email: admin.email, tempPassword, inviteToken: rawInvite, inviteUrl };
}
