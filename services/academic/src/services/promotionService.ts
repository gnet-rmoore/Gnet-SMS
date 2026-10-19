import prisma from "../lib/prisma";
import {
  getIdentitySchool,
  getIdentityUsersByIds,
  listIdentityStudents,
  patchIdentityUserPlacement,
} from "../lib/identityClient";
import {
  addClassroomMember,
  bulkAssignStudents,
  ensureYearClassGroups,
  getClassroomMembers,
  listClassroomsBySchool,
  removeClassroomMember,
} from "../lib/classroomClient";
import { PROMOTION_OUTCOMES, type PromotionOutcome } from "../domain/yearTransition";
import { assemblePromotionStatementMatrix } from "../lib/promotionStatementMath";
import { resultsService } from "./resultsService";
import { getAttendanceSummary, getDisciplineSummary } from "../lib/summaryClients";
import { rankBestAttendance, rankTopPerformers, summarizeAttendance } from "../lib/resultsSummaryMath";

function httpError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
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

  async createRun(
    schoolId: string,
    schoolYearKey: string,
    actorUserId: string,
    opts: { autoOutcome?: boolean } = {}
  ) {
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

    let summaries: Map<string, { passed: boolean }> | null = null;
    if (opts.autoOutcome) {
      const result = await resultsService.getStudentSummaries(schoolId, yearKey);
      summaries = result.summaries;
    }

    const run = await prisma.promotionRun.create({
      data: {
        schoolId,
        schoolYearKey: yearKey,
        status: "DRAFT",
        censusSnapshotId: census.id,
        createdByUserId: actorUserId,
        decisions: {
          create: census.rows.map((row) => {
            const nextGrade = row.gradeLevelId
              ? nextById.get(row.gradeLevelId) || null
              : null;
            let outcome: PromotionOutcome = "PROMOTED";
            let toGradeLevelId = nextGrade;

            if (opts.autoOutcome) {
              if (!nextGrade) {
                outcome = "GRADUATED";
                toGradeLevelId = null;
              } else {
                const summary = summaries?.get(row.studentUserId);
                if (summary && !summary.passed) {
                  outcome = "REPEAT";
                  toGradeLevelId = row.gradeLevelId;
                }
              }
            }

            return {
              studentUserId: row.studentUserId,
              outcome,
              fromGradeLevelId: row.gradeLevelId,
              toGradeLevelId,
              fromClassroomId: row.classroomId,
              toClassroomId: null,
            };
          }),
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
      if (outcome === "GRADUATED" || outcome === "DO_NOT_RETURN" || outcome === "DROPPED_OUT") {
        toGrade = null;
      }
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

  /**
   * One-click year transition:
   *  1. resolve (or create) the target AcademicYear,
   *  2. create/refresh the promotion run with automatic pass/fail outcomes,
   *  3. clone the outgoing year's homeroom section structure into the target
   *     year as unassigned class groups (ownerTeacherId = null),
   *  4. distribute continuing students across those sections,
   *  5. optionally commit (moves Identity placement + classroom membership).
   *
   * Teachers/staff are school-level Identity users and are implicitly carried
   * over; they are intentionally not attached to any new class/subject.
   */
  async transitionYear(
    schoolId: string,
    actorUserId: string,
    input: {
      fromYearKey?: string;
      toYearKey?: string;
      targetYearKey?: string;
      toYearLabel?: string | null;
      startsAt?: string | null;
      endsAt?: string | null;
      autoOutcome?: boolean;
      commit?: boolean;
      runId?: string;
    }
  ) {
    const active = await prisma.academicYear.findFirst({
      where: { schoolId, status: "ACTIVE" },
      orderBy: { startsAt: "desc" },
    });
    const latestCensus = !input.fromYearKey && !active
      ? await prisma.yearCensusSnapshot.findFirst({
          where: { schoolId },
          orderBy: { capturedAt: "desc" },
        })
      : null;
    const fromKey = normalizeYearKey(
      input.fromYearKey || active?.yearKey || latestCensus?.schoolYearKey || ""
    );
    const toKey = normalizeYearKey(input.toYearKey || input.targetYearKey || "");
    if (fromKey === toKey) throw httpError("Target year must differ from the current year");

    const census = await prisma.yearCensusSnapshot.findUnique({
      where: { schoolId_schoolYearKey: { schoolId, schoolYearKey: fromKey } },
      include: { rows: true },
    });
    if (!census) throw httpError(`No opening census for ${fromKey}`, 404);

    let targetYear = await prisma.academicYear.findFirst({
      where: { schoolId, yearKey: toKey },
    });
    if (!targetYear) {
      targetYear = await prisma.academicYear.create({
        data: {
          schoolId,
          yearKey: toKey,
          label: input.toYearLabel || toKey,
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          status: "DRAFT",
        },
      });
    }
    const targetYearId = targetYear.id;

    let run = input.runId
      ? await prisma.promotionRun.findFirst({
          where: { id: input.runId, schoolId, schoolYearKey: fromKey },
          include: { decisions: true },
        })
      : await prisma.promotionRun.findFirst({
          where: { schoolId, schoolYearKey: fromKey, status: "DRAFT" },
          orderBy: { createdAt: "desc" },
          include: { decisions: true },
        });
    if (!run) {
      run = await this.createRun(schoolId, fromKey, actorUserId, {
        autoOutcome: input.autoOutcome !== false,
      });
    } else if (run.status !== "DRAFT") {
      throw httpError("Promotion run is already committed", 409);
    }

    const [grades, classrooms, students] = await Promise.all([
      prisma.gradeLevel.findMany({
        where: { schoolId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      listClassroomsBySchool(schoolId),
      listIdentityStudents(schoolId),
    ]);
    const gradeName = new Map(grades.map((g) => [g.id, g.name]));
    const studentName = new Map(students.map((s) => [s.id, s.name || s.id]));
    const roomName = new Map(classrooms.map((c) => [c.id, c.name]));

    const sectionsByGrade = new Map<string, Set<string>>();
    for (const row of census.rows) {
      if (!row.gradeLevelId || !row.classroomId) continue;
      const name = roomName.get(row.classroomId);
      if (!name) continue;
      let set = sectionsByGrade.get(row.gradeLevelId);
      if (!set) {
        set = new Set();
        sectionsByGrade.set(row.gradeLevelId, set);
      }
      set.add(name);
    }

    type Placement = { studentUserId: string; gradeLevelId: string };
    const placements: Placement[] = [];
    for (const d of run.decisions) {
      if (d.outcome === "PROMOTED" && d.toGradeLevelId) {
        placements.push({ studentUserId: d.studentUserId, gradeLevelId: d.toGradeLevelId });
      } else if (d.outcome === "REPEAT" && d.fromGradeLevelId) {
        placements.push({ studentUserId: d.studentUserId, gradeLevelId: d.fromGradeLevelId });
      }
    }

    const byGrade = new Map<string, Placement[]>();
    for (const p of placements) {
      const list = byGrade.get(p.gradeLevelId) || [];
      list.push(p);
      byGrade.set(p.gradeLevelId, list);
    }

    const groups: Array<{ gradeLevelId: string; name: string }> = [];
    const sectionNamesByGrade = new Map<string, string[]>();
    for (const gid of byGrade.keys()) {
      const cloned = [...(sectionsByGrade.get(gid) || [])].sort();
      const names = cloned.length ? cloned : [`${gradeName.get(gid) || "Grade"} A`];
      sectionNamesByGrade.set(gid, names);
      for (const name of names) groups.push({ gradeLevelId: gid, name });
    }

    const ensured = groups.length
      ? await ensureYearClassGroups(schoolId, targetYearId, groups)
      : { created: [], existing: [] };

    const allRooms = [...ensured.created, ...ensured.existing];
    const roomByKey = new Map(
      allRooms.map((r) => [`${r.gradeLevelId || "_"}|${r.name}`, r.id])
    );

    const buckets = groups.map((g) => ({
      gradeLevelId: g.gradeLevelId,
      name: g.name,
      classroomId: roomByKey.get(`${g.gradeLevelId}|${g.name}`) || null,
      count: 0,
    }));
    const assignments: Array<{ classroomId: string; studentUserId: string; role?: string }> = [];
    const decisionUpdates: Array<{ studentUserId: string; classroomId: string }> = [];
    const unassignedStudentIds: string[] = [];

    for (const [gid, list] of byGrade) {
      const gradeBuckets = buckets.filter((b) => b.gradeLevelId === gid && b.classroomId);
      if (!gradeBuckets.length) {
        unassignedStudentIds.push(...list.map((p) => p.studentUserId));
        continue;
      }
      const sorted = [...list].sort((a, b) =>
        String(studentName.get(a.studentUserId) || a.studentUserId).localeCompare(
          String(studentName.get(b.studentUserId) || b.studentUserId)
        )
      );
      for (const p of sorted) {
        const target = gradeBuckets.reduce((min, b) => (b.count < min.count ? b : min), gradeBuckets[0]);
        target.count += 1;
        assignments.push({ classroomId: target.classroomId!, studentUserId: p.studentUserId });
        decisionUpdates.push({
          studentUserId: p.studentUserId,
          classroomId: target.classroomId!,
        });
      }
    }

    if (assignments.length) {
      await bulkAssignStudents(schoolId, assignments);
      const runId = run.id;
      await prisma.$transaction(
        decisionUpdates.map((u) =>
          prisma.promotionDecision.update({
            where: {
              runId_studentUserId: { runId, studentUserId: u.studentUserId },
            },
            data: { toClassroomId: u.classroomId },
          })
        )
      );
    }

    const counts = run.decisions.reduce(
      (acc, d) => {
        const key = String(d.outcome || "").toLowerCase();
        if (key in acc) (acc as any)[key] += 1;
        return acc;
      },
      {
        promoted: 0,
        repeat: 0,
        graduated: 0,
        dropped_out: 0,
        do_not_return: 0,
      }
    );

    let committed: any = null;
    if (input.commit) {
      committed = await this.commitRun(schoolId, run.id, actorUserId);
    }

    return {
      fromYearKey: fromKey,
      toYearKey: toKey,
      targetYear: { id: targetYearId, yearKey: toKey, status: targetYear.status },
      run: {
        id: run.id,
        status: committed ? "COMMITTED" : run.status,
        decisions: run.decisions.length,
      },
      counts,
      homerooms: {
        created: ensured.created.length,
        existing: ensured.existing.length,
        total: allRooms.length,
      },
      assignedStudents: assignments.length,
      unassignedStudentIds,
      staff: {
        note: "Teachers and staff keep their school membership; new homerooms are created unassigned (no teacher, no subject rooms).",
      },
      committed,
    };
  },

  async getStatement(
    schoolId: string,
    schoolYearKey: string,
    opts: string | { runId?: string; scope?: string; periodId?: string } = {}
  ) {
    const options = typeof opts === "string" ? { runId: opts } : opts;
    const yearKey = normalizeYearKey(schoolYearKey);
    const scope = String(options.scope || "YEAR").toUpperCase() === "TERM" ? "TERM" : "YEAR";
    const census = await prisma.yearCensusSnapshot.findUnique({
      where: { schoolId_schoolYearKey: { schoolId, schoolYearKey: yearKey } },
      include: { rows: true },
    });
    if (!census) throw httpError("No opening census for this school year", 404);

    let run =
      options.runId
        ? await prisma.promotionRun.findFirst({
            where: { id: options.runId, schoolId, schoolYearKey: yearKey },
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

    const [year, period] = await Promise.all([
      prisma.academicYear.findFirst({ where: { schoolId, yearKey } }),
      options.periodId
        ? prisma.academicPeriod.findFirst({
            where: { id: options.periodId, schoolId },
            select: {
              id: true,
              label: true,
              shortCode: true,
              startDate: true,
              endDate: true,
            },
          })
        : Promise.resolve(null),
    ]);

    const usePeriod = scope === "TERM" && period;
    const windowFrom = usePeriod ? period.startDate : year?.startsAt ?? null;
    const windowTo = usePeriod ? period.endDate : year?.endsAt ?? null;
    const attendanceTo = windowTo
      ? new Date(windowTo.getTime() + 24 * 60 * 60 * 1000)
      : null;

    const [grades, divisions, classrooms, result, attendanceRows, discipline, schoolInfo] =
      await Promise.all([
        prisma.gradeLevel.findMany({ where: { schoolId } }),
        prisma.division.findMany({ where: { schoolId } }),
        listClassroomsBySchool(schoolId),
        resultsService.getStudentSummaries(schoolId, yearKey, {
          periodId: usePeriod ? period.id : null,
        }),
        getAttendanceSummary(schoolId, {
          from: windowFrom ? windowFrom.toISOString() : null,
          to: attendanceTo ? attendanceTo.toISOString() : null,
        }),
        getDisciplineSummary(schoolId, {
          from: windowFrom ? windowFrom.toISOString() : null,
          to: windowTo ? windowTo.toISOString() : null,
        }),
        getIdentitySchool(schoolId),
      ]);

    const labels = {
      gradeName: Object.fromEntries(grades.map((g) => [g.id, g.name])),
      divisionName: Object.fromEntries(divisions.map((d) => [d.id, d.name])),
      classroomName: Object.fromEntries(classrooms.map((c) => [c.id, c.name])),
      divisionByGrade: Object.fromEntries(grades.map((g) => [g.id, g.divisionId])),
    };

    const passFailByStudent = new Map<string, "PASS" | "FAIL">();
    for (const [id, s] of result.summaries) {
      passFailByStudent.set(id, s.passed ? "PASS" : "FAIL");
    }

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
      labels,
      {
        suspendedStudentIds: discipline.suspendedStudentIds,
        passFailByStudent,
      }
    );

    const topAcademic = rankTopPerformers(result.summaries.values(), 10);
    const topAttendance = rankBestAttendance(attendanceRows, { topN: 10, minRecords: 1 });
    const featuredIds = [
      ...new Set([
        ...topAcademic.map((t) => t.studentUserId),
        ...topAttendance.map((t) => t.studentUserId),
      ]),
    ];
    const users = await getIdentityUsersByIds(featuredIds);
    const censusByStudent = new Map(census.rows.map((r) => [r.studentUserId, r]));
    const nameFor = (id: string) => users.get(id)?.name || "Student";
    const gradeFor = (id: string) => {
      const row = censusByStudent.get(id);
      return row?.gradeLevelId ? labels.gradeName[row.gradeLevelId] || "Grade" : "No grade";
    };

    const attendanceTotals = attendanceRows.reduce(
      (acc, r) => {
        acc.present += r.present;
        acc.absent += r.absent;
        acc.late += r.late;
        acc.excused += r.excused;
        acc.total += r.total;
        return acc;
      },
      { present: 0, absent: 0, late: 0, excused: 0, total: 0 }
    );
    const averageAttendance = attendanceTotals.total
      ? round2(((attendanceTotals.present + attendanceTotals.late) / attendanceTotals.total) * 100)
      : 0;
    const scored = [...result.summaries.values()];
    const averageScore = scored.length
      ? round2(scored.reduce((a, s) => a + s.overallAverage, 0) / scored.length)
      : 0;

    return {
      schoolYearKey: yearKey,
      scope,
      draft: !run || run.status !== "COMMITTED",
      run: run
        ? {
            id: run.id,
            status: run.status,
            committedAt: run.committedAt,
          }
        : null,
      period: period
        ? {
            id: period.id,
            label: period.label,
            shortCode: period.shortCode,
            startDate: period.startDate,
            endDate: period.endDate,
          }
        : null,
      window: { from: windowFrom, to: windowTo },
      schoolInfo,
      census: {
        id: census.id,
        capturedAt: census.capturedAt,
        lockedAt: census.lockedAt,
        rowCount: census.rows.length,
      },
      totals: {
        totalStudentsBeginning: matrix.school.opening,
        maleStudents: matrix.school.male,
        femaleStudents: matrix.school.female,
        otherStudents: matrix.school.other,
        unknownGender: matrix.school.unknown,
        promoted: matrix.school.promoted,
        repeat: matrix.school.repeat,
        graduated: matrix.school.graduated,
        droppedOut: matrix.school.droppedOut,
        doNotReturn: matrix.school.doNotReturn,
        suspended: matrix.school.suspended,
        passed: matrix.school.passed,
        failed: matrix.school.failed,
      },
      academic: {
        passThreshold: result.threshold,
        averageScore,
        studentsWithResults: scored.length,
      },
      attendance: {
        present: attendanceTotals.present,
        absent: attendanceTotals.absent,
        late: attendanceTotals.late,
        excused: attendanceTotals.excused,
        records: attendanceTotals.total,
        averageRate: averageAttendance,
      },
      discipline: {
        suspendedCount: discipline.suspendedCount,
        totalSuspensionDays: discipline.totalSuspensionDays,
        students: discipline.suspendedStudents.slice(0, 25),
      },
      bestAcademicPerformers: topAcademic.map((t) => ({
        studentUserId: t.studentUserId,
        name: nameFor(t.studentUserId),
        gradeName: gradeFor(t.studentUserId),
        overallAverage: t.overallAverage,
        position: t.position,
      })),
      bestAttendance: topAttendance.map((t) => ({
        studentUserId: t.studentUserId,
        name: nameFor(t.studentUserId),
        gradeName: gradeFor(t.studentUserId),
        attendanceRate: t.attendanceRate,
        present: t.present,
        total: t.total,
      })),
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
      if (decision.outcome === "DROPPED_OUT") {
        return { gradeLevelId: null, locked: false, outcome: "DROPPED_OUT", allowReturn: false };
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
