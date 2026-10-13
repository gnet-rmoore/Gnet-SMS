import prisma from "../lib/prisma";
import { listIdentityStudents, patchIdentityUserPlacement } from "../lib/identityClient";
import {
  addClassroomMember,
  getClassroomMembers,
  listClassroomsBySchool,
  removeClassroomMember,
} from "../lib/classroomClient";
import { PROMOTION_OUTCOMES, type PromotionOutcome } from "../domain/yearTransition";
import { assemblePromotionStatementMatrix } from "../lib/promotionStatementMath";

function httpError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

function normalizeYearKey(raw: string) {
  const key = String(raw || "").trim();
  if (!key || key.length > 32) throw httpError("schoolYearKey is required (max 32 chars)");
  return key;
}

function assertOutcome(raw: string): PromotionOutcome {
  const o = String(raw || "").toUpperCase();
  if (!(PROMOTION_OUTCOMES as readonly string[]).includes(o)) {
    throw httpError(`Invalid outcome: ${raw}`);
  }
  return o as PromotionOutcome;
}

async function homeroomByStudent(schoolId: string): Promise<Map<string, string>> {
  const classrooms = await listClassroomsBySchool(schoolId);
  const homerooms = classrooms.filter((c) => !c.subjectId);
  const map = new Map<string, string>();
  await Promise.all(
    homerooms.map(async (c) => {
      const members = await getClassroomMembers(c.id, "STUDENT");
      for (const m of members) {
        if (!map.has(m.userId)) map.set(m.userId, c.id);
      }
    })
  );
  return map;
}

export const promotionService = {
  async captureCensus(schoolId: string, schoolYearKey: string, actorUserId: string) {
    const yearKey = normalizeYearKey(schoolYearKey);
    const existing = await prisma.yearCensusSnapshot.findUnique({
      where: { schoolId_schoolYearKey: { schoolId, schoolYearKey: yearKey } },
    });
    if (existing?.lockedAt) {
      throw httpError("Opening census is locked for this school year", 409);
    }

    const [students, gradeLevels, membership] = await Promise.all([
      listIdentityStudents(schoolId),
      prisma.gradeLevel.findMany({ where: { schoolId } }),
      homeroomByStudent(schoolId),
    ]);
    const gradeById = new Map(gradeLevels.map((g) => [g.id, g]));
    const active = students.filter((s) => s.isActive !== false);

    const rows = active.map((s) => {
      const grade = s.gradeLevelId ? gradeById.get(s.gradeLevelId) : null;
      return {
        studentUserId: s.id,
        gradeLevelId: s.gradeLevelId || null,
        divisionId: grade?.divisionId || null,
        classroomId: membership.get(s.id) || null,
        gender: s.gender || null,
      };
    });

    if (existing) {
      await prisma.yearCensusRow.deleteMany({ where: { snapshotId: existing.id } });
      const snap = await prisma.yearCensusSnapshot.update({
        where: { id: existing.id },
        data: {
          capturedAt: new Date(),
          capturedByUserId: actorUserId,
          rows: { create: rows },
        },
        include: { _count: { select: { rows: true } } },
      });
      return snap;
    }

    return prisma.yearCensusSnapshot.create({
      data: {
        schoolId,
        schoolYearKey: yearKey,
        capturedByUserId: actorUserId,
        rows: { create: rows },
      },
      include: { _count: { select: { rows: true } } },
    });
  },

  async getCensus(schoolId: string, schoolYearKey: string) {
    const yearKey = normalizeYearKey(schoolYearKey);
    const snap = await prisma.yearCensusSnapshot.findUnique({
      where: { schoolId_schoolYearKey: { schoolId, schoolYearKey: yearKey } },
      include: { rows: true, _count: { select: { rows: true } } },
    });
    return snap;
  },

  async createRun(schoolId: string, schoolYearKey: string, actorUserId: string) {
    const yearKey = normalizeYearKey(schoolYearKey);
    const census = await prisma.yearCensusSnapshot.findUnique({
      where: { schoolId_schoolYearKey: { schoolId, schoolYearKey: yearKey } },
      include: { rows: true },
    });
    if (!census) throw httpError("Capture opening census before creating a promotion run", 400);

    const grades = await prisma.gradeLevel.findMany({
      where: { schoolId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    const nextById = new Map<string, string | null>();
    for (let i = 0; i < grades.length; i++) {
      const g = grades[i];
      const explicit = g.nextGradeLevelId;
      const byOrder = grades[i + 1]?.id || null;
      nextById.set(g.id, explicit || byOrder);
    }

    const run = await prisma.promotionRun.create({
      data: {
        schoolId,
        schoolYearKey: yearKey,
        status: "DRAFT",
        censusSnapshotId: census.id,
        createdByUserId: actorUserId,
        decisions: {
          create: census.rows.map((row) => ({
            studentUserId: row.studentUserId,
            outcome: "PROMOTED",
            fromGradeLevelId: row.gradeLevelId,
            toGradeLevelId: row.gradeLevelId
              ? nextById.get(row.gradeLevelId) || null
              : null,
            fromClassroomId: row.classroomId,
            toClassroomId: null,
          })),
        },
      },
      include: { decisions: true, censusSnapshot: { include: { _count: { select: { rows: true } } } } },
    });
    return run;
  },

  async listRuns(schoolId: string, schoolYearKey?: string) {
    return prisma.promotionRun.findMany({
      where: {
        schoolId,
        ...(schoolYearKey ? { schoolYearKey: normalizeYearKey(schoolYearKey) } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { decisions: true } },
        censusSnapshot: { select: { id: true, lockedAt: true, _count: { select: { rows: true } } } },
      },
    });
  },

  async getRun(schoolId: string, runId: string) {
    const run = await prisma.promotionRun.findFirst({
      where: { id: runId, schoolId },
      include: {
        decisions: true,
        censusSnapshot: { include: { rows: true } },
      },
    });
    if (!run) throw httpError("Promotion run not found", 404);
    return run;
  },

  async upsertDecisions(
    schoolId: string,
    runId: string,
    decisions: Array<{
      studentUserId: string;
      outcome: string;
      toGradeLevelId?: string | null;
      toClassroomId?: string | null;
    }>
  ) {
    const run = await this.getRun(schoolId, runId);
    if (run.status !== "DRAFT") throw httpError("Only DRAFT runs can be edited", 409);

    const ops = decisions.map((d) => {
      const outcome = assertOutcome(d.outcome);
      const existing = run.decisions.find((x) => x.studentUserId === d.studentUserId);
      const fromGrade = existing?.fromGradeLevelId ?? null;
      const fromClass = existing?.fromClassroomId ?? null;
      let toGrade =
        d.toGradeLevelId !== undefined ? d.toGradeLevelId : existing?.toGradeLevelId ?? null;
      if (outcome === "REPEAT") toGrade = fromGrade;
      if (outcome === "GRADUATED" || outcome === "DO_NOT_RETURN") toGrade = null;
      return prisma.promotionDecision.upsert({
        where: {
          runId_studentUserId: { runId, studentUserId: d.studentUserId },
        },
        create: {
          runId,
          studentUserId: d.studentUserId,
          outcome,
          fromGradeLevelId: fromGrade,
          toGradeLevelId: toGrade,
          fromClassroomId: fromClass,
          toClassroomId: d.toClassroomId ?? null,
        },
        update: {
          outcome,
          toGradeLevelId: toGrade,
          ...(d.toClassroomId !== undefined ? { toClassroomId: d.toClassroomId } : {}),
        },
      });
    });
    await prisma.$transaction(ops);
    return this.getRun(schoolId, runId);
  },

  async commitRun(schoolId: string, runId: string, actorUserId: string) {
    const run = await this.getRun(schoolId, runId);
    if (run.status !== "DRAFT") throw httpError("Run is not in DRAFT status", 409);
    if (!run.decisions.length) throw httpError("Run has no decisions");

    for (const d of run.decisions) {
      if (d.outcome === "PROMOTED" && !d.toGradeLevelId) {
        throw httpError(`Student ${d.studentUserId} is PROMOTED but has no target grade`);
      }
    }

    const errors: string[] = [];
    for (const d of run.decisions) {
      try {
        if (d.outcome === "PROMOTED") {
          await patchIdentityUserPlacement(d.studentUserId, {
            gradeLevelId: d.toGradeLevelId,
            feeCohort: "RETURNING",
          });
        } else if (d.outcome === "REPEAT") {
          await patchIdentityUserPlacement(d.studentUserId, {
            gradeLevelId: d.fromGradeLevelId,
            feeCohort: "RETURNING",
          });
        } else if (d.outcome === "GRADUATED" || d.outcome === "DO_NOT_RETURN") {
          // Leave grade; finance/registrar may deactivate separately.
        }

        if (d.fromClassroomId && d.fromClassroomId !== d.toClassroomId) {
          await removeClassroomMember(d.fromClassroomId, d.studentUserId);
        }
        if (d.toClassroomId && (d.outcome === "PROMOTED" || d.outcome === "REPEAT")) {
          await addClassroomMember(d.toClassroomId, d.studentUserId, "STUDENT");
        }
      } catch (err: any) {
        errors.push(`${d.studentUserId}: ${err.message || err}`);
      }
    }
    if (errors.length) {
      throw httpError(`Commit partially failed:\n${errors.slice(0, 8).join("\n")}`, 502);
    }

    const [updated] = await prisma.$transaction([
      prisma.promotionRun.update({
        where: { id: runId },
        data: {
          status: "COMMITTED",
          committedAt: new Date(),
          committedByUserId: actorUserId,
        },
        include: { decisions: true },
      }),
      prisma.yearCensusSnapshot.update({
        where: { id: run.censusSnapshotId },
        data: { lockedAt: new Date() },
      }),
    ]);
    const promotedCount = run.decisions.filter((d) => d.outcome === "PROMOTED").length;
    return {
      ...updated,
      financeHandoff: {
        promotedCount,
        feeCohort: "RETURNING",
        feesPath: `/fees?feeCohort=RETURNING&fromPromotionRun=${runId}`,
      },
    };
  },

  async getStatement(schoolId: string, schoolYearKey: string, runId?: string) {
    const yearKey = normalizeYearKey(schoolYearKey);
    const census = await prisma.yearCensusSnapshot.findUnique({
      where: { schoolId_schoolYearKey: { schoolId, schoolYearKey: yearKey } },
      include: { rows: true },
    });
    if (!census) throw httpError("No opening census for this school year", 404);

    let run =
      runId
        ? await prisma.promotionRun.findFirst({
            where: { id: runId, schoolId, schoolYearKey: yearKey },
            include: { decisions: true },
          })
        : await prisma.promotionRun.findFirst({
            where: { schoolId, schoolYearKey: yearKey, status: "COMMITTED" },
            orderBy: { committedAt: "desc" },
            include: { decisions: true },
          });

    if (!run) {
      run = await prisma.promotionRun.findFirst({
        where: { schoolId, schoolYearKey: yearKey },
        orderBy: { createdAt: "desc" },
        include: { decisions: true },
      });
    }

    const [grades, divisions, classrooms] = await Promise.all([
      prisma.gradeLevel.findMany({ where: { schoolId } }),
      prisma.division.findMany({ where: { schoolId } }),
      listClassroomsBySchool(schoolId),
    ]);

    const labels = {
      gradeName: Object.fromEntries(grades.map((g) => [g.id, g.name])),
      divisionName: Object.fromEntries(divisions.map((d) => [d.id, d.name])),
      classroomName: Object.fromEntries(classrooms.map((c) => [c.id, c.name])),
      divisionByGrade: Object.fromEntries(grades.map((g) => [g.id, g.divisionId])),
    };

    const matrix = assemblePromotionStatementMatrix(
      census.rows.map((r) => ({
        studentUserId: r.studentUserId,
        gradeLevelId: r.gradeLevelId,
        divisionId: r.divisionId,
        classroomId: r.classroomId,
        gender: r.gender,
      })),
      (run?.decisions || []).map((d) => ({
        studentUserId: d.studentUserId,
        outcome: d.outcome,
      })),
      labels
    );

    return {
      schoolYearKey: yearKey,
      draft: !run || run.status !== "COMMITTED",
      run: run
        ? {
            id: run.id,
            status: run.status,
            committedAt: run.committedAt,
          }
        : null,
      census: {
        id: census.id,
        capturedAt: census.capturedAt,
        lockedAt: census.lockedAt,
        rowCount: census.rows.length,
      },
      school: matrix.school,
      divisions: matrix.divisions,
      promotedUserIds:
        run?.decisions.filter((d) => d.outcome === "PROMOTED").map((d) => d.studentUserId) || [],
    };
  },

  /**
   * Resolve a returning student's locked "next grade" for re-registration.
   * Uses the latest promotion decision for the student (promotion-aware):
   *  - PROMOTED          → toGradeLevelId (locked)
   *  - REPEAT            → fromGradeLevelId (locked to same grade)
   *  - GRADUATED         → current grade (locked, but not returning)
   *  - DO_NOT_RETURN     → not allowed to return
   *  - no decision       → fall back to student's current grade, NOT locked
   */
  async resolveStudentNextGrade(schoolId: string, studentUserId: string, currentGradeLevelId?: string | null) {
    const run = await prisma.promotionRun.findFirst({
      where: { schoolId, status: "COMMITTED" },
      orderBy: { committedAt: "desc" },
      include: { decisions: { where: { studentUserId } } },
    });
    const decision =
      run?.decisions?.find((d) => d.studentUserId === studentUserId) ||
      (await this.latestDecisionFallback(schoolId, studentUserId));

    if (decision) {
      if (decision.outcome === "PROMOTED" && decision.toGradeLevelId) {
        return { gradeLevelId: decision.toGradeLevelId, locked: true, outcome: "PROMOTED" };
      }
      if (decision.outcome === "REPEAT") {
        return {
          gradeLevelId: decision.fromGradeLevelId || currentGradeLevelId || null,
          locked: true,
          outcome: "REPEAT",
        };
      }
      if (decision.outcome === "GRADUATED") {
        return {
          gradeLevelId: decision.fromGradeLevelId || currentGradeLevelId || null,
          locked: true,
          outcome: "GRADUATED",
          allowReturn: false,
        };
      }
      if (decision.outcome === "DO_NOT_RETURN") {
        return { gradeLevelId: null, locked: false, outcome: "DO_NOT_RETURN", allowReturn: false };
      }
    }
    return { gradeLevelId: currentGradeLevelId || null, locked: false, outcome: "UNKNOWN" };
  },

  async latestDecisionFallback(schoolId: string, studentUserId: string) {
    const run = await prisma.promotionRun.findFirst({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      include: { decisions: { where: { studentUserId } } },
    });
    return run?.decisions?.find((d) => d.studentUserId === studentUserId) || null;
  },
};
