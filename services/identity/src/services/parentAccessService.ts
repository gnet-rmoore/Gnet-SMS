import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";
import {
  generateParentAccessCode,
  getParentPacSecretVersion,
  hashParentAccessCode,
  isParentLocked,
  makeParentAccessGlobalLookupHash,
  makeParentAccessLookupHash,
  maskParentAccessCode,
  maskPhone,
  normalizePhone,
  parentAccessAttemptLimit,
  parentLockUntil,
  parentPhoneMaxSends,
  parentPhoneResendSeconds,
  PARENT_SMS_PURPOSES,
  verifyParentAccessCode,
} from "../domain/parentAccess";
import {
  createScopedSmsChallenge,
  deleteScopedSmsChallenges,
  verifyScopedSmsChallenge,
  verifyScopedSmsChallengeById,
} from "./mfaService";
import { sendSmsOtpViaComms } from "../lib/smsOtpClient";
import { appBaseUrl, generateTempPassword, sendMail } from "../lib/mailer";
import { decryptCredentialSecret, encryptCredentialSecret } from "../lib/credentialCrypto";
import { resolveEmailLocale, tEmail } from "../i18n/emailCatalogs";
import {
  DEFAULT_SECURITY_POLICY,
  parseSecurityPolicy,
  validatePasswordAgainstPolicy,
} from "../lib/securityPolicy";

function badRequest(message: string, code = "BAD_REQUEST", status = 400) {
  return Object.assign(new Error(message), { code, status });
}

function forbidden(message: string, code = "FORBIDDEN", status = 403) {
  return Object.assign(new Error(message), { code, status });
}

function invalidCredentials() {
  return Object.assign(new Error("Invalid credentials"), {
    code: "INVALID_CREDENTIALS",
    status: 401,
  });
}

type ParentCodeEmailRecipient = {
  email: string;
  name: string;
  preferredLocale?: string | null;
};

async function sendParentAccessCodeEmail(
  recipient: ParentCodeEmailRecipient,
  code: string,
  schoolId: string
) {
  if (!recipient.email) return false;
  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, defaultLocale: true },
    });
    const locale = resolveEmailLocale(recipient.preferredLocale, school?.defaultLocale);
    const mail = tEmail(locale, "parentAccessCode", {
      schoolName: school?.name || "",
      name: recipient.name,
      code,
      loginUrl: `${appBaseUrl()}/login`,
    });
    const result = await sendMail({
      to: recipient.email,
      subject: mail.subject,
      text: mail.text,
      sensitive: true,
    });
    return result.ok;
  } catch (err: any) {
    console.warn("[parent-access] failed to email access code", err?.message || err);
    return false;
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
  const error = validatePasswordAgainstPolicy(password, policy);
  if (error) throw badRequest(error, "PASSWORD_POLICY");
}

type ParentAccessLookupContext = {
  schoolId: string;
  secretVersion: number;
};

async function parentAccessLookupContexts(): Promise<ParentAccessLookupContext[]> {
  return prisma.parentAccessCode.findMany({
    select: { schoolId: true, secretVersion: true },
    distinct: ["schoolId", "secretVersion"],
  });
}

function uniqueSecretVersions(contexts: ParentAccessLookupContext[]): number[] {
  return [...new Set(contexts.map((context) => context.secretVersion))];
}

async function isParentAccessCodeAvailable(code: string): Promise<boolean> {
  const contexts = await parentAccessLookupContexts();
  if (!contexts.length) return true;
  const existing = await prisma.parentAccessCode.findFirst({
    where: {
      OR: [
        {
          globalLookupHash: {
            in: uniqueSecretVersions(contexts).map((version) =>
              makeParentAccessGlobalLookupHash(code, version)
            ),
          },
        },
        {
          codeLookupHash: {
            in: contexts.map((context) =>
              makeParentAccessLookupHash(context.schoolId, code, context.secretVersion)
            ),
          },
        },
      ],
    },
    select: { id: true },
  });
  return !existing;
}

async function parentSchoolIds(parentId: string): Promise<string[]> {
  const [parent, links] = await Promise.all([
    prisma.user.findUnique({ where: { id: parentId }, select: { schoolId: true, role: true } }),
    prisma.parentStudent.findMany({
      where: { parentId },
      select: { student: { select: { schoolId: true } } },
    }),
  ]);
  if (!parent || parent.role !== "PARENT") return [];
  const ids = new Set<string>();
  if (parent.schoolId) ids.add(parent.schoolId);
  for (const link of links) {
    if (link.student.schoolId) ids.add(link.student.schoolId);
  }
  return [...ids];
}

function parentAccessMetadata(row: {
  codeHint: string;
  issuedAt: Date;
  deliveredAt: Date | null;
  lockedUntil: Date | null;
  revokedAt: Date | null;
}) {
  return {
    codeHint: row.codeHint,
    issuedAt: row.issuedAt,
    deliveredAt: row.deliveredAt,
    lockedUntil: row.lockedUntil,
    revokedAt: row.revokedAt,
  };
}

function phoneLoginMetadata(row: {
  phoneE164: string;
  verifiedAt: Date | null;
  enabled: boolean;
  lockedUntil: Date | null;
  lastCodeSentAt: Date | null;
}) {
  return {
    phoneE164: row.phoneE164,
    phoneHint: maskPhone(row.phoneE164),
    verifiedAt: row.verifiedAt,
    enabled: row.enabled,
    lockedUntil: row.lockedUntil,
    lastCodeSentAt: row.lastCodeSentAt,
  };
}

function requestMetadata(row: {
  id: string;
  schoolId: string;
  parentId: string;
  phoneE164: string;
  status: string;
  requestedAt: Date;
  verifiedAt: Date | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
}) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    parentId: row.parentId,
    phoneE164: row.phoneE164,
    phoneHint: maskPhone(row.phoneE164),
    status: row.status,
    requestedAt: row.requestedAt,
    verifiedAt: row.verifiedAt,
    reviewedAt: row.reviewedAt,
    reviewNote: row.reviewNote,
  };
}

export const parentAccessService = {
  async resolveSchoolBySlug(schoolSlug: string) {
    const slug = String(schoolSlug || "").trim().toLowerCase();
    if (!slug) return null;
    return prisma.school.findUnique({ where: { slug } });
  },

  async findByAccessCode(code: string) {
    const contexts = await parentAccessLookupContexts();
    if (!contexts.length) return [];
    return prisma.parentAccessCode.findMany({
      where: {
        OR: [
          {
            globalLookupHash: {
              in: uniqueSecretVersions(contexts).map((version) =>
                makeParentAccessGlobalLookupHash(code, version)
              ),
            },
          },
          {
            codeLookupHash: {
              in: contexts.map((context) =>
                makeParentAccessLookupHash(context.schoolId, code, context.secretVersion)
              ),
            },
          },
        ],
        revokedAt: null,
      },
      include: { user: true, school: true },
    });
  },

  async assertParentInSchool(parentId: string, schoolId: string) {
    const ids = await parentSchoolIds(parentId);
    if (!ids.includes(schoolId)) throw invalidCredentials();
  },

  async ensureParentAccessCode(userId: string, schoolId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || user.role !== "PARENT") return null;
    const existing = await prisma.parentAccessCode.findUnique({
      where: { userId_schoolId: { userId, schoolId } },
    });
    if (existing && !existing.revokedAt) return null;

    const secretVersion = getParentPacSecretVersion();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateParentAccessCode();
      if (!(await isParentAccessCodeAvailable(code))) continue;
      const codeLookupHash = makeParentAccessLookupHash(schoolId, code, secretVersion);
      const globalLookupHash = makeParentAccessGlobalLookupHash(code, secretVersion);
      try {
        await prisma.parentAccessCode.upsert({
          where: { userId_schoolId: { userId, schoolId } },
          create: {
            userId,
            schoolId,
            codeHash: hashParentAccessCode(code),
            codeLookupHash,
            globalLookupHash,
            codeEncrypted: encryptCredentialSecret(code),
            codeHint: maskParentAccessCode(code),
            secretVersion,
            failedCount: 0,
            lockedUntil: null,
            deliveredAt: null,
            revokedAt: null,
          },
          update: {
            codeHash: hashParentAccessCode(code),
            codeLookupHash,
            globalLookupHash,
            codeEncrypted: encryptCredentialSecret(code),
            codeHint: maskParentAccessCode(code),
            secretVersion,
            issuedAt: new Date(),
            deliveredAt: null,
            failedCount: 0,
            lockedUntil: null,
            revokedAt: null,
          },
        });
        return { code, schoolId, userId };
      } catch (err: any) {
        if (err?.code !== "P2002") throw err;
      }
    }
    throw new Error("Unable to generate a unique parent access code");
  },

  async regenerateParentAccessCode(userId: string, schoolId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        email: true,
        name: true,
        preferredLocale: true,
      },
    });
    if (!user || user.role !== "PARENT") throw badRequest("User is not a parent");
    if (!(await parentSchoolIds(userId)).includes(schoolId)) {
      throw badRequest("Parent is not linked to this school");
    }
    const secretVersion = getParentPacSecretVersion();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateParentAccessCode();
      if (!(await isParentAccessCodeAvailable(code))) continue;
      const codeLookupHash = makeParentAccessLookupHash(schoolId, code, secretVersion);
      const globalLookupHash = makeParentAccessGlobalLookupHash(code, secretVersion);
      try {
        await prisma.parentAccessCode.upsert({
          where: { userId_schoolId: { userId, schoolId } },
          create: {
            userId,
            schoolId,
            codeHash: hashParentAccessCode(code),
            codeLookupHash,
            globalLookupHash,
            codeEncrypted: encryptCredentialSecret(code),
            codeHint: maskParentAccessCode(code),
            secretVersion,
          },
          update: {
            codeHash: hashParentAccessCode(code),
            codeLookupHash,
            globalLookupHash,
            codeEncrypted: encryptCredentialSecret(code),
            codeHint: maskParentAccessCode(code),
            secretVersion,
            issuedAt: new Date(),
            deliveredAt: null,
            failedCount: 0,
            lockedUntil: null,
            revokedAt: null,
          },
        });
        const emailSent = await sendParentAccessCodeEmail(user, code, schoolId);
        if (emailSent) {
          await prisma.parentAccessCode.update({
            where: { userId_schoolId: { userId, schoolId } },
            data: { deliveredAt: new Date() },
          });
        }
        return {
          accessCode: code,
          emailSent,
          schoolId,
          userId,
          metadata: parentAccessMetadata(
            (await prisma.parentAccessCode.findUnique({
              where: { userId_schoolId: { userId, schoolId } },
            }))!
          ),
        };
      } catch (err: any) {
        if (err?.code !== "P2002") throw err;
      }
    }
    throw new Error("Unable to regenerate a unique parent access code");
  },

  async revealParentAccessCode(userId: string, schoolId: string) {
    await parentAccessService.assertParentInSchool(userId, schoolId);
    const row = await prisma.parentAccessCode.findUnique({
      where: { userId_schoolId: { userId, schoolId } },
    });
    if (!row || row.revokedAt) return null;
    let accessCode: string | null = null;
    try {
      accessCode = decryptCredentialSecret(row.codeEncrypted);
    } catch {
      accessCode = null;
    }
    if (!accessCode) return null;
    return {
      accessCode,
      schoolId,
      userId,
      metadata: parentAccessMetadata(row),
    };
  },

  async ensureForStudent(studentId: string) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { schoolId: true },
    });
    if (!student?.schoolId) return;
    const parents = await prisma.parentStudent.findMany({
      where: { studentId },
      select: { parentId: true },
    });
    for (const parent of parents) {
      await this.ensureParentAccessCode(parent.parentId, student.schoolId);
    }
  },

  async backfill(regenerateAll = false) {
    const parents = await prisma.user.findMany({
      where: { role: "PARENT" },
      select: { id: true },
    });
    let created = 0;
    const distribution: Array<{
      userId: string;
      schoolSlug: string;
      accessCode: string;
    }> = [];
    for (const parent of parents) {
      const ids = await parentSchoolIds(parent.id);
      for (const schoolId of ids) {
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { slug: true },
        });
        if (!school) continue;
        const result = regenerateAll
          ? await this.regenerateParentAccessCode(parent.id, schoolId)
          : await this.ensureParentAccessCode(parent.id, schoolId);
        if (!result) continue;
        created += 1;
        distribution.push({
          userId: parent.id,
          schoolSlug: school.slug,
          accessCode: result.code ?? (result as { accessCode?: string }).accessCode ?? "",
        });
      }
    }
    return { created, distribution: distribution.filter((row) => row.accessCode) };
  },

  async verifyAccessCode(userId: string, schoolId: string, code: string) {
    const row = await prisma.parentAccessCode.findUnique({
      where: { userId_schoolId: { userId, schoolId } },
    });
    if (!row || row.revokedAt) throw invalidCredentials();
    if (isParentLocked(row.lockedUntil)) {
      throw Object.assign(new Error("Too many attempts. Try again later."), {
        code: "TOO_MANY_ATTEMPTS",
        status: 429,
      });
    }
    if (!verifyParentAccessCode(code, row.codeHash)) {
      const failedCount = row.failedCount + 1;
      await prisma.parentAccessCode.update({
        where: { id: row.id },
        data: { failedCount, lockedUntil: parentLockUntil(failedCount) },
      });
      throw invalidCredentials();
    }
    await prisma.parentAccessCode.update({
      where: { id: row.id },
      data: { failedCount: 0, lockedUntil: null },
    });
    return row;
  },

  async resetLockouts(userId: string, schoolId: string) {
    await prisma.parentAccessCode.updateMany({
      where: { userId, schoolId },
      data: { failedCount: 0, lockedUntil: null },
    });
    await prisma.parentPhoneLogin.updateMany({
      where: { userId, schoolId },
      data: { failedCount: 0, lockedUntil: null },
    });
  },

  async submitPhoneLoginRequest(parentId: string, schoolSlug: string, phone: string) {
    const school = await this.resolveSchoolBySlug(schoolSlug);
    if (!school) throw badRequest("School not found", "SCHOOL_NOT_FOUND", 404);
    await this.assertParentInSchool(parentId, school.id);
    const phoneE164 = normalizePhone(phone);
    if (!phoneE164) throw badRequest("Phone must be a valid international number", "VALIDATION");
    const conflict = await prisma.parentPhoneLogin.findUnique({
      where: { schoolId_phoneE164: { schoolId: school.id, phoneE164 } },
    });
    if (conflict && conflict.userId !== parentId) {
      throw Object.assign(new Error("Phone number is already registered for this school"), {
        code: "PHONE_IN_USE",
        status: 409,
      });
    }
    const pending = await prisma.parentPhoneLoginRequest.findFirst({
      where: { parentId, schoolId: school.id, status: "PENDING" },
    });
    if (pending) return requestMetadata(pending);
    try {
      const row = await prisma.parentPhoneLoginRequest.create({
        data: { schoolId: school.id, parentId, phoneE164 },
      });
      return requestMetadata(row);
    } catch (err: any) {
      if (err?.code === "P2002") {
        const existing = await prisma.parentPhoneLoginRequest.findFirst({
          where: { parentId, schoolId: school.id, status: "PENDING" },
        });
        if (existing) return requestMetadata(existing);
      }
      throw err;
    }
  },

  async sendPhoneVerificationCode(parentId: string, requestId: string) {
    const request = await prisma.parentPhoneLoginRequest.findFirst({
      where: { id: requestId, parentId },
      include: { parent: { select: { email: true } }, school: { select: { name: true } } },
    });
    if (!request) throw badRequest("Request not found", "NOT_FOUND", 404);
    if (!["PENDING", "VERIFIED"].includes(request.status)) {
      throw badRequest("Request is no longer pending", "INVALID_STATUS");
    }
    const challenge = await createScopedSmsChallenge(
      parentId,
      request.phoneE164,
      PARENT_SMS_PURPOSES.PARENT_PHONE_VERIFY,
      request.schoolId
    );
    await prisma.parentPhoneLoginRequest.update({
      where: { id: request.id },
      data: { verificationChallenge: challenge.id },
    });
    await sendSmsOtpViaComms({
      phoneE164: request.phoneE164,
      code: challenge.code,
      purpose: "parent_phone_verify",
      emailFallback: request.parent.email,
    });
    return { ok: true, phoneHint: maskPhone(request.phoneE164), schoolName: request.school.name };
  },

  async verifyPhoneRequest(parentId: string, requestId: string, code: string) {
    const request = await prisma.parentPhoneLoginRequest.findFirst({
      where: { id: requestId, parentId },
    });
    if (!request) throw badRequest("Request not found", "NOT_FOUND", 404);
    if (request.status !== "PENDING") throw badRequest("Request is no longer pending", "INVALID_STATUS");
    if (!request.verificationChallenge) {
      throw badRequest("Verification code has not been sent", "CODE_NOT_SENT");
    }
    const ok = await verifyScopedSmsChallengeById(
      request.verificationChallenge,
      parentId,
      request.phoneE164,
      PARENT_SMS_PURPOSES.PARENT_PHONE_VERIFY,
      request.schoolId,
      code
    );
    if (!ok) throw badRequest("Invalid verification code", "CODE_EXPIRED");
    const updated = await prisma.parentPhoneLoginRequest.update({
      where: { id: request.id },
      data: { status: "VERIFIED", verifiedAt: new Date() },
    });
    return requestMetadata(updated);
  },

  async listRequestsByIds(ids: string[]) {
    const rows = await prisma.parentPhoneLoginRequest.findMany({
      where: { id: { in: ids } },
    });
    return rows.map((row) => requestMetadata(row));
  },

  async listRequests(schoolId: string, status?: string) {
    const rows = await prisma.parentPhoneLoginRequest.findMany({
      where: { schoolId, ...(status ? { status } : {}) },
      orderBy: { requestedAt: "desc" },
      include: { parent: { select: { name: true, email: true } } },
    });
    return rows.map((row) => ({
      ...requestMetadata(row),
      parentName: row.parent.name,
      parentEmail: row.parent.email,
    }));
  },

  async approvePhoneRequest(requestId: string, reviewerId: string, reviewNote?: string) {
    const request = await prisma.parentPhoneLoginRequest.findUnique({ where: { id: requestId } });
    if (!request) throw badRequest("Request not found", "NOT_FOUND", 404);
    if (request.status !== "VERIFIED" || !request.verifiedAt) {
      throw badRequest("Phone number has not been verified", "PARENT_PHONE_VERIFICATION_REQUIRED");
    }
    const conflict = await prisma.parentPhoneLogin.findUnique({
      where: {
        schoolId_phoneE164: { schoolId: request.schoolId, phoneE164: request.phoneE164 },
      },
    });
    if (conflict && conflict.userId !== request.parentId) {
      throw Object.assign(new Error("Phone number is already registered for this school"), {
        code: "PHONE_IN_USE",
        status: 409,
      });
    }
    const login = await prisma.parentPhoneLogin.upsert({
      where: {
        userId_schoolId: { userId: request.parentId, schoolId: request.schoolId },
      },
      create: {
        userId: request.parentId,
        schoolId: request.schoolId,
        phoneE164: request.phoneE164,
        verifiedAt: request.verifiedAt,
        enabled: true,
      },
      update: {
        phoneE164: request.phoneE164,
        verifiedAt: request.verifiedAt,
        enabled: true,
        failedCount: 0,
        lockedUntil: null,
      },
    });
    const updated = await prisma.parentPhoneLoginRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        reviewNote: reviewNote || null,
      },
    });
    return { login: phoneLoginMetadata(login), request: requestMetadata(updated) };
  },

  async rejectPhoneRequest(requestId: string, reviewerId: string, reviewNote?: string) {
    const request = await prisma.parentPhoneLoginRequest.findUnique({ where: { id: requestId } });
    if (!request) throw badRequest("Request not found", "NOT_FOUND", 404);
    if (!["PENDING", "VERIFIED"].includes(request.status)) {
      throw badRequest("Request already reviewed", "INVALID_STATUS");
    }
    const updated = await prisma.parentPhoneLoginRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        reviewNote: reviewNote || null,
      },
    });
    return requestMetadata(updated);
  },

  async setPhoneLoginEnabled(userId: string, schoolId: string, enabled: boolean) {
    const login = await prisma.parentPhoneLogin.findUnique({
      where: { userId_schoolId: { userId, schoolId } },
    });
    if (!login) throw badRequest("Parent phone login is not configured", "NOT_FOUND", 404);
    if (enabled && !login.verifiedAt) {
      throw badRequest("Phone number must be verified before enabling sign-in", "PARENT_PHONE_VERIFICATION_REQUIRED");
    }
    const updated = await prisma.parentPhoneLogin.update({
      where: { id: login.id },
      data: { enabled },
    });
    if (!enabled) {
      await deleteScopedSmsChallenges(
        userId,
        PARENT_SMS_PURPOSES.PARENT_PHONE_LOGIN,
        schoolId,
        login.phoneE164
      );
    }
    return phoneLoginMetadata(updated);
  },

  async listParentDirectory(schoolId: string, search?: string) {
    const query = String(search || "").trim().toLowerCase();
    const where: any = {
      role: "PARENT",
      AND: [
        {
          OR: [
            { schoolId },
            { children: { some: { student: { schoolId } } } },
          ],
        },
        ...(query
          ? [
              {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { email: { contains: query, mode: "insensitive" } },
                ],
              },
            ]
          : []),
      ],
    };
    const parents = await prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        schoolId: true,
        parentAccessCodes: { where: { schoolId } },
        parentPhoneLogins: { where: { schoolId } },
      },
    });
    return parents.map((parent) => ({
      id: parent.id,
      name: parent.name,
      email: parent.email,
      schoolId: parent.schoolId,
      accessCode: parent.parentAccessCodes[0] ? parentAccessMetadata(parent.parentAccessCodes[0]) : null,
      phoneLogin: parent.parentPhoneLogins[0] ? phoneLoginMetadata(parent.parentPhoneLogins[0]) : null,
    }));
  },

  async selfStatus(parentId: string) {
    const [accessCodes, phoneLogins, requests] = await Promise.all([
      prisma.parentAccessCode.findMany({
        where: { userId: parentId, revokedAt: null },
        include: { school: { select: { id: true, name: true, slug: true } } },
        orderBy: { issuedAt: "desc" },
      }),
      prisma.parentPhoneLogin.findMany({
        where: { userId: parentId },
        include: { school: { select: { id: true, name: true, slug: true } } },
      }),
      prisma.parentPhoneLoginRequest.findMany({
        where: { parentId },
        include: { school: { select: { id: true, name: true, slug: true } } },
        orderBy: { requestedAt: "desc" },
      }),
    ]);
    return {
      accessCodes: accessCodes.map((row) => ({
        ...parentAccessMetadata(row),
        school: row.school,
      })),
      phoneLogins: phoneLogins.map((row) => ({
        ...phoneLoginMetadata(row),
        school: row.school,
      })),
      requests: requests.map((row) => ({
        ...requestMetadata(row),
        school: row.school,
      })),
    };
  },

  async findEnabledPhoneLogin(schoolId: string, phoneE164: string) {
    return prisma.parentPhoneLogin.findUnique({
      where: { schoolId_phoneE164: { schoolId, phoneE164 } },
      include: { user: { select: { email: true, role: true, isActive: true } } },
    });
  },

  async recordPhoneCodeSent(loginId: string, lastCodeSentAt: Date, windowStartedAt: Date, codesSentWindow: number) {
    await prisma.parentPhoneLogin.update({
      where: { id: loginId },
      data: { lastCodeSentAt, windowStartedAt, codesSentWindow },
    });
  },

  async assertCanSendPhoneCode(row: {
    id: string;
    lastCodeSentAt: Date | null;
    windowStartedAt: Date | null;
    codesSentWindow: number;
  }) {
    const now = Date.now();
    if (
      row.lastCodeSentAt &&
      now - row.lastCodeSentAt.getTime() < parentPhoneResendSeconds() * 1000
    ) {
      throw Object.assign(new Error("Please wait before requesting another code"), {
        code: "TOO_MANY_ATTEMPTS",
        status: 429,
      });
    }
    const windowExpired = !row.windowStartedAt || now - row.windowStartedAt.getTime() > 10 * 60_000;
    const count = windowExpired ? 0 : row.codesSentWindow;
    if (count >= parentPhoneMaxSends()) {
      throw Object.assign(new Error("Too many codes requested. Try again later."), {
        code: "TOO_MANY_ATTEMPTS",
        status: 429,
      });
    }
    return { count, windowStartedAt: windowExpired ? new Date(now) : row.windowStartedAt! };
  },

  async recordPhoneLoginFailure(loginId: string, failedCount: number) {
    await prisma.parentPhoneLogin.update({
      where: { id: loginId },
      data: { failedCount, lockedUntil: parentLockUntil(failedCount) },
    });
  },

  async clearPhoneLoginFailures(loginId: string) {
    await prisma.parentPhoneLogin.update({
      where: { id: loginId },
      data: { failedCount: 0, lockedUntil: null },
    });
  },

  async verifyPhoneLoginCode(
    row: { id: string; userId: string; phoneE164: string; failedCount: number; lockedUntil: Date | null },
    schoolId: string,
    code: string
  ) {
    if (isParentLocked(row.lockedUntil)) {
      throw Object.assign(new Error("Too many attempts. Try again later."), {
        code: "TOO_MANY_ATTEMPTS",
        status: 429,
      });
    }
    const ok = await verifyScopedSmsChallenge(
      row.userId,
      row.phoneE164,
      PARENT_SMS_PURPOSES.PARENT_PHONE_LOGIN,
      schoolId,
      code
    );
    if (!ok) {
      const failedCount = row.failedCount + 1;
      await this.recordPhoneLoginFailure(row.id, failedCount);
      if (failedCount >= parentAccessAttemptLimit()) {
        throw Object.assign(new Error("Too many attempts. Try again later."), {
          code: "TOO_MANY_ATTEMPTS",
          status: 429,
        });
      }
      throw invalidCredentials();
    }
    await this.clearPhoneLoginFailures(row.id);
  },

  async sendParentPhoneLoginCode(schoolId: string, phoneE164: string, emailFallback?: string | null) {
    const row = await prisma.parentPhoneLogin.findUnique({
      where: { schoolId_phoneE164: { schoolId, phoneE164 } },
    });
    if (!row?.enabled || !row.verifiedAt || isParentLocked(row.lockedUntil)) throw invalidCredentials();
    const window = await this.assertCanSendPhoneCode(row);
    const challenge = await createScopedSmsChallenge(
      row.userId,
      phoneE164,
      PARENT_SMS_PURPOSES.PARENT_PHONE_LOGIN,
      schoolId
    );
    await this.recordPhoneCodeSent(row.id, new Date(), window.windowStartedAt, window.count + 1);
    await sendSmsOtpViaComms({
      phoneE164,
      code: challenge.code,
      purpose: "parent_phone_login",
      emailFallback,
    });
    return { ok: true, phoneHint: maskPhone(phoneE164) };
  },

  async assertPhoneLoginAllowed(school: { securityPolicy: string | null }) {
    const policy = parseSecurityPolicy(school.securityPolicy);
    if (!policy.allowSmsMfa) {
      throw forbidden(
        "Phone sign-in is not enabled by this school's security policy",
        "PARENT_PHONE_LOGIN_NOT_ALLOWED"
      );
    }
  },

  resolveParentSchoolBySlug: async (parentId: string, schoolSlug: string) => {
    const school = await parentAccessService.resolveSchoolBySlug(schoolSlug);
    if (!school) throw invalidCredentials();
    await parentAccessService.assertParentInSchool(parentId, school.id);
    return school;
  },

  async getRequestSchoolId(id: string) {
    const row = await prisma.parentPhoneLoginRequest.findUnique({
      where: { id },
      select: { schoolId: true },
    });
    return row?.schoolId ?? null;
  },

  async getParentSummary(id: string) {
    const parent = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, schoolId: true },
    });
    if (!parent || parent.role !== "PARENT") {
      throw badRequest("Parent not found", "NOT_FOUND", 404);
    }
    return parent;
  },

  async resetParentPassword(
    userId: string,
    schoolId: string,
    body: { password?: string; mustChangePassword?: boolean }
  ) {
    await parentAccessService.assertParentInSchool(userId, schoolId);
    const parent = await parentAccessService.getParentSummary(userId);
    const password =
      typeof body.password === "string" && body.password.trim()
        ? body.password.trim()
        : generateTempPassword();
    await assertPasswordForSchool(schoolId, password);
    const mustChangePassword =
      body.mustChangePassword === undefined ? true : Boolean(body.mustChangePassword);
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: bcrypt.hashSync(password, 10),
        mustChangePassword,
      },
    });
    return {
      id: parent.id,
      name: parent.name,
      email: parent.email,
      tempPassword: password,
      mustChangePassword,
    };
  },

  async getUserSchoolId(id: string, preferredSchoolId?: string) {
    const row = await prisma.user.findUnique({
      where: { id },
      select: {
        schoolId: true,
        children: { select: { student: { select: { schoolId: true } } } },
      },
    });
    if (!row) return null;
    if (row.schoolId && (!preferredSchoolId || row.schoolId === preferredSchoolId)) return row.schoolId;
    const linkedSchoolIds = row.children
      .map((link) => link.student.schoolId)
      .filter((schoolId): schoolId is string => Boolean(schoolId));
    if (preferredSchoolId && linkedSchoolIds.includes(preferredSchoolId)) return preferredSchoolId;
    return row.schoolId || linkedSchoolIds[0] || null;
  },
};
