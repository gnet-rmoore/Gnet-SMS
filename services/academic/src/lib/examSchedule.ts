/**
 * Pure helpers for first-class exam scheduling (Phase 5).
 * Kept dependency-free so they can be unit-tested without a database.
 */

export type ScheduleWindow = { startAt: Date; endAt: Date };

export type ScheduleWindowResult =
  | { ok: true; startAt: Date; endAt: Date; error?: undefined }
  | { ok: false; startAt?: undefined; endAt?: undefined; error: string };

export function validateScheduleWindow(
  startAt: Date | string | number,
  endAt: Date | string | number
): ScheduleWindowResult {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, error: "Invalid schedule window" };
  }
  if (end.getTime() <= start.getTime()) {
    return { ok: false, error: "Schedule end must be after start" };
  }
  return { ok: true, startAt: start, endAt: end };
}

/**
 * Recompute the exam envelope (overall start/end) as the union of its schedules.
 * Falls back to the exam's current window when there are no schedules.
 */
export function computeExamEnvelope(
  schedules: { startAt: Date; endAt: Date }[],
  fallback: { startDate: Date; endDate: Date }
): { startDate: Date; endDate: Date } {
  const valid = schedules.filter(
    (s) => s.startAt instanceof Date && s.endAt instanceof Date && !Number.isNaN(s.startAt.getTime()) && !Number.isNaN(s.endAt.getTime())
  );
  if (!valid.length) return { startDate: fallback.startDate, endDate: fallback.endDate };
  let start = valid[0].startAt.getTime();
  let end = valid[0].endAt.getTime();
  for (const s of valid) {
    start = Math.min(start, s.startAt.getTime());
    end = Math.max(end, s.endAt.getTime());
  }
  return { startDate: new Date(start), endDate: new Date(end) };
}

/** A synthetic, non-persisted schedule derived from the exam window (legacy fallback). */
export function synthesizeScheduleFromExam(exam: {
  id: string;
  schoolId: string;
  classId?: string | null;
  startDate: Date;
  endDate: Date;
}) {
  return {
    id: `exam:${exam.id}`,
    examId: exam.id,
    schoolId: exam.schoolId,
    classId: exam.classId ?? null,
    room: null as string | null,
    session: null as string | null,
    invigilatorId: null as string | null,
    startAt: exam.startDate,
    endAt: exam.endDate,
    note: null as string | null,
    synthetic: true,
  };
}
