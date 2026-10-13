import prisma from "../lib/prisma";
import {
  clampGrantExpiry,
  defaultExpiresAt,
  findMatchingGrant,
  isContinuousAssessmentComponent,
  isGradeEditGrantScope,
  isGrantActive,
  isGrantorRole,
  type GrantMatchContext,
  type GradeEditGrantScope,
} from "../domain/gradeEditGrant";

function httpError(message: string, status: number, code?: string) {
  return Object.assign(new Error(message), { status, code });
}

export const gradeEditGrantService = {
  async list(schoolId: string, query: { teacherId?: string; activeOnly?: boolean } = {}) {
    const where: any = { schoolId };
    if (query.teacherId) where.teacherId = query.teacherId;
    const rows = await prisma.gradeEditGrant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    if (!query.activeOnly) return rows;
    const now = new Date();
    return rows.filter((r) => isGrantActive(r, now));
  },

  async listMine(schoolId: string, teacherId: string) {
    const rows = await prisma.gradeEditGrant.findMany({
      where: { schoolId, teacherId, revokedAt: null },
      orderBy: { expiresAt: "asc" },
      take: 50,
    });
    const now = new Date();
    return rows.filter((r) => isGrantActive(r, now));
  },

  async create(
    schoolId: string,
    body: {
      teacherId: string;
      scope: string;
      reason: string;
      expiresAt?: string;
      startsAt?: string;
      classId?: string | null;
      subjectId?: string | null;
      academicPeriodId?: string | null;
      examComponentId?: string | null;
    },
    actor: { id: string; role: string }
  ) {
    if (!isGrantorRole(actor.role)) {
      throw httpError("Only School Admin, Principal, or VPI may grant grade edit access", 403);
    }
    if (!isGradeEditGrantScope(body.scope)) {
      throw httpError("Invalid scope", 400, "INVALID_SCOPE");
    }
    const teacherId = String(body.teacherId || "").trim();
    const reason = String(body.reason || "").trim();
    if (!teacherId) throw httpError("teacherId is required", 400);
    if (reason.length < 5) throw httpError("reason required (min 5 chars)", 400);

    const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
    const rawExpiry = body.expiresAt ? new Date(body.expiresAt) : defaultExpiresAt(startsAt);
    const expiresAt = clampGrantExpiry(startsAt, rawExpiry);

    return prisma.gradeEditGrant.create({
      data: {
        schoolId,
        teacherId,
        scope: body.scope as GradeEditGrantScope,
        reason,
        startsAt,
        expiresAt,
        grantedById: actor.id,
        classId: body.classId || null,
        subjectId: body.subjectId || null,
        academicPeriodId: body.academicPeriodId || null,
        examComponentId: body.examComponentId || null,
      },
    });
  },

  async revoke(schoolId: string, grantId: string, actor: { id: string; role: string }) {
    if (!isGrantorRole(actor.role)) {
      throw httpError("Only School Admin, Principal, or VPI may revoke grants", 403);
    }
    const row = await prisma.gradeEditGrant.findFirst({ where: { id: grantId, schoolId } });
    if (!row) throw httpError("Grant not found", 404);
    if (row.revokedAt) return row;
    return prisma.gradeEditGrant.update({
      where: { id: grantId },
      data: { revokedAt: new Date(), revokedById: actor.id },
    });
  },

  /**
   * Load active grants for teacher and find one matching the write context.
   * Loads ExamComponent when needed for CA detection / period filter.
   */
  async resolveMatchingGrant(opts: {
    schoolId: string;
    teacherId: string;
    classId: string;
    subjectId?: string | null;
    examComponentId?: string | null;
    isIncompleteTarget: boolean;
  }) {
    const grants = await prisma.gradeEditGrant.findMany({
      where: {
        schoolId: opts.schoolId,
        teacherId: opts.teacherId,
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
      take: 50,
    });
    if (!grants.length) return null;

    let isCaComponent = false;
    let academicPeriodId: string | null = null;
    if (opts.examComponentId) {
      const comp = await prisma.examComponent.findUnique({
        where: { id: opts.examComponentId },
        select: {
          componentType: true,
          shortCode: true,
          label: true,
          periodId: true,
          schoolId: true,
        },
      });
      if (comp && comp.schoolId === opts.schoolId) {
        isCaComponent = isContinuousAssessmentComponent(comp);
        academicPeriodId = comp.periodId;
      }
    }

    const ctx: GrantMatchContext = {
      classId: opts.classId,
      subjectId: opts.subjectId,
      academicPeriodId,
      examComponentId: opts.examComponentId,
      isCaComponent,
      isIncompleteTarget: opts.isIncompleteTarget,
    };
    return findMatchingGrant(grants, ctx);
  },
};
