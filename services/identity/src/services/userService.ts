import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";
import {
  parseSecurityPolicy,
  validatePasswordAgainstPolicy,
  DEFAULT_SECURITY_POLICY,
} from "../lib/securityPolicy";
import { assertSchoolAdminRoleChange, isSchoolAssignableRole } from "../lib/roleChange";
import { assertCanSetUserPassword } from "../domain/passwordResetPolicy";
import { normalizeLocale } from "../i18n/emailCatalogs";
import { allocateStudentId } from "./studentIdService";
import {
  emptyGuideProgress,
  isUnder13,
  mergeGuidePatch,
  parseGuideProgress,
  wizardTrackForRole,
  type GuideProgress,
} from "../domain/guideProgress";
import { emailAuthService } from "./emailAuthService";
import { assertStudentQuota, assertStaffQuota } from "../lib/quotaEnforcement";

async function assertPasswordForSchool(schoolId: string | null | undefined, password: string) {
  if (!password) return;
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

/**
 * Ported from src/server/services/userService.ts.
 * Dropped: `classroomMembers -> classroom -> subject/gradeLevel` includes
 * (Classroom/Academic schemas) — identity only owns User/ParentStudent/School.
 * `getStudentGrades` (GradeEntry, owned by Academic) moved to
 * userController.getStudentGrades, which proxies to the Academic service.
 */
export const userService = {
  async getStudents(
    schoolId: string,
    opts?: {
      gradeLevelId?: string;
      feeCohort?: string;
      q?: string;
      page?: number | string;
      pageSize?: number | string;
      /** Internal / legacy callers: return full roster without pagination caps. */
      unpaged?: boolean;
    }
  ) {
    const where: any = { schoolId, role: "STUDENT" };
    if (opts?.gradeLevelId) where.gradeLevelId = opts.gradeLevelId;
    if (opts?.feeCohort && opts.feeCohort !== "ALL") {
      where.feeCohort = opts.feeCohort.toUpperCase();
    }
    const q = opts?.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
    const select = {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      schoolId: true,
      gradeLevelId: true,
      feeCohort: true,
      dob: true,
      gender: true,
      phone: true,
      address: true,
      photoUrl: true,
      parentName: true,
      parentPhone: true,
      mustChangePassword: true,
    } as const;
    if (opts?.unpaged) {
      const items = await prisma.user.findMany({
        where,
        select,
        orderBy: { createdAt: "desc" },
      });
      return { items, total: items.length, page: 1, pageSize: items.length };
    }
    const page = Math.max(1, Number(opts?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(opts?.pageSize) || 50));
    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, total, page, pageSize };
  },

  async createStudent(schoolId: string, data: any) {
    const {
      name,
      email,
      password,
      dob,
      gender,
      phone,
      address,
      parentName,
      parentPhone,
      gradeLevelId,
      feeCohort,
    } = data;

    if (!name?.trim() || !email?.trim()) {
      throw new Error("Name and email are required");
    }
    if (!gradeLevelId) {
      throw new Error("Grade level is required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    await assertStudentQuota(schoolId);

    const temporaryPassword =
      typeof password === "string" && password.trim().length >= 8
        ? password.trim()
        : `St@${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

    const passwordHash = bcrypt.hashSync(temporaryPassword, 10);
    const cohort =
      feeCohort && ["NEW", "RETURNING"].includes(String(feeCohort).toUpperCase())
        ? String(feeCohort).toUpperCase()
        : "NEW";
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "STUDENT",
        schoolId,
        dob: dob ? new Date(dob) : null,
        gender: gender || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        parentName: parentName?.trim() || null,
        parentPhone: parentPhone?.trim() || null,
        gradeLevelId,
        feeCohort: cohort,
        mustChangePassword: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        gradeLevelId: true,
        feeCohort: true,
        dob: true,
        gender: true,
        phone: true,
        address: true,
        parentName: true,
        parentPhone: true,
        mustChangePassword: true,
      },
    });

    return { ...user, temporaryPassword };
  },

  async getStaff(
    schoolId: string,
    opts?: {
      q?: string;
      role?: string;
      isActive?: string | boolean;
      page?: number | string;
      pageSize?: number | string;
      unpaged?: boolean;
    }
  ) {
    const where: any = {
      schoolId,
      role: { notIn: ["STUDENT", "PARENT", "SUPER_ADMIN"] },
    };
    if (opts?.role) where.role = String(opts.role);
    if (opts?.isActive === true || opts?.isActive === "true") where.isActive = true;
    if (opts?.isActive === false || opts?.isActive === "false") where.isActive = false;
    const q = opts?.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
    const select = {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      phone: true,
      dob: true,
      gender: true,
      address: true,
      photoUrl: true,
      signatureUrl: true,
      joiningDate: true,
      mustChangePassword: true,
    } as const;
    if (opts?.unpaged) {
      const items = await prisma.user.findMany({
        where,
        select,
        orderBy: { createdAt: "desc" },
      });
      return { items, total: items.length, page: 1, pageSize: items.length };
    }
    const page = Math.max(1, Number(opts?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(opts?.pageSize) || 50));
    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, total, page, pageSize };
  },

  /** School Admin — all tenant users (staff + students + parents) for Roles & Access. */
  async listSchoolUsers(
    schoolId: string,
    opts: { q?: string; role?: string; limit?: number; offset?: number } = {}
  ) {
    const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
    const offset = Math.max(opts.offset ?? 0, 0);
    const q = (opts.q || "").trim();
    const role = (opts.role || "").trim();

    const where: any = {
      schoolId,
      role: { not: "SUPER_ADMIN" },
    };
    if (role) where.role = role;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          photoUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ role: "asc" }, { name: "asc" }],
        take: limit,
        skip: offset,
      }),
    ]);

    return { total, limit, offset, users };
  },

  async countSchoolAdmins(schoolId: string) {
    return prisma.user.count({ where: { schoolId, role: "SCHOOL_ADMIN" } });
  },

  /**
   * Dedicated role assignment for School Admin (Roles & Access).
   * Writes RoleChangeAudit and enforces last-admin / tenant / assignable-role rules.
   */
  async changeUserRole(
    targetUserId: string,
    nextRole: string,
    actor: { id: string; role: string; schoolId: string | null }
  ) {
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, schoolId: true, name: true, email: true },
    });
    if (!target) {
      throw Object.assign(new Error("User not found"), { status: 404 });
    }
    if (!target.schoolId) {
      throw Object.assign(new Error("User is not attached to a school"), { status: 400 });
    }

    const schoolAdminCount = await this.countSchoolAdmins(target.schoolId);
    const decision = assertSchoolAdminRoleChange({
      actor,
      target,
      nextRole,
      schoolAdminCount,
    });
    if (!decision.ok) {
      throw Object.assign(new Error(decision.error), { status: decision.status });
    }

    if (decision.fromRole === decision.toRole) {
      return {
        id: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
        schoolId: target.schoolId,
        unchanged: true,
      };
    }

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: { role: decision.toRole },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          schoolId: true,
          isActive: true,
          photoUrl: true,
        },
      }),
      prisma.roleChangeAudit.create({
        data: {
          schoolId: target.schoolId,
          targetUserId: target.id,
          actorUserId: actor.id,
          fromRole: decision.fromRole,
          toRole: decision.toRole,
        },
      }),
    ]);

    return updated;
  },

  async listRoleChangeAudit(schoolId: string, limit = 50) {
    const rows = await prisma.roleChangeAudit.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 200),
    });
    if (rows.length === 0) return [];

    const ids = [...new Set(rows.flatMap((r) => [r.targetUserId, r.actorUserId]))];
    const people = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
    });
    const byId = new Map(people.map((p) => [p.id, p]));

    return rows.map((r) => ({
      ...r,
      targetName: byId.get(r.targetUserId)?.name || null,
      targetEmail: byId.get(r.targetUserId)?.email || null,
      actorName: byId.get(r.actorUserId)?.name || null,
    }));
  },

  /** Internal — users in a school filtered by role list (announcement fan-out, etc.). */
  async getUsersByRoles(schoolId: string, roles: string[]) {
    const cleaned = [...new Set(roles.map((r) => String(r || "").trim()).filter(Boolean))];
    if (cleaned.length === 0) return [];
    return prisma.user.findMany({
      where: {
        schoolId,
        isActive: true,
        role: { in: cleaned },
      },
      select: { id: true, name: true, email: true, role: true, schoolId: true },
      take: 2000,
    });
  },

  /** Internal — resolve a school user by email (parent notifications, etc.). */
  async lookupByEmailInSchool(schoolId: string, email: string) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) return null;
    return prisma.user.findFirst({
      where: { schoolId, email: normalized, isActive: true },
      select: { id: true, name: true, email: true, role: true, schoolId: true },
    });
  },

  async createStaff(schoolId: string, data: any) {
    const {
      name,
      email,
      password,
      role,
      phone,
      address,
      dob,
      gender,
      joiningDate,
      isActive,
      mustChangePassword,
      photoUrl,
    } = data;

    if (!name?.trim() || !email?.trim()) {
      throw new Error("Name and email are required");
    }

    const staffRole = role || "TEACHER";
    if (!isSchoolAssignableRole(staffRole) || staffRole === "STUDENT" || staffRole === "PARENT") {
      throw Object.assign(new Error("Invalid staff role"), { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    await assertStaffQuota(schoolId);

    const temporaryPassword =
      typeof password === "string" && password.trim().length >= 8
        ? password.trim()
        : `St@${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
    await assertPasswordForSchool(schoolId, temporaryPassword);

    const passwordHash = bcrypt.hashSync(temporaryPassword, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role: staffRole,
        schoolId,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        dob: dob ? new Date(dob) : null,
        gender: gender || null,
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        mustChangePassword: mustChangePassword !== undefined ? Boolean(mustChangePassword) : true,
        photoUrl: typeof photoUrl === "string" && photoUrl.trim() ? photoUrl.trim() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        dob: true,
        gender: true,
        address: true,
        photoUrl: true,
        joiningDate: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    return { ...user, temporaryPassword };
  },

  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        dob: true,
        gender: true,
        address: true,
        photoUrl: true,
        signatureUrl: true,
        joiningDate: true,
        isActive: true,
        schoolId: true,
        gradeLevelId: true,
        feeCohort: true,
        preferredLocale: true,
      },
    });
  },

  /** Bulk lookup by ids for cross-service enrichment (name/email/role/photo). */
  async getUsersByIds(ids: string[]) {
    const unique = [...new Set((ids || []).filter(Boolean))].slice(0, 500);
    if (unique.length === 0) return [];
    return prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true, email: true, role: true, photoUrl: true },
    });
  },

  async updateUser(userId: string, data: any, actor?: { id: string; role: string; schoolId: string | null }) {
    const {
      name, email, role, phone, dob, gender, parentName, parentPhone,
      gradeLevelId, feeCohort, isActive, address, photoUrl, signatureUrl, password, joiningDate, mustChangePassword,
      preferredLocale,
    } = data;

    if (role !== undefined) {
      if (!actor) {
        throw Object.assign(new Error("Role changes require an authenticated actor"), { status: 403 });
      }
      await this.changeUserRole(userId, String(role), actor);
    }

    const updateData: any = {
      name, email, phone,
      dob: dob ? new Date(dob) : undefined,
      gender, parentName, parentPhone, gradeLevelId,
      ...(feeCohort !== undefined
        ? {
            feeCohort:
              feeCohort === null || feeCohort === ""
                ? null
                : ["NEW", "RETURNING"].includes(String(feeCohort).toUpperCase())
                  ? String(feeCohort).toUpperCase()
                  : null,
          }
        : {}),
      isActive: isActive !== undefined ? isActive : undefined,
      address, photoUrl,
      ...(signatureUrl !== undefined ? { signatureUrl } : {}),
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      mustChangePassword: mustChangePassword !== undefined ? Boolean(mustChangePassword) : undefined,
      ...(preferredLocale !== undefined
        ? {
            preferredLocale: (() => {
              if (preferredLocale === null || preferredLocale === "") return null;
              const normalized = normalizeLocale(String(preferredLocale));
              if (!normalized) {
                throw Object.assign(new Error("Unsupported language preference"), {
                  status: 400,
                  code: "INVALID_LOCALE",
                });
              }
              return normalized;
            })(),
          }
        : {}),
    };

    // Drop undefined keys so Prisma doesn't clear fields unintentionally
    for (const key of Object.keys(updateData)) {
      if (updateData[key] === undefined) delete updateData[key];
    }

    if (password) {
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, schoolId: true, passwordHash: true, role: true },
      });
      if (!existing) {
        throw Object.assign(new Error("User not found"), { status: 404 });
      }

      // Self-service password change must prove the current password.
      // Admin resets (School Admin / IT Admin / Super Admin) omit currentPassword.
      const isSelfChange = Boolean(actor?.id && actor.id === userId);
      assertCanSetUserPassword(actor, existing, { isSelfChange });

      if (isSelfChange) {
        const currentPassword =
          typeof data.currentPassword === "string" ? data.currentPassword : "";
        if (!currentPassword) {
          throw Object.assign(new Error("Current password is required"), {
            status: 400,
            code: "CURRENT_PASSWORD_REQUIRED",
          });
        }
        if (!bcrypt.compareSync(currentPassword, existing.passwordHash)) {
          throw Object.assign(new Error("Current password is incorrect"), {
            status: 400,
            code: "CURRENT_PASSWORD_INVALID",
          });
        }
        if (currentPassword === password) {
          throw Object.assign(new Error("New password must be different from the current password"), {
            status: 400,
            code: "PASSWORD_UNCHANGED",
          });
        }
      }

      await assertPasswordForSchool(existing.schoolId, password);
      updateData.passwordHash = bcrypt.hashSync(password, 10);
      if (mustChangePassword === undefined) {
        // Admin resets default to must-change; self-service clears the flag.
        updateData.mustChangePassword = isSelfChange ? false : true;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          dob: true,
          gender: true,
          address: true,
          photoUrl: true,
          signatureUrl: true,
          joiningDate: true,
          isActive: true,
          schoolId: true,
          gradeLevelId: true,
          feeCohort: true,
          mustChangePassword: true,
          preferredLocale: true,
        },
      });
    }

    return prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        dob: true,
        gender: true,
        address: true,
        photoUrl: true,
        signatureUrl: true,
        joiningDate: true,
        isActive: true,
        schoolId: true,
        gradeLevelId: true,
        feeCohort: true,
        mustChangePassword: true,
        preferredLocale: true,
      },
    });
  },

  async deleteUser(userId: string) {
    // classroomMember / gradeEntry / leaveRequest / staffTask / staffAttendance
    // live in other services now — those services are responsible for cleaning
    // up their own rows via a user.deleted event once the event bus lands.
    return prisma.user.delete({ where: { id: userId } });
  },

  async getParentsChildren(parentId: string) {
    const joinRelations = await prisma.parentStudent.findMany({
      where: { parentId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            dob: true,
            gender: true,
            isActive: true,
            photoUrl: true,
          },
        },
      },
    });

    let linkedStudents: any[] = joinRelations.map((r) => ({ ...r.student }));

    if (linkedStudents.length === 0) {
      const parentUser = await prisma.user.findUnique({ where: { id: parentId } });
      if (parentUser) {
        const matchedStudents = await prisma.user.findMany({
          where: {
            role: "STUDENT",
            schoolId: parentUser.schoolId,
            OR: [
              { parentPhone: parentUser.phone || undefined },
              { email: { startsWith: "student_of_" + parentUser.id } },
            ].filter(Boolean) as any,
          },
        });

        linkedStudents = matchedStudents.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          dob: s.dob,
          gender: s.gender,
          isActive: s.isActive,
          photoUrl: s.photoUrl,
        }));
      }
    }

    return linkedStudents;
  },

  /** Internal authorization primitive. Deliberately uses explicit links only. */
  async assertParentLinked(parentId: string, studentId: string) {
    const link = await prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
      select: { parentId: true },
    });
    if (!link) {
      throw Object.assign(new Error("Parent is not linked to this student"), {
        status: 403,
        code: "PARENT_STUDENT_LINK_REQUIRED",
      });
    }
    return true;
  },

  /** Internal — recipients for student-scoped family notifications. */
  async getStudentParentIds(studentId: string) {
    const links = await prisma.parentStudent.findMany({
      where: { studentId },
      select: { parentId: true },
    });
    return links.map((link) => link.parentId);
  },

  /** Internal — used by other services (e.g. lifecycle enrollment) via /api/internal/users. */
  async findOrCreateUser(data: {
    email: string;
    name: string;
    role: string;
    schoolId: string;
    password?: string;
    mustChangePassword?: boolean;
    sendWelcomeEmail?: boolean;
    dob?: string | Date | null;
    gender?: string | null;
    address?: string | null;
    phone?: string | null;
    parentName?: string | null;
    parentPhone?: string | null;
    gradeLevelId?: string | null;
    feeCohort?: string | null;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      if (
        existing.role === "STUDENT" &&
        data.feeCohort &&
        ["NEW", "RETURNING"].includes(String(data.feeCohort).toUpperCase())
      ) {
        const cohort = String(data.feeCohort).toUpperCase();
        const needsUpdate =
          existing.feeCohort !== cohort ||
          (data.gradeLevelId && existing.gradeLevelId !== data.gradeLevelId) ||
          !existing.studentIdNumber;
        if (needsUpdate) {
          let studentIdNumber = existing.studentIdNumber;
          if (!studentIdNumber) {
            studentIdNumber = await allocateStudentId(existing.schoolId as string);
          }
          const updated = await prisma.user.update({
            where: { id: existing.id },
            data: {
              feeCohort: cohort,
              ...(data.gradeLevelId ? { gradeLevelId: data.gradeLevelId } : {}),
              ...(studentIdNumber ? { studentIdNumber } : {}),
            },
          });
          return { ...updated, created: false };
        }
      }
      if (existing.role === "STUDENT" && existing.schoolId && !existing.studentIdNumber) {
        const studentIdNumber = await allocateStudentId(existing.schoolId);
        const updated = await prisma.user.update({
          where: { id: existing.id },
          data: { studentIdNumber },
        });
        return { ...updated, created: false };
      }
      return { ...existing, created: false };
    }

    if (data.role === "STUDENT") {
      await assertStudentQuota(data.schoolId);
    } else if (data.role !== "PARENT") {
      await assertStaffQuota(data.schoolId);
    }

    const tempPassword = data.password || "changeme123";
    const passwordHash = bcrypt.hashSync(tempPassword, 10);
    const mustChange =
      data.mustChangePassword !== undefined ? Boolean(data.mustChangePassword) : true;

    const studentIdNumber =
      data.role === "STUDENT" && data.schoolId
        ? await allocateStudentId(data.schoolId)
        : null;

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        studentIdNumber,
        passwordHash,
        role: data.role,
        schoolId: data.schoolId,
        dob: data.dob ? new Date(data.dob) : null,
        gender: data.gender || null,
        address: data.address || null,
        phone: data.phone || null,
        parentName: data.parentName || null,
        parentPhone: data.parentPhone || null,
        gradeLevelId: data.gradeLevelId || null,
        feeCohort:
          data.role === "STUDENT"
            ? data.feeCohort &&
              ["NEW", "RETURNING"].includes(String(data.feeCohort).toUpperCase())
              ? String(data.feeCohort).toUpperCase()
              : "NEW"
            : null,
        isActive: true,
        mustChangePassword: mustChange,
      },
    });

    if (data.sendWelcomeEmail !== false && data.password) {
      try {
        const { sendMail, appBaseUrl } = await import("../lib/mailer");
        const { resolveEmailLocale, tEmail } = await import("../i18n/emailCatalogs");
        const school = await prisma.school.findUnique({
          where: { id: data.schoolId },
          select: { defaultLocale: true },
        });
        const locale = resolveEmailLocale(user.preferredLocale, school?.defaultLocale);
        const accountMail = tEmail(locale, "accountReady", {
          name: user.name,
          email: user.email,
          tempPassword,
          loginUrl: `${appBaseUrl()}/login`,
        });
        await sendMail({
          to: user.email,
          subject: accountMail.subject,
          text: accountMail.text,
        });
        if (await emailAuthService.isEmailVerificationRequired()) {
          await emailAuthService.sendVerificationEmail(user.id);
        }
      } catch (err: any) {
        console.warn("[identity] welcome email skipped:", err?.message || err);
      }
    }

    return { ...user, created: true };
  },

  async createParentLink(parentId: string, studentId: string) {
    const existingLink = await prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
    });
    if (existingLink) return existingLink;
    return prisma.parentStudent.create({ data: { parentId, studentId } });
  },

  /**
   * Verify a returning student for public re-registration.
   * Match: school STUDENT by email (required) + DOB when both sides have a date.
   */
  /**
   * Verify a returning student for public re-registration.
   * Match a school STUDENT by permanent student ID (primary) or email (fallback),
   * cross-checked with DOB when the student has one on file.
   */
  async verifyReturningStudent(
    schoolId: string,
    identifier: { idNumber?: string | null; email?: string | null },
    dob?: string | null
  ) {
    const idNumber = String(identifier?.idNumber || "").trim();
    const email = String(identifier?.email || "").trim().toLowerCase();
    if (!idNumber && !email) {
      throw Object.assign(new Error("Student ID or email is required"), { status: 400 });
    }
    const where: any = {
      schoolId,
      role: "STUDENT",
      isActive: true,
    };
    if (idNumber) {
      where.studentIdNumber = idNumber;
    } else {
      where.email = email;
    }
    const user = await prisma.user.findFirst({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        dob: true,
        studentIdNumber: true,
        gradeLevelId: true,
        parentName: true,
        parentPhone: true,
        phone: true,
        gender: true,
        address: true,
        feeCohort: true,
      },
    });
    if (!user) {
      throw Object.assign(
        new Error(
          idNumber
            ? "No active student found with that ID at this school"
            : "No active student found with that email at this school"
        ),
        { status: 404, code: "STUDENT_NOT_FOUND" }
      );
    }
    if (dob && user.dob) {
      const want = new Date(dob);
      const have = new Date(user.dob);
      if (
        !isNaN(want.getTime()) &&
        (want.getUTCFullYear() !== have.getUTCFullYear() ||
          want.getUTCMonth() !== have.getUTCMonth() ||
          want.getUTCDate() !== have.getUTCDate())
      ) {
        throw Object.assign(new Error("Date of birth does not match our records"), {
          status: 403,
          code: "DOB_MISMATCH",
        });
      }
    } else if (dob && !user.dob) {
      // School has no DOB on file — allow ID/email-only match but note it
    } else if (!dob && user.dob) {
      throw Object.assign(new Error("Date of birth is required to verify this student"), {
        status: 400,
        code: "DOB_REQUIRED",
      });
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      studentIdNumber: user.studentIdNumber || idNumber || null,
      gradeLevelId: user.gradeLevelId,
      parentName: user.parentName,
      parentPhone: user.parentPhone,
      phone: user.phone,
      gender: user.gender,
      address: user.address,
      feeCohort: user.feeCohort || "RETURNING",
    };
  },

  async getGuideProgress(userId: string): Promise<{
    trackId: string | null;
    progress: GuideProgress | null;
    meta: { under13: boolean; guideRequired: boolean; dob: string | null };
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        guideProgress: true,
        dob: true,
        schoolId: true,
        school: { select: { guideRequired: true } },
      },
    });
    if (!user) {
      throw Object.assign(new Error("User not found"), { status: 404 });
    }
    const under13 = user.role === "STUDENT" && isUnder13(user.dob);
    const guideRequired = Boolean(user.school?.guideRequired);
    const trackId = wizardTrackForRole(user.role);
    if (!trackId) {
      return {
        trackId: null,
        progress: null,
        meta: { under13, guideRequired, dob: user.dob ? user.dob.toISOString() : null },
      };
    }
    const stored = parseGuideProgress(user.guideProgress, trackId);
    // Role change → reset to new track
    if (stored.trackId !== trackId) {
      const fresh = emptyGuideProgress(trackId);
      await prisma.user.update({
        where: { id: userId },
        data: { guideProgress: fresh as any },
      });
      return {
        trackId,
        progress: fresh,
        meta: { under13, guideRequired, dob: user.dob ? user.dob.toISOString() : null },
      };
    }
    return {
      trackId,
      progress: stored,
      meta: { under13, guideRequired, dob: user.dob ? user.dob.toISOString() : null },
    };
  },

  async updateGuideProgress(
    userId: string,
    patch: Partial<GuideProgress> & {
      restart?: boolean;
      markStep?: { id: string; status: "todo" | "done" | "skipped" };
      sendWelcomeTip?: boolean;
    }
  ): Promise<{
    trackId: string;
    progress: GuideProgress;
    meta: { under13: boolean; guideRequired: boolean; dob: string | null };
  }> {
    const { trackId, progress, meta } = await this.getGuideProgress(userId);
    if (!trackId || !progress) {
      throw Object.assign(new Error("No guide available for this role"), { status: 400 });
    }

    // School policy: permanent dismiss is ignored while guideRequired and not complete
    if (meta.guideRequired && patch.status === "DISMISSED" && progress.status !== "COMPLETED") {
      patch = { ...patch, status: progress.status === "NOT_STARTED" ? "IN_PROGRESS" : progress.status };
      delete (patch as any).dismissedAt;
    }

    let next = mergeGuidePatch(progress, patch);

    const shouldTip =
      Boolean(patch.sendWelcomeTip) ||
      (next.status === "IN_PROGRESS" && progress.status === "NOT_STARTED" && !progress.welcomeTipSentAt);
    if (shouldTip && !next.welcomeTipSentAt) {
      try {
        const full = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            email: true,
            name: true,
            preferredLocale: true,
            school: { select: { name: true, slug: true, defaultLocale: true } },
          },
        });
        if (full?.email) {
          const { sendMail, appBaseUrl } = await import("../lib/mailer");
          const { resolveEmailLocale, tEmail } = await import("../i18n/emailCatalogs");
          const locale = resolveEmailLocale(full.preferredLocale, full.school?.defaultLocale);
          const guidePath = trackId === "super_admin"
            ? `${appBaseUrl()}/super-admin/guide`
            : `${appBaseUrl()}/${full.school?.slug || ""}/guide`;
          const mail = tEmail(locale, "guideWelcome", {
            name: full.name || "there",
            schoolName: full.school?.name || "YourSMS",
            guideUrl: guidePath,
          });
          await sendMail({ to: full.email, subject: mail.subject, text: mail.text });
          next = { ...next, welcomeTipSentAt: new Date().toISOString() };
        }
      } catch (err) {
        console.warn("[identity] guide welcome tip email failed:", (err as Error).message);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { guideProgress: next as any },
    });
    return { trackId, progress: next, meta };
  },

  /** Honest counts only — no PII. School Admin / Principal / IT. */
  async getSchoolGuideStats(schoolId: string): Promise<{
    schoolId: string;
    guideRequired: boolean;
    totals: { users: number; completed: number; inProgress: number; notStarted: number; dismissed: number };
    byRole: Array<{
      role: string;
      trackId: string | null;
      users: number;
      completed: number;
      inProgress: number;
      notStarted: number;
      dismissed: number;
      percentComplete: number;
    }>;
  }> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, guideRequired: true },
    });
    if (!school) {
      throw Object.assign(new Error("School not found"), { status: 404 });
    }
    const users = await prisma.user.findMany({
      where: { schoolId, isActive: true },
      select: { role: true, guideProgress: true },
    });

    type Bucket = {
      role: string;
      trackId: string | null;
      users: number;
      completed: number;
      inProgress: number;
      notStarted: number;
      dismissed: number;
    };
    const byRoleMap = new Map<string, Bucket>();
    const totals = { users: 0, completed: 0, inProgress: 0, notStarted: 0, dismissed: 0 };

    for (const u of users) {
      const trackId = wizardTrackForRole(u.role);
      if (!trackId) continue; // skip roles without a guide
      totals.users += 1;
      const key = u.role;
      let b = byRoleMap.get(key);
      if (!b) {
        b = { role: key, trackId, users: 0, completed: 0, inProgress: 0, notStarted: 0, dismissed: 0 };
        byRoleMap.set(key, b);
      }
      b.users += 1;
      const p = parseGuideProgress(u.guideProgress, trackId);
      const status =
        p.trackId !== trackId
          ? "NOT_STARTED"
          : p.status;
      if (status === "COMPLETED") {
        b.completed += 1;
        totals.completed += 1;
      } else if (status === "IN_PROGRESS") {
        b.inProgress += 1;
        totals.inProgress += 1;
      } else if (status === "DISMISSED") {
        b.dismissed += 1;
        totals.dismissed += 1;
      } else {
        b.notStarted += 1;
        totals.notStarted += 1;
      }
    }

    const byRole = Array.from(byRoleMap.values())
      .map((b) => ({
        ...b,
        percentComplete: b.users ? Math.round((b.completed / b.users) * 100) : 0,
      }))
      .sort((a, b) => a.role.localeCompare(b.role));

    return {
      schoolId: school.id,
      guideRequired: school.guideRequired,
      totals,
      byRole,
    };
  },
};
