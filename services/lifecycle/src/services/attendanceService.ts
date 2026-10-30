import prisma from "../lib/prisma";
import {
  getClassroomsMap,
  fetchGradeLevelsForSchool,
  checkInstructionalDay,
  upsertAttendanceCalendarEvent,
  assertClassroomTeacherAccess,
  getTeacherClassrooms,
} from "../lib/classroomClient";
import {
  getIdentityUsersMap,
  getParentChildIds,
  getIdentitySchool,
  getStudentParentIds,
} from "../lib/identityClient";
import { dayBoundsFromYmd, normalizeYmd, ymdInTimeZone } from "../lib/schoolDay";
import { notifyInAppMany } from "../lib/notifyInApp";

const VALID_STATUSES = new Set(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

function countStatuses(records: { status: string }[]) {
  let presentCount = 0;
  let absentCount = 0;
  for (const r of records) {
    if (r.status === "PRESENT" || r.status === "LATE") presentCount += 1;
    else if (r.status === "ABSENT") absentCount += 1;
  }
  return { presentCount, absentCount };
}

async function enrichSessions(sessions: any[]) {
  if (!sessions.length) return [];
  const classroomIds = sessions.map((s) => s.classroomId).filter(Boolean);
  const teacherIds = sessions.map((s) => s.teacherId).filter(Boolean);
  const studentIds = sessions.flatMap((s) =>
    (s.records || []).map((r: any) => r.studentId)
  );

  const [classrooms, users] = await Promise.all([
    getClassroomsMap(classroomIds),
    getIdentityUsersMap([...teacherIds, ...studentIds]),
  ]);

  return sessions.map((s) => ({
    ...s,
    classroom: s.classroomId
      ? {
          id: s.classroomId,
          name: classrooms[s.classroomId]?.name || "Classroom",
          code: classrooms[s.classroomId]?.classCode || null,
        }
      : null,
    teacher: s.teacherId
      ? {
          id: s.teacherId,
          name: users[s.teacherId]?.name || "Staff",
          email: users[s.teacherId]?.email || null,
        }
      : null,
    records: (s.records || []).map((r: any) => ({
      ...r,
      student: {
        id: r.studentId,
        name: users[r.studentId]?.name || "Student",
        email: users[r.studentId]?.email || null,
        photoUrl: (users[r.studentId] as any)?.photoUrl ?? null,
      },
    })),
  }));
}

export const attendanceService = {
  async getAttendanceBySchool(
    schoolId: string,
    viewer?: { id: string; role: string },
    opts?: {
      page?: number | string;
      pageSize?: number | string;
      classroomId?: string;
      from?: string;
      to?: string;
      status?: string;
      studentId?: string;
    }
  ) {
    const page = Math.max(1, Number(opts?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(opts?.pageSize) || 50));
    const viewerRole = viewer?.role;
    const viewerOnly = viewerRole === "STUDENT" || viewerRole === "PARENT";
    const date: { gte?: Date; lt?: Date } = {};
    if (opts?.from) {
      const { start } = dayBoundsFromYmd(normalizeYmd(opts.from));
      date.gte = start;
    }
    if (opts?.to) {
      const { end } = dayBoundsFromYmd(normalizeYmd(opts.to));
      date.lt = end;
    }
    if (opts?.from && opts?.to && date.gte && date.lt && date.gte >= date.lt) {
      throw Object.assign(new Error("Invalid attendance date range"), { status: 400 });
    }

    const where: any = { schoolId };
    let teacherClassroomIds: string[] | null = null;
    if (viewerRole === "TEACHER" && viewer) {
      teacherClassroomIds = (await getTeacherClassrooms(viewer.id, schoolId)).map(
        (classroom) => classroom.id
      );
      if (!teacherClassroomIds.length) {
        return { items: [], total: 0, page, pageSize };
      }
      where.classroomId = { in: teacherClassroomIds };
    }
    if (opts?.classroomId) {
      if (
        teacherClassroomIds &&
        !teacherClassroomIds.includes(opts.classroomId)
      ) {
        return { items: [], total: 0, page, pageSize };
      }
      where.classroomId = opts.classroomId;
    }
    if (Object.keys(date).length) where.date = date;
    const status = opts?.status?.toUpperCase();
    if (status && VALID_STATUSES.has(status)) {
      where.records = { some: { status } };
    }

    let viewerStudentIds: Set<string> | null = null;
    if (viewerRole === "STUDENT" && viewer) {
      viewerStudentIds = new Set([viewer.id]);
    } else if (viewerRole === "PARENT" && viewer) {
      viewerStudentIds = new Set(await getParentChildIds(viewer.id));
    }
    if (viewerStudentIds) {
      where.records = {
        some: {
          studentId: { in: [...viewerStudentIds] },
          ...(status && VALID_STATUSES.has(status) ? { status } : {}),
        },
      };
    } else if (
      opts?.studentId &&
      viewerRole !== "STUDENT" &&
      viewerRole !== "PARENT"
    ) {
      where.records = {
        some: {
          studentId: opts.studentId,
          ...(status && VALID_STATUSES.has(status) ? { status } : {}),
        },
      };
    }

    const [total, sessions] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        include: { records: true },
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const filtered = sessions.map((session) => {
      let records = session.records;
      if (viewerStudentIds) {
        records = records.filter((record) => viewerStudentIds!.has(record.studentId));
      } else if (
        opts?.studentId &&
        viewerRole !== "STUDENT" &&
        viewerRole !== "PARENT"
      ) {
        records = records.filter((record) => record.studentId === opts.studentId);
      }
      if (status && VALID_STATUSES.has(status)) {
        records = records.filter((record) => record.status === status);
      }
      const counts = viewerOnly ? countStatuses(records) : {};
      return { ...session, ...counts, records };
    });

    const items = await enrichSessions(filtered);
    return { items, total, page, pageSize };
  },

  async createAttendance(
    schoolId: string,
    teacherId: string,
    data: any,
    actor?: { id: string; role: string }
  ) {
    const { classroomId, date, records, notes, force } = data;
    if (!classroomId) throw new Error("classroomId is required");
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("At least one student record is required");
    }

    const role = actor?.role || "TEACHER";
    const staffOverride = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "SUPER_ADMIN"].includes(
      role
    );
    if (!staffOverride) {
      const allowed = await assertClassroomTeacherAccess(classroomId, teacherId);
      if (!allowed) {
        const err: any = new Error(
          "You can only take roll call for classrooms you teach"
        );
        err.status = 403;
        err.code = "CLASSROOM_ACCESS_DENIED";
        throw err;
      }
    }

    const school = await getIdentitySchool(schoolId);
    const timeZone = school?.timezone || "UTC";
    const rules = school?.payrollAttendanceRules || {};
    const ymd = normalizeYmd(date || new Date(), timeZone);
    const { start, end } = dayBoundsFromYmd(ymd);

    const blockNonInstructional =
      rules.blockNonInstructionalRollCall !== false;
    if (blockNonInstructional && !force) {
      const dayCheck = await checkInstructionalDay(schoolId, ymd);
      if (dayCheck && dayCheck.instructional === false) {
        const reason =
          dayCheck.reason === "weekend"
            ? "weekends"
            : dayCheck.title
              ? `non-instruction day (${dayCheck.title})`
              : "a non-instruction day";
        const err: any = new Error(
          `Cannot take roll call on ${reason}. Add a Holiday / Non-Instruction calendar event only when intentional, or ask an admin to allow override.`
        );
        err.status = 400;
        err.code = "NON_INSTRUCTIONAL_DAY";
        err.details = dayCheck;
        throw err;
      }
    }

    const normalized = records.map((r: any) => {
      const status = String(r.status || "").toUpperCase();
      if (!VALID_STATUSES.has(status)) {
        throw new Error(`Invalid status: ${r.status}`);
      }
      if (!r.studentId) throw new Error("Each record needs studentId");
      return {
        studentId: r.studentId,
        status,
        notes: r.notes ? String(r.notes).slice(0, 500) : null,
      };
    });

    const { presentCount, absentCount } = countStatuses(normalized);

    const existing = await prisma.attendance.findFirst({
      where: {
        schoolId,
        classroomId,
        date: { gte: start, lt: end },
      },
      include: { records: true },
    });

    let attendance;
    if (existing) {
      await prisma.attendanceRecord.deleteMany({
        where: { attendanceId: existing.id },
      });
      attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          teacherId,
          presentCount,
          absentCount,
          notes: notes != null ? String(notes).slice(0, 2000) : existing.notes,
          status: "COMPLETED",
          records: { create: normalized },
        },
        include: { records: true },
      });
    } else {
      attendance = await prisma.attendance.create({
        data: {
          schoolId,
          classroomId,
          teacherId,
          date: start,
          presentCount,
          absentCount,
          notes: notes != null ? String(notes).slice(0, 2000) : null,
          records: { create: normalized },
        },
        include: { records: true },
      });
    }

    console.log(
      `[event] attendance.recorded schoolId=${schoolId} attendanceId=${attendance.id} classroomId=${classroomId} date=${ymd} present=${presentCount} absent=${absentCount}`
    );

    const [enriched] = await enrichSessions([attendance]);

    if (rules.publishRollCallToCalendar !== false) {
      await upsertAttendanceCalendarEvent({
        schoolId,
        attendanceId: attendance.id,
        classroomName: enriched?.classroom?.name || "Classroom",
        date: ymd,
        presentCount,
        absentCount,
        createdById: teacherId,
      });
    }

    // Alert linked parents for ABSENT / LATE marks (fire-and-forget).
    try {
      const alertRows = normalized.filter(
        (r) => r.status === "ABSENT" || r.status === "LATE"
      );
      if (alertRows.length) {
        const users = await getIdentityUsersMap(alertRows.map((r) => r.studentId));
        const payloads: {
          schoolId: string;
          userId: string;
          eventKey: string;
          title: string;
          body: string;
          href: string;
          meta: Record<string, unknown>;
        }[] = [];
        for (const row of alertRows) {
          const parentIds = await getStudentParentIds(row.studentId);
          const studentName = users[row.studentId]?.name || "Your child";
          const label = row.status === "LATE" ? "marked late" : "marked absent";
          for (const parentId of parentIds) {
            payloads.push({
              schoolId,
              userId: parentId,
              eventKey: "ATTENDANCE_ALERT",
              title: row.status === "LATE" ? "Late attendance" : "Absence recorded",
              body: `${studentName} was ${label} on ${ymd}.`,
              href: "/attendance",
              meta: {
                attendanceId: attendance.id,
                studentId: row.studentId,
                status: row.status,
                date: ymd,
              },
            });
          }
        }
        await notifyInAppMany(payloads);
      }
    } catch (err: any) {
      console.warn("[attendance] parent alert failed:", err?.message || err);
    }

    return enriched;
  },

  async getAttendanceDetails(id: string, viewer?: { id: string; role: string }) {
    const details = await prisma.attendance.findUnique({
      where: { id },
      include: { records: true },
    });
    if (!details) return null;

    let session: any = details;
    let viewerOnly = false;
    if (viewer?.role === "STUDENT") {
      viewerOnly = true;
      session = {
        ...details,
        records: details.records.filter((r) => r.studentId === viewer.id),
      };
      if (!session.records.length) return null;
    } else if (viewer?.role === "PARENT") {
      viewerOnly = true;
      const childIds = new Set(await getParentChildIds(viewer.id));
      session = {
        ...details,
        records: details.records.filter((r) => childIds.has(r.studentId)),
      };
      if (!session.records.length) return null;
    } else if (viewer?.role === "TEACHER" && viewer) {
      const classrooms = await getTeacherClassrooms(viewer.id, details.schoolId);
      if (!classrooms.some((classroom) => classroom.id === details.classroomId)) {
        return null;
      }
    }
    if (viewerOnly) {
      Object.assign(session, countStatuses(session.records));
    }

    const [enriched] = await enrichSessions([session]);
    return enriched;
  },

  /**
   * Per-student attendance counts within [from, to) — consumed by the
   * Promotion Statement's "best attendance" section.
   */
  async getAttendanceSummaryByStudent(
    schoolId: string,
    opts: { from?: string | Date | null; to?: string | Date | null } = {}
  ) {
    const dateFilter: { gte?: Date; lt?: Date } = {};
    if (opts.from) {
      const d = new Date(opts.from);
      if (!Number.isNaN(d.getTime())) dateFilter.gte = d;
    }
    if (opts.to) {
      const d = new Date(opts.to);
      if (!Number.isNaN(d.getTime())) dateFilter.lt = d;
    }

    const sessions = await prisma.attendance.findMany({
      where: {
        schoolId,
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      },
      select: { records: { select: { studentId: true, status: true } } },
    });

    const map = new Map<
      string,
      { studentUserId: string; present: number; late: number; absent: number; excused: number; total: number }
    >();
    for (const session of sessions) {
      for (const rec of session.records) {
        let row = map.get(rec.studentId);
        if (!row) {
          row = {
            studentUserId: rec.studentId,
            present: 0,
            late: 0,
            absent: 0,
            excused: 0,
            total: 0,
          };
          map.set(rec.studentId, row);
        }
        const status = String(rec.status || "").toUpperCase();
        if (status === "PRESENT") row.present += 1;
        else if (status === "LATE") row.late += 1;
        else if (status === "ABSENT") row.absent += 1;
        else if (status === "EXCUSED") row.excused += 1;
        else continue;
        row.total += 1;
      }
    }

    return [...map.values()].map((r) => ({
      ...r,
      attendanceRate: r.total ? Math.round(((r.present + r.late) / r.total) * 10000) / 100 : 0,
    }));
  },

  async getAttendanceStats(
    schoolId: string,
    viewer?: { id: string; role: string }
  ) {
    const school = await getIdentitySchool(schoolId);
    const timeZone = school?.timezone || "UTC";
    const ymd = ymdInTimeZone(new Date(), timeZone);
    const { start } = dayBoundsFromYmd(ymd);

    const teacherClassroomIds =
      viewer?.role === "TEACHER"
        ? (await getTeacherClassrooms(viewer.id, schoolId)).map(
            (classroom) => classroom.id
          )
        : null;
    const scope =
      teacherClassroomIds !== null
        ? { classroomId: { in: teacherClassroomIds } }
        : {};
    const [todayRecords, totalRecords] = await Promise.all([
      prisma.attendance.findMany({
        where: { schoolId, ...scope, date: { gte: start } },
      }),
      prisma.attendance.aggregate({
        where: { schoolId, ...scope },
        _sum: { presentCount: true, absentCount: true },
      }),
    ]);

    const todayPresent = todayRecords.reduce((acc, r) => acc + r.presentCount, 0);
    const todayAbsent = todayRecords.reduce((acc, r) => acc + r.absentCount, 0);

    const totalPresent = totalRecords._sum.presentCount || 0;
    const totalAbsent = totalRecords._sum.absentCount || 0;

    const classroomIds = todayRecords.map((r) => r.classroomId).filter(Boolean) as string[];
    const [classrooms, gradeLevels] = await Promise.all([
      getClassroomsMap(classroomIds),
      fetchGradeLevelsForSchool(schoolId),
    ]);
    const gradeNameById = new Map(gradeLevels.map((g) => [g.id, g.name]));
    const byGrade = new Map<
      string,
      { gradeLevelId: string; name: string; present: number; absent: number }
    >();

    for (const record of todayRecords) {
      if (!record.classroomId) continue;
      const gradeLevelId = classrooms[record.classroomId]?.gradeLevelId;
      if (!gradeLevelId) continue;
      const bucket =
        byGrade.get(gradeLevelId) ||
        ({
          gradeLevelId,
          name: gradeNameById.get(gradeLevelId) || gradeLevelId,
          present: 0,
          absent: 0,
        } as const);
      byGrade.set(gradeLevelId, {
        gradeLevelId,
        name: bucket.name,
        present: bucket.present + record.presentCount,
        absent: bucket.absent + record.absentCount,
      });
    }

    const todayByGradeLevel = Array.from(byGrade.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return {
      today: {
        present: todayPresent,
        absent: todayAbsent,
        rate:
          todayPresent + todayAbsent > 0
            ? (todayPresent / (todayPresent + todayAbsent)) * 100
            : 0,
        sessions: todayRecords.length,
        date: ymd,
      },
      overall: {
        present: totalPresent,
        absent: totalAbsent,
        rate:
          totalPresent + totalAbsent > 0
            ? (totalPresent / (totalPresent + totalAbsent)) * 100
            : 0,
      },
      todayByGradeLevel,
    };
  },
};
