import prisma from "../lib/prisma";
import {
  computeExamEnvelope,
  synthesizeScheduleFromExam,
  validateScheduleWindow,
} from "../lib/examSchedule";

function httpError(message: string, status: number, code?: string) {
  const err: any = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

type ScheduleInput = {
  classId?: string | null;
  room?: string | null;
  session?: string | null;
  invigilatorId?: string | null;
  startAt: string | Date;
  endAt: string | Date;
  note?: string | null;
};

type ScheduleRow = {
  id: string;
  examId: string;
  schoolId: string;
  classId: string | null;
  room: string | null;
  session: string | null;
  invigilatorId: string | null;
  startAt: Date;
  endAt: Date;
  note: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function toDto(row: any, synthetic = false) {
  return {
    id: row.id,
    examId: row.examId,
    schoolId: row.schoolId,
    classId: row.classId ?? null,
    room: row.room ?? null,
    session: row.session ?? null,
    invigilatorId: row.invigilatorId ?? null,
    startAt: row.startAt,
    endAt: row.endAt,
    note: row.note ?? null,
    synthetic: Boolean(row.synthetic ?? synthetic),
  };
}

export const examScheduleService = {
  /** Recompute Exam.startDate/endDate as the min/max envelope of its schedules. */
  async syncExamWindow(examId: string, schoolId: string) {
    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId },
      select: { id: true, startDate: true, endDate: true },
    });
    if (!exam) return;
    const schedules = await prisma.examSchedule.findMany({
      where: { examId, schoolId },
      select: { startAt: true, endAt: true },
    });
    const env = computeExamEnvelope(schedules, {
      startDate: exam.startDate,
      endDate: exam.endDate,
    });
    if (
      env.startDate.getTime() !== exam.startDate.getTime() ||
      env.endDate.getTime() !== exam.endDate.getTime()
    ) {
      await prisma.exam.update({
        where: { id: examId },
        data: { startDate: env.startDate, endDate: env.endDate },
      });
    }
  },

  /** List schedules for an exam; synthesizes a legacy fallback when none exist. */
  async listForExam(examId: string, schoolId: string) {
    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId },
      select: {
        id: true,
        schoolId: true,
        classId: true,
        startDate: true,
        endDate: true,
      },
    });
    if (!exam) throw httpError("Exam not found", 404);

    const rows = await prisma.examSchedule.findMany({
      where: { examId, schoolId },
      orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
    });
    if (rows.length) return rows.map((r) => toDto(r));
    return [toDto(synthesizeScheduleFromExam(exam), true)];
  },

  /** Create a schedule row and widen the exam window if needed. */
  async createForExam(
    examId: string,
    schoolId: string,
    userId: string,
    input: {
      classId?: string | null;
      room?: string | null;
      session?: string | null;
      invigilatorId?: string | null;
      startAt: string | Date;
      endAt: string | Date;
      note?: string | null;
    }
  ) {
    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId },
      select: { id: true },
    });
    if (!exam) throw httpError("Exam not found", 404);

    const win = validateScheduleWindow(input.startAt, input.endAt);
    if (!win.ok) throw httpError(win.error, 400, "INVALID_SCHEDULE_WINDOW");

    const created = await prisma.examSchedule.create({
      data: {
        examId,
        schoolId,
        classId: input.classId || null,
        room: input.room?.trim() || null,
        session: input.session?.trim() || null,
        invigilatorId: input.invigilatorId || null,
        startAt: win.startAt,
        endAt: win.endAt,
        note: input.note?.trim() || null,
        createdById: userId,
      },
    });
    await this.syncExamWindow(examId, schoolId);
    return toDto(created);
  },

  /** Update a schedule row and re-derive the exam window. */
  async updateFor(
    scheduleId: string,
    schoolId: string,
    input: {
      classId?: string | null;
      room?: string | null;
      session?: string | null;
      invigilatorId?: string | null;
      startAt?: string | Date;
      endAt?: string | Date;
      note?: string | null;
    }
  ) {
    const existing = await prisma.examSchedule.findFirst({
      where: { id: scheduleId, schoolId },
    });
    if (!existing) throw httpError("Schedule not found", 404);

    const startAt = input.startAt ?? existing.startAt;
    const endAt = input.endAt ?? existing.endAt;
    const win = validateScheduleWindow(startAt, endAt);
    if (!win.ok) throw httpError(win.error, 400, "INVALID_SCHEDULE_WINDOW");

    const updated = await prisma.examSchedule.update({
      where: { id: existing.id },
      data: {
        classId: input.classId === undefined ? existing.classId : input.classId || null,
        room: input.room === undefined ? existing.room : input.room?.trim() || null,
        session: input.session === undefined ? existing.session : input.session?.trim() || null,
        invigilatorId:
          input.invigilatorId === undefined ? existing.invigilatorId : input.invigilatorId || null,
        startAt: win.startAt,
        endAt: win.endAt,
        note: input.note === undefined ? existing.note : input.note?.trim() || null,
      },
    });
    await this.syncExamWindow(existing.examId, schoolId);
    return toDto(updated);
  },

  /** Delete a schedule row and re-derive the exam window. */
  async deleteFor(scheduleId: string, schoolId: string) {
    const existing = await prisma.examSchedule.findFirst({
      where: { id: scheduleId, schoolId },
      select: { id: true, examId: true },
    });
    if (!existing) throw httpError("Schedule not found", 404);
    await prisma.examSchedule.delete({ where: { id: existing.id } });
    await this.syncExamWindow(existing.examId, schoolId);
    return { ok: true };
  },
};
