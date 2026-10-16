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

/** Half-open interval overlap for two [start, end) windows. */
export function windowsOverlap(
  aStart: Date | string | number,
  aEnd: Date | string | number,
  bStart: Date | string | number,
  bEnd: Date | string | number
): boolean {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  if ([as, ae, bs, be].some((t) => Number.isNaN(t))) return false;
  return as < be && bs < ae;
}

/**
 * Effective sitting window for one student. Schedules with no classId apply to
 * everyone; class-scoped schedules apply only to students in that class.
 * Falls back to the exam window when no schedule matches.
 */
export function resolveStudentWindow(
  schedules: { classId?: string | null; startAt: Date; endAt: Date }[],
  examWindow: { startDate: Date; endDate: Date },
  studentClassIds: Set<string> | null | undefined
): { startAt: Date; endAt: Date } {
  const matching = schedules.filter(
    (s) => !s.classId || (studentClassIds ? studentClassIds.has(s.classId) : false)
  );
  if (!matching.length) {
    return { startAt: examWindow.startDate, endAt: examWindow.endDate };
  }
  let start = matching[0].startAt.getTime();
  let end = matching[0].endAt.getTime();
  for (const s of matching) {
    start = Math.min(start, s.startAt.getTime());
    end = Math.max(end, s.endAt.getTime());
  }
  return { startAt: new Date(start), endAt: new Date(end) };
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
