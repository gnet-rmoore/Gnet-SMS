import prisma from "../lib/prisma";
import {
  clearTemporaryPasswordFields,
  decryptCredentialSecret,
} from "../lib/credentialCrypto";
import { isSchoolAssignableRole } from "../lib/roleChange";

export const TEMPORARY_PASSWORD_REVEAL_ROLES = [
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "REGISTRAR",
  "IT_ADMIN",
] as const;

export const TEMPORARY_PASSWORD_REVEAL_CAPABILITY = "action.users.reveal_temporary_password";

const TEMPORARY_PASSWORD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function isTemporaryPasswordRevealableRole(role: string): boolean {
  return role === "STUDENT" || role === "PARENT" || isSchoolAssignableRole(role);
}

export function isTemporaryPasswordExpired(issuedAt: Date | null, now = Date.now()): boolean {
  return !issuedAt || issuedAt.getTime() + TEMPORARY_PASSWORD_TTL_MS < now;
}

export const temporaryPasswordService = {
  async revealTemporaryPassword(userId: string, schoolId: string | null) {
    const user = await prisma.user.findFirst({
      where: schoolId
        ? {
            id: userId,
            OR: [
              { schoolId },
              { role: "PARENT", children: { some: { student: { schoolId } } } },
            ],
          }
        : { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        schoolId: true,
        mustChangePassword: true,
        temporaryPasswordEncrypted: true,
        temporaryPasswordIssuedAt: true,
      },
    });
    if (
      !user ||
      !isTemporaryPasswordRevealableRole(user.role) ||
      !user.mustChangePassword ||
      !user.temporaryPasswordEncrypted
    ) {
      return null;
    }

    const issuedAt = user.temporaryPasswordIssuedAt;
    if (isTemporaryPasswordExpired(issuedAt)) {
      await prisma.user.update({
        where: { id: user.id },
        data: clearTemporaryPasswordFields(),
      });
      return null;
    }

    let temporaryPassword: string | null = null;
    try {
      temporaryPassword = decryptCredentialSecret(user.temporaryPasswordEncrypted);
    } catch {
      temporaryPassword = null;
    }
    if (!temporaryPassword) {
      await prisma.user.update({
        where: { id: user.id },
        data: clearTemporaryPasswordFields(),
      });
      return null;
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      temporaryPassword,
      issuedAt: issuedAt.toISOString(),
      mustChangePassword: user.mustChangePassword,
    };
  },
};
