import prisma from "../lib/prisma";
import {
  getClassroomsMap,
  fetchGradeLevelsForSchool,
  checkInstructionalDay,
  upsertAttendanceCalendarEvent,
  assertClassroomTeacherAccess,
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
    opts?: { page?: number | string; pageSize?: number | string }
  ) {
    const page = Math.max(1, Number(opts?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(opts?.pageSize) || 50));
    const where = { schoolId };
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

    let filtered = sessions;
    if (viewer?.role === "STUDENT") {
      filtered = sessions
        .map((s) => ({
          ...s,
          records: s.records.filter((r) => r.studentId === viewer.id),
        }))
        .filter((s) => s.records.length > 0);
    } else if (viewer?.role === "PARENT") {
      const childIds = new Set(await getParentChildIds(viewer.id));
      filtered = sessions
        .map((s) => ({
          ...s,
          records: s.records.filter((r) => childIds.has(r.studentId)),
        }))
        .filter((s) => s.records.length > 0);
    }

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
    if (viewer?.role === "STUDENT") {
      session = {
        ...details,
        records: details.records.filter((r) => r.studentId === viewer.id),
      };
      if (!session.records.length) return null;
    } else if (viewer?.role === "PARENT") {
      const childIds = new Set(await getParentChildIds(viewer.id));
      session = {
        ...details,
        records: details.records.filter((r) => childIds.has(r.studentId)),
      };
      if (!session.records.length) return null;
    }

    const [enriched] = await enrichSessions([session]);
    return enriched;
  },

  async getAttendanceStats(schoolId: string) {
    const school = await getIdentitySchool(schoolId);
    const timeZone = school?.timezone || "UTC";
    const ymd = ymdInTimeZone(new Date(), timeZone);
    const { start } = dayBoundsFromYmd(ymd);

    const [todayRecords, totalRecords] = await Promise.all([
      prisma.attendance.findMany({
        where: { schoolId, date: { gte: start } },
      }),
      prisma.attendance.aggregate({
        where: { schoolId },
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
