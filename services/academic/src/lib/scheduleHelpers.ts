/** Pure helpers for class timetable (bell periods + weekly entries). */

export type PeriodTime = { id: string; startTime: string; endTime: string };

export type ConflictCandidate = {
  id?: string;
  classroomId: string;
  teacherId: string;
  dayOfWeek: number;
  schedulePeriodId: string;
  startTime?: string;
  endTime?: string;
};

export type ScheduleConflict = {
  code: "CLASSROOM_DOUBLE" | "TEACHER_DOUBLE" | "INVALID_DAY" | "INVALID_TIME";
  message: string;
  aIndex: number;
  bIndex?: number;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Convert YYYY-MM-DD → ISO weekday 1=Mon … 7=Sun. */
export function isoWeekdayFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun … 6=Sat
  return js === 0 ? 7 : js;
}

export function parseHmToMinutes(hm: string): number | null {
  if (!TIME_RE.test(hm || "")) return null;
  const [h, min] = hm.split(":").map(Number);
  return h * 60 + min;
}

export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = parseHmToMinutes(aStart);
  const ae = parseHmToMinutes(aEnd);
  const bs = parseHmToMinutes(bStart);
  const be = parseHmToMinutes(bEnd);
  if (as == null || ae == null || bs == null || be == null) return false;
  return as < be && bs < ae;
}

export function isValidHm(hm: string): boolean {
  return TIME_RE.test(hm || "");
}

export function isValidIsoWeekday(day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= 7;
}

/** Entry is effective on ymd when from/to bounds (empty = open) include the day. */
export function isEffectiveOn(ymd: string, effectiveFrom: string, effectiveTo: string): boolean {
  if (effectiveFrom && ymd < effectiveFrom) return false;
  if (effectiveTo && ymd > effectiveTo) return false;
  return true;
}

/**
 * Detect classroom double-book and teacher time overlaps within a candidate set.
 * Period times should be attached when available (teacher overlap by time).
 */
export function findScheduleConflicts(candidates: ConflictCandidate[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const a = candidates[i];
    if (!isValidIsoWeekday(a.dayOfWeek)) {
      conflicts.push({
        code: "INVALID_DAY",
        message: `Invalid dayOfWeek ${a.dayOfWeek} (use 1=Mon … 7=Sun)`,
        aIndex: i,
      });
    }
    if (a.startTime && !isValidHm(a.startTime)) {
      conflicts.push({ code: "INVALID_TIME", message: `Invalid startTime ${a.startTime}`, aIndex: i });
    }
    if (a.endTime && !isValidHm(a.endTime)) {
      conflicts.push({ code: "INVALID_TIME", message: `Invalid endTime ${a.endTime}`, aIndex: i });
    }

    for (let j = i + 1; j < candidates.length; j++) {
      const b = candidates[j];
      if (a.dayOfWeek !== b.dayOfWeek) continue;

      if (a.classroomId && a.classroomId === b.classroomId && a.schedulePeriodId === b.schedulePeriodId) {
        conflicts.push({
          code: "CLASSROOM_DOUBLE",
          message: `Classroom double-booked on day ${a.dayOfWeek} for the same bell period`,
          aIndex: i,
          bIndex: j,
        });
      }

      if (
        a.teacherId &&
        a.teacherId === b.teacherId &&
        a.startTime &&
        a.endTime &&
        b.startTime &&
        b.endTime &&
        timesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)
      ) {
        conflicts.push({
          code: "TEACHER_DOUBLE",
          message: `Teacher double-booked on day ${a.dayOfWeek} (${a.startTime}–${a.endTime} overlaps ${b.startTime}–${b.endTime})`,
          aIndex: i,
          bIndex: j,
        });
      }
    }
  }

  return conflicts;
}

export type BellPeriodLike = {
  id?: string;
  label?: string;
  startTime: string;
  endTime: string;
};

export type PeriodOverlap = {
  a: number;
  b: number;
  message: string;
};

/** Detect overlapping time windows within a single bell's period list (bulk editor). */
export function findBellPeriodOverlaps(periods: BellPeriodLike[]): PeriodOverlap[] {
  const out: PeriodOverlap[] = [];
  for (let i = 0; i < periods.length; i++) {
    const a = periods[i];
    for (let j = i + 1; j < periods.length; j++) {
      const b = periods[j];
      if (!timesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) continue;
      out.push({
        a: i,
        b: j,
        message: `${a.label || `Period ${i + 1}`} (${a.startTime}–${a.endTime}) overlaps ${b.label || `Period ${j + 1}`} (${b.startTime}–${b.endTime})`,
      });
    }
  }
  return out;
}

export const DEFAULT_BELL_PERIODS = [
  { periodNumber: 1, label: "Period 1", shortCode: "P1", startTime: "08:00", endTime: "08:45", orderIndex: 0 },
  { periodNumber: 2, label: "Period 2", shortCode: "P2", startTime: "08:50", endTime: "09:35", orderIndex: 1 },
  { periodNumber: 3, label: "Period 3", shortCode: "P3", startTime: "09:50", endTime: "10:35", orderIndex: 2 },
  { periodNumber: 4, label: "Period 4", shortCode: "P4", startTime: "10:40", endTime: "11:25", orderIndex: 3 },
  { periodNumber: 5, label: "Period 5", shortCode: "P5", startTime: "12:15", endTime: "13:00", orderIndex: 4 },
  { periodNumber: 6, label: "Period 6", shortCode: "P6", startTime: "13:05", endTime: "13:50", orderIndex: 5 },
  { periodNumber: 7, label: "Period 7", shortCode: "P7", startTime: "13:55", endTime: "14:40", orderIndex: 6 },
  { periodNumber: 8, label: "Period 8", shortCode: "P8", startTime: "14:45", endTime: "15:30", orderIndex: 7 },
];

export const DAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};
