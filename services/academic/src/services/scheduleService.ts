import prisma from "../lib/prisma";
import { getClassroomById, getClassroomsByMember } from "../lib/classroomClient";
import { assertParentLinked, getIdentityUser, getIdentityUsersByIds, getParentChildren } from "../lib/identityClient";
import { eachYmd, isWeekendYmd, NON_INSTRUCTION_CATEGORIES } from "../lib/schoolDay";
import {
  DEFAULT_BELL_PERIODS,
  findBellPeriodOverlaps,
  findScheduleConflicts,
  isEffectiveOn,
  isValidHm,
  isValidIsoWeekday,
  isoWeekdayFromYmd,
  timesOverlap,
  type ConflictCandidate,
  type ScheduleConflict,
} from "../lib/scheduleHelpers";

export type ScheduleUser = {
  id: string;
  schoolId: string;
  role: string;
  capabilities?: string[] | null;
};

const WRITE_ROLES = new Set(["SCHOOL_ADMIN", "PRINCIPAL", "VPI"]);
const SCHOOL_WIDE_READ = new Set([
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
  "COUNSELOR",
  "IT_ADMIN",
]);

function httpError(message: string, status: number) {
  const err: any = new Error(message);
  err.status = status;
  return err;
}

function mapPeriod(p: any) {
  return {
    id: p.id,
    bellScheduleId: p.bellScheduleId,
    schoolId: p.schoolId,
    periodNumber: p.periodNumber,
    label: p.label,
    shortCode: p.shortCode,
    startTime: p.startTime,
    endTime: p.endTime,
    orderIndex: p.orderIndex,
  };
}

function mapBell(row: any) {
  return {
    id: row.id,
    schoolId: row.schoolId,
    schoolYearId: row.schoolYearId,
    name: row.name,
    isActive: row.isActive,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    periods: (row.periods || []).map(mapPeriod),
  };
}

function mapEntry(row: any) {
  const period = row.schedulePeriod;
  return {
    id: row.id,
    schoolId: row.schoolId,
    bellScheduleId: row.bellScheduleId,
    classroomId: row.classroomId,
    classroomName: row.classroomName,
    teacherId: row.teacherId,
    teacherName: row.teacherName,
    subjectId: row.subjectId,
    subjectName: row.subjectName,
    dayOfWeek: row.dayOfWeek,
    schedulePeriodId: row.schedulePeriodId,
    periodLabel: period?.label ?? null,
    periodShortCode: period?.shortCode ?? null,
    startTime: period?.startTime ?? null,
    endTime: period?.endTime ?? null,
    effectiveFrom: row.effectiveFrom || "",
    effectiveTo: row.effectiveTo || "",
    locationOverride: row.locationOverride,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function resolveVisibilityClassroomIds(
  user: ScheduleUser,
  opts?: { studentId?: string }
): Promise<{ schoolWide: boolean; classroomIds: string[] | null; teacherId: string | null }> {
  if (SCHOOL_WIDE_READ.has(user.role)) {
    return { schoolWide: true, classroomIds: null, teacherId: null };
  }

  if (user.role === "TEACHER") {
    const rooms = await getClassroomsByMember(user.id, ["TEACHER", "CO_TEACHER"], user.schoolId);
    return {
      schoolWide: false,
      classroomIds: rooms.map((r) => r.id),
      teacherId: user.id,
    };
  }

  if (user.role === "STUDENT") {
    const rooms = await getClassroomsByMember(user.id, ["STUDENT"], user.schoolId);
    return { schoolWide: false, classroomIds: rooms.map((r) => r.id), teacherId: null };
  }

  if (user.role === "PARENT") {
    const studentId = opts?.studentId;
    if (studentId) {
      const linked = await assertParentLinked(user.id, studentId);
      if (!linked) throw httpError("Not linked to this student", 403);
      const rooms = await getClassroomsByMember(studentId, ["STUDENT"], user.schoolId);
      return { schoolWide: false, classroomIds: rooms.map((r) => r.id), teacherId: null };
    }
    const children = await getParentChildren(user.id);
    const allIds = new Set<string>();
    await Promise.all(
      children.map(async (child) => {
        const rooms = await getClassroomsByMember(child.id, ["STUDENT"], user.schoolId);
        rooms.forEach((r) => allIds.add(r.id));
      })
    );
    return { schoolWide: false, classroomIds: [...allIds], teacherId: null };
  }

  return { schoolWide: false, classroomIds: [], teacherId: null };
}

function entryVisible(
  entry: { classroomId: string; teacherId: string },
  scope: { schoolWide: boolean; classroomIds: string[] | null; teacherId: string | null }
): boolean {
  if (scope.schoolWide) return true;
  if (scope.teacherId && entry.teacherId === scope.teacherId) return true;
  if (scope.classroomIds && scope.classroomIds.includes(entry.classroomId)) return true;
  return false;
}

export const scheduleService = {
  canWrite(role: string, capabilities?: string[] | null) {
    if (Array.isArray(capabilities)) {
      return capabilities.includes("action.schedules.manage");
    }
    return WRITE_ROLES.has(role);
  },

  async listBellSchedules(schoolId: string) {
    const rows = await prisma.bellSchedule.findMany({
      where: { schoolId },
      include: { periods: { orderBy: { orderIndex: "asc" } } },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    });
    return rows.map(mapBell);
  },

  async getBellSchedule(schoolId: string, id: string) {
    const row = await prisma.bellSchedule.findFirst({
      where: { id, schoolId },
      include: { periods: { orderBy: { orderIndex: "asc" } } },
    });
    if (!row) throw httpError("Bell schedule not found", 404);
    return mapBell(row);
  },

  async createBellSchedule(
    user: ScheduleUser,
    input: { name?: string; schoolYearId?: string | null; withDefaults?: boolean }
  ) {
    if (!this.canWrite(user.role, user.capabilities)) throw httpError("Forbidden", 403);
    const name = (input.name || "Default bell schedule").trim() || "Default bell schedule";
    const row = await prisma.bellSchedule.create({
      data: {
        schoolId: user.schoolId,
        schoolYearId: input.schoolYearId || null,
        name,
        isActive: true,
        createdById: user.id,
        periods:
          input.withDefaults === false
            ? undefined
            : {
                create: DEFAULT_BELL_PERIODS.map((p) => ({
                  schoolId: user.schoolId,
                  ...p,
                })),
              },
      },
      include: { periods: { orderBy: { orderIndex: "asc" } } },
    });
    return mapBell(row);
  },

  async ensureDefaultBellSchedule(user: ScheduleUser) {
    const existing = await prisma.bellSchedule.findFirst({
      where: { schoolId: user.schoolId, isActive: true },
      include: { periods: { orderBy: { orderIndex: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
    if (existing) return mapBell(existing);
    if (!this.canWrite(user.role, user.capabilities)) throw httpError("No bell schedule configured", 404);
    return this.createBellSchedule(user, { name: "Default bell schedule", withDefaults: true });
  },

  async updateBellSchedule(
    user: ScheduleUser,
    id: string,
    input: { name?: string; isActive?: boolean; schoolYearId?: string | null }
  ) {
    if (!this.canWrite(user.role, user.capabilities)) throw httpError("Forbidden", 403);
    const existing = await prisma.bellSchedule.findFirst({ where: { id, schoolId: user.schoolId } });
    if (!existing) throw httpError("Bell schedule not found", 404);
    const row = await prisma.bellSchedule.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() || existing.name } : {}),
        ...(input.isActive !== undefined ? { isActive: Boolean(input.isActive) } : {}),
        ...(input.schoolYearId !== undefined ? { schoolYearId: input.schoolYearId } : {}),
      },
      include: { periods: { orderBy: { orderIndex: "asc" } } },
    });
    return mapBell(row);
  },

  async deleteBellSchedule(user: ScheduleUser, id: string) {
    if (!this.canWrite(user.role, user.capabilities)) throw httpError("Forbidden", 403);
    const existing = await prisma.bellSchedule.findFirst({ where: { id, schoolId: user.schoolId } });
    if (!existing) throw httpError("Bell schedule not found", 404);
    await prisma.bellSchedule.delete({ where: { id } });
    return { ok: true };
  },

  async replacePeriods(
    user: ScheduleUser,
    bellScheduleId: string,
    periods: Array<{
      periodNumber: number;
      label: string;
      shortCode: string;
      startTime: string;
      endTime: string;
      orderIndex?: number;
    }>
  ) {
    if (!this.canWrite(user.role, user.capabilities)) throw httpError("Forbidden", 403);
    const bell = await prisma.bellSchedule.findFirst({
      where: { id: bellScheduleId, schoolId: user.schoolId },
    });
    if (!bell) throw httpError("Bell schedule not found", 404);
    if (!Array.isArray(periods) || periods.length === 0) {
      throw httpError("At least one bell period is required", 400);
    }
    for (const p of periods) {
      if (!p.label?.trim() || !p.shortCode?.trim()) {
        throw httpError("Each period needs label and shortCode", 400);
      }
      if (!isValidHm(p.startTime) || !isValidHm(p.endTime)) {
        throw httpError("Each period needs valid startTime/endTime (HH:mm)", 400);
      }
      const sm = p.startTime;
      const em = p.endTime;
      if (sm >= em) throw httpError(`Period ${p.label}: startTime must be before endTime`, 400);
    }

    const overlaps = findBellPeriodOverlaps(periods);
    if (overlaps.length) {
      throw Object.assign(httpError(`Bell periods overlap: ${overlaps[0].message}`, 400), {
        conflicts: overlaps,
        code: "PERIOD_OVERLAP",
      });
    }

    const row = await prisma.$transaction(async (tx) => {
      await tx.timetableEntry.deleteMany({ where: { bellScheduleId } });
      await tx.schedulePeriod.deleteMany({ where: { bellScheduleId } });
      await tx.schedulePeriod.createMany({
        data: periods.map((p, i) => ({
          bellScheduleId,
          schoolId: user.schoolId,
          periodNumber: Number(p.periodNumber) || i + 1,
          label: p.label.trim(),
          shortCode: p.shortCode.trim(),
          startTime: p.startTime,
          endTime: p.endTime,
          orderIndex: p.orderIndex ?? i,
        })),
      });
      return tx.bellSchedule.findFirst({
        where: { id: bellScheduleId },
        include: { periods: { orderBy: { orderIndex: "asc" } } },
      });
    });
    return mapBell(row);
  },

  async updatePeriod(
    user: ScheduleUser,
    periodId: string,
    input: {
      label?: string;
      shortCode?: string;
      startTime?: string;
      endTime?: string;
    }
  ) {
    if (!this.canWrite(user.role, user.capabilities)) throw httpError("Forbidden", 403);
    const existing = await prisma.schedulePeriod.findFirst({
      where: { id: periodId, schoolId: user.schoolId },
      include: { bellSchedule: { include: { periods: { orderBy: { orderIndex: "asc" } } } } },
    });
    if (!existing?.bellSchedule) throw httpError("Schedule period not found", 404);

    const label = input.label !== undefined ? input.label.trim() : existing.label;
    const shortCode = input.shortCode !== undefined ? input.shortCode.trim() : existing.shortCode;
    const startTime = input.startTime !== undefined ? input.startTime : existing.startTime;
    const endTime = input.endTime !== undefined ? input.endTime : existing.endTime;

    if (!label || !shortCode) throw httpError("Period needs label and shortCode", 400);
    if (!isValidHm(startTime) || !isValidHm(endTime)) {
      throw httpError("Valid startTime/endTime (HH:mm) required", 400);
    }
    if (startTime >= endTime) throw httpError("startTime must be before endTime", 400);

    for (const sibling of existing.bellSchedule.periods) {
      if (sibling.id === periodId) continue;
      if (timesOverlap(startTime, endTime, sibling.startTime, sibling.endTime)) {
        throw httpError(`Period overlaps ${sibling.label} (${sibling.startTime}–${sibling.endTime})`, 400);
      }
    }

    await prisma.schedulePeriod.update({
      where: { id: periodId },
      data: { label, shortCode, startTime, endTime },
    });

    const row = await prisma.bellSchedule.findFirst({
      where: { id: existing.bellScheduleId },
      include: { periods: { orderBy: { orderIndex: "asc" } } },
    });
    return mapBell(row);
  },

  async listTimetable(
    user: ScheduleUser,
    query: {
      bellScheduleId?: string;
      classroomId?: string;
      teacherId?: string;
      studentId?: string;
    }
  ) {
    const scope = await resolveVisibilityClassroomIds(user, { studentId: query.studentId });
    const where: any = { schoolId: user.schoolId };
    if (query.bellScheduleId) where.bellScheduleId = query.bellScheduleId;
    if (query.classroomId) where.classroomId = query.classroomId;
    if (query.teacherId) where.teacherId = query.teacherId;

    const rows = await prisma.timetableEntry.findMany({
      where,
      include: { schedulePeriod: true },
      orderBy: [{ dayOfWeek: "asc" }, { schedulePeriod: { orderIndex: "asc" } }],
    });

    return rows.map(mapEntry).filter((e) => entryVisible(e, scope));
  },

  async validateTimetable(
    user: ScheduleUser,
    input: {
      bellScheduleId: string;
      entries: Array<{
        classroomId: string;
        teacherId: string;
        dayOfWeek: number;
        schedulePeriodId: string;
        id?: string;
      }>;
      /** When true, also merge existing DB entries outside the payload (full-school check). */
      includeExisting?: boolean;
    }
  ): Promise<{ ok: boolean; conflicts: ScheduleConflict[] }> {
    if (!this.canWrite(user.role, user.capabilities)) throw httpError("Forbidden", 403);
    const bell = await prisma.bellSchedule.findFirst({
      where: { id: input.bellScheduleId, schoolId: user.schoolId },
      include: { periods: true },
    });
    if (!bell) throw httpError("Bell schedule not found", 404);
    const periodById = new Map(bell.periods.map((p) => [p.id, p]));

    const candidates: ConflictCandidate[] = [];
    for (const e of input.entries || []) {
      const period = periodById.get(e.schedulePeriodId);
      candidates.push({
        id: e.id,
        classroomId: e.classroomId,
        teacherId: e.teacherId,
        dayOfWeek: e.dayOfWeek,
        schedulePeriodId: e.schedulePeriodId,
        startTime: period?.startTime,
        endTime: period?.endTime,
      });
    }

    if (input.includeExisting) {
      const existing = await prisma.timetableEntry.findMany({
        where: { schoolId: user.schoolId, bellScheduleId: input.bellScheduleId },
        include: { schedulePeriod: true },
      });
      const payloadKeys = new Set(
        (input.entries || []).map(
          (e) => `${e.classroomId}|${e.dayOfWeek}|${e.schedulePeriodId}`
        )
      );
      for (const row of existing) {
        const key = `${row.classroomId}|${row.dayOfWeek}|${row.schedulePeriodId}`;
        if (payloadKeys.has(key)) continue;
        candidates.push({
          id: row.id,
          classroomId: row.classroomId,
          teacherId: row.teacherId,
          dayOfWeek: row.dayOfWeek,
          schedulePeriodId: row.schedulePeriodId,
          startTime: row.schedulePeriod.startTime,
          endTime: row.schedulePeriod.endTime,
        });
      }
    }

    const conflicts = findScheduleConflicts(candidates);
    return { ok: conflicts.length === 0, conflicts };
  },

  async putTimetable(
    user: ScheduleUser,
    input: {
      bellScheduleId: string;
      /** When set, replace all entries for this classroom in the bell schedule. */
      classroomId?: string;
      effectiveFrom?: string;
      effectiveTo?: string;
      entries: Array<{
        classroomId: string;
        teacherId: string;
        subjectId?: string | null;
        dayOfWeek: number;
        schedulePeriodId: string;
        locationOverride?: string | null;
      }>;
      skipConflictCheck?: boolean;
    }
  ) {
    if (!this.canWrite(user.role, user.capabilities)) throw httpError("Forbidden", 403);
    const bell = await prisma.bellSchedule.findFirst({
      where: { id: input.bellScheduleId, schoolId: user.schoolId },
      include: { periods: true },
    });
    if (!bell) throw httpError("Bell schedule not found", 404);
    const periodIds = new Set(bell.periods.map((p) => p.id));
    const entries = input.entries || [];

    for (const e of entries) {
      if (!isValidIsoWeekday(e.dayOfWeek)) {
        throw httpError("dayOfWeek must be 1 (Mon) … 7 (Sun)", 400);
      }
      if (!periodIds.has(e.schedulePeriodId)) {
        throw httpError("schedulePeriodId does not belong to this bell schedule", 400);
      }
      if (!e.classroomId || !e.teacherId) {
        throw httpError("classroomId and teacherId are required", 400);
      }
    }

    if (!input.skipConflictCheck) {
      const validation = await this.validateTimetable(user, {
        bellScheduleId: input.bellScheduleId,
        entries: entries.map((e) => ({
          classroomId: e.classroomId,
          teacherId: e.teacherId,
          dayOfWeek: e.dayOfWeek,
          schedulePeriodId: e.schedulePeriodId,
        })),
        includeExisting: !input.classroomId,
      });
      // When scoped to one classroom, still check teacher conflicts vs rest of school
      if (input.classroomId) {
        const withExisting = await this.validateTimetable(user, {
          bellScheduleId: input.bellScheduleId,
          entries: entries.map((e) => ({
            classroomId: e.classroomId,
            teacherId: e.teacherId,
            dayOfWeek: e.dayOfWeek,
            schedulePeriodId: e.schedulePeriodId,
          })),
          includeExisting: true,
        });
        const blocking = withExisting.conflicts.filter(
          (c) => c.code === "TEACHER_DOUBLE" || c.code === "CLASSROOM_DOUBLE"
        );
        if (blocking.length) {
          throw Object.assign(httpError("Schedule conflicts", 409), { conflicts: blocking });
        }
      } else if (!validation.ok) {
        throw Object.assign(httpError("Schedule conflicts", 409), {
          conflicts: validation.conflicts,
        });
      }
    }

    const classroomIds = [...new Set(entries.map((e) => e.classroomId))];
    if (input.classroomId) classroomIds.push(input.classroomId);
    const classroomMap = new Map<string, Awaited<ReturnType<typeof getClassroomById>>>();
    await Promise.all(
      [...new Set(classroomIds)].map(async (id) => {
        const room = await getClassroomById(id);
        if (!room || room.schoolId !== user.schoolId) {
          throw httpError(`Classroom not found: ${id}`, 400);
        }
        classroomMap.set(id, room);
      })
    );

    const teacherIds = [...new Set(entries.map((e) => e.teacherId))];
    const teachers = await getIdentityUsersByIds(teacherIds);
    for (const tid of teacherIds) {
      const t = teachers.get(tid);
      if (!t) throw httpError(`Teacher not found: ${tid}`, 400);
      if (t.role && t.role !== "TEACHER") {
        throw httpError(`User ${t.name || tid} is not a TEACHER`, 400);
      }
    }

    const subjectIds = [
      ...new Set(entries.map((e) => e.subjectId).filter(Boolean) as string[]),
    ];
    const subjects =
      subjectIds.length > 0
        ? await prisma.subject.findMany({
            where: { schoolId: user.schoolId, id: { in: subjectIds } },
          })
        : [];
    const subjectById = new Map(subjects.map((s) => [s.id, s]));

    const effectiveFrom = (input.effectiveFrom || "").trim();
    const effectiveTo = (input.effectiveTo || "").trim();
    if (effectiveFrom && !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      throw httpError("effectiveFrom must be YYYY-MM-DD", 400);
    }
    if (effectiveTo && !/^\d{4}-\d{2}-\d{2}$/.test(effectiveTo)) {
      throw httpError("effectiveTo must be YYYY-MM-DD", 400);
    }

    const replaceClassroomId = input.classroomId;
    const created = await prisma.$transaction(async (tx) => {
      if (replaceClassroomId) {
        await tx.timetableEntry.deleteMany({
          where: {
            schoolId: user.schoolId,
            bellScheduleId: input.bellScheduleId,
            classroomId: replaceClassroomId,
          },
        });
      } else {
        await tx.timetableEntry.deleteMany({
          where: { schoolId: user.schoolId, bellScheduleId: input.bellScheduleId },
        });
      }

      if (entries.length === 0) return [];

      const data = entries.map((e) => {
        const room = classroomMap.get(e.classroomId)!;
        const teacher = teachers.get(e.teacherId)!;
        const subjectId = e.subjectId || room.subjectId || null;
        const subject = subjectId ? subjectById.get(subjectId) : null;
        return {
          schoolId: user.schoolId,
          bellScheduleId: input.bellScheduleId,
          classroomId: e.classroomId,
          classroomName: room.name,
          teacherId: e.teacherId,
          teacherName: teacher.name || "",
          subjectId,
          subjectName: subject?.name || null,
          dayOfWeek: e.dayOfWeek,
          schedulePeriodId: e.schedulePeriodId,
          effectiveFrom,
          effectiveTo,
          locationOverride: e.locationOverride?.trim() || null,
          createdById: user.id,
        };
      });

      await tx.timetableEntry.createMany({ data });
      return tx.timetableEntry.findMany({
        where: {
          schoolId: user.schoolId,
          bellScheduleId: input.bellScheduleId,
          ...(replaceClassroomId ? { classroomId: replaceClassroomId } : {}),
        },
        include: { schedulePeriod: true },
        orderBy: [{ dayOfWeek: "asc" }, { schedulePeriod: { orderIndex: "asc" } }],
      });
    });

    return created.map(mapEntry);
  },

  async deleteEntry(user: ScheduleUser, id: string) {
    if (!this.canWrite(user.role, user.capabilities)) throw httpError("Forbidden", 403);
    const existing = await prisma.timetableEntry.findFirst({
      where: { id, schoolId: user.schoolId },
    });
    if (!existing) throw httpError("Timetable entry not found", 404);
    await prisma.timetableEntry.delete({ where: { id } });
    return { ok: true };
  },

  async copyClassroomSchedule(
    user: ScheduleUser,
    input: { bellScheduleId: string; fromClassroomId: string; toClassroomId: string }
  ) {
    if (!this.canWrite(user.role, user.capabilities)) throw httpError("Forbidden", 403);
    if (input.fromClassroomId === input.toClassroomId) {
      throw httpError("Source and target classrooms must differ", 400);
    }
    const source = await prisma.timetableEntry.findMany({
      where: {
        schoolId: user.schoolId,
        bellScheduleId: input.bellScheduleId,
        classroomId: input.fromClassroomId,
      },
    });
    const toRoom = await getClassroomById(input.toClassroomId);
    if (!toRoom || toRoom.schoolId !== user.schoolId) {
      throw httpError("Target classroom not found", 400);
    }
    const teacherId = toRoom.ownerTeacherId;
    const teacher = await getIdentityUser(teacherId);
    if (!teacher) throw httpError("Target classroom has no valid teacher", 400);

    return this.putTimetable(user, {
      bellScheduleId: input.bellScheduleId,
      classroomId: input.toClassroomId,
      entries: source.map((e) => ({
        classroomId: input.toClassroomId,
        teacherId,
        subjectId: toRoom.subjectId || e.subjectId,
        dayOfWeek: e.dayOfWeek,
        schedulePeriodId: e.schedulePeriodId,
        locationOverride: e.locationOverride,
      })),
    });
  },

  /**
   * Expand timetable into concrete Class calendar occurrences for [from, to].
   * Skips weekends and Holiday / Non-Instruction days.
   */
  async expandForCalendar(
    user: ScheduleUser,
    from: string,
    to: string,
    opts?: { studentId?: string }
  ): Promise<
    Array<{
      id: string;
      title: string;
      description: string;
      date: string;
      time: string;
      category: "Class";
      location: string;
      priority: "medium";
      actionLabel: string;
      actionPath: string;
      isCustom: false;
    }>
  > {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      throw httpError("from and to must be YYYY-MM-DD", 400);
    }

    const scope = await resolveVisibilityClassroomIds(user, { studentId: opts?.studentId });
    if (!scope.schoolWide && scope.classroomIds?.length === 0 && !scope.teacherId) {
      return [];
    }

    const entries = await prisma.timetableEntry.findMany({
      where: { schoolId: user.schoolId },
      include: { schedulePeriod: true },
    });
    const visible = entries.filter((e) => entryVisible(e, scope));
    if (visible.length === 0) return [];

    const blocks = await prisma.schoolCalendarEvent.findMany({
      where: {
        schoolId: user.schoolId,
        date: { gte: from, lte: to },
        category: { in: [...NON_INSTRUCTION_CATEGORIES] },
      },
      select: { date: true },
    });
    const blocked = new Set(blocks.map((b) => b.date));
    const days = eachYmd(from, to);
    const out: Array<{
      id: string;
      title: string;
      description: string;
      date: string;
      time: string;
      category: "Class";
      location: string;
      priority: "medium";
      actionLabel: string;
      actionPath: string;
      isCustom: false;
    }> = [];

    for (const date of days) {
      if (isWeekendYmd(date) || blocked.has(date)) continue;
      const dow = isoWeekdayFromYmd(date);
      for (const e of visible) {
        if (e.dayOfWeek !== dow) continue;
        if (!isEffectiveOn(date, e.effectiveFrom || "", e.effectiveTo || "")) continue;
        const subject = e.subjectName || "Class";
        const room = e.classroomName || "Classroom";
        out.push({
          id: `class-${e.id}-${date}`,
          title: `${subject} · ${room}`,
          description: `Taught by ${e.teacherName || "Teacher"}`,
          date,
          time: `${e.schedulePeriod.startTime}–${e.schedulePeriod.endTime}`,
          category: "Class",
          location: e.locationOverride || room,
          priority: "medium",
          actionLabel: "Open classroom",
          actionPath: `classroom/${e.classroomId}`,
          isCustom: false,
        });
      }
    }

    return out;
  },
};
