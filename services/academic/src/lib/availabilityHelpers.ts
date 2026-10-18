/**
 * Pure helpers for timetable slot availability and workload-aware suggestions.
 *
 * Everything here is deterministic and side-effect free so it can be unit
 * tested (tests/class-schedule.test.ts) and reused by scheduleService.
 *
 * Concepts:
 * - Slot: one bell period on one weekday (dayOfWeek + schedulePeriodId).
 * - Availability: for a slot, which teachers are free (no time overlap with
 *   existing entries), how loaded they already are that day, and how much
 *   rest (gap) they have before/after.
 * - Rest: a gap between a teacher's consecutive lessons that is at least
 *   `restGapMinutes` long. Back-to-back streaks longer than `maxConsecutive`
 *   are flagged so organizers give teachers breathing room.
 * - Subject fit: a teacher "fits" a subject when they own a classroom with
 *   that subject, already teach it in the bell schedule, or (for the class
 *   being edited) own that classroom.
 */
import { parseHmToMinutes, timesOverlap } from "./scheduleHelpers";

export type PeriodWindow = {
  id: string;
  label?: string | null;
  shortCode?: string | null;
  startTime: string;
  endTime: string;
  orderIndex: number;
};

export type ScheduledItem = {
  classroomId: string;
  classroomName?: string | null;
  teacherId: string;
  teacherName?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  dayOfWeek: number;
  schedulePeriodId: string;
};

export type TeacherCandidate = { id: string; name?: string | null };

export type ClassroomRefLike = {
  id: string;
  name?: string | null;
  subjectId?: string | null;
  gradeLevelId?: string | null;
  ownerTeacherId?: string | null;
};

export type SchedulingPrefs = {
  /** Gap between lessons that counts as real rest (minutes). */
  restGapMinutes: number;
  /** Consecutive lessons (with only short gaps) beyond this are flagged. */
  maxConsecutive: number;
  /** Lessons per day beyond this are flagged as overloaded. */
  maxLessonsPerDay: number;
  /** Hard cap: a teacher cannot be given more lessons than this in one day. */
  maxTeacherDayLoad: number;
};

export const DEFAULT_SCHEDULING_PREFS: SchedulingPrefs = {
  restGapMinutes: 10,
  maxConsecutive: 3,
  maxLessonsPerDay: 6,
  maxTeacherDayLoad: 8,
};

function withDefaults(prefs?: Partial<SchedulingPrefs>): SchedulingPrefs {
  return { ...DEFAULT_SCHEDULING_PREFS, ...(prefs || {}) };
}

/** Minutes of rest between aEnd and bStart; null when times are invalid. */
export function gapMinutes(aEnd: string, bStart: string): number | null {
  const a = parseHmToMinutes(aEnd);
  const b = parseHmToMinutes(bStart);
  if (a == null || b == null) return null;
  return Math.max(0, b - a);
}

function byOrder(periods: PeriodWindow[]) {
  return [...periods].sort((a, b) => a.orderIndex - b.orderIndex);
}

export type TeacherDayProfile = {
  lessons: number;
  longestStreak: number;
  /** schedulePeriodIds the teacher already occupies that day. */
  busyPeriodIds: Set<string>;
  /** Lesson windows that day (period times sorted by order). */
  lessonsSorted: Array<{ schedulePeriodId: string; startTime: string; endTime: string }>;
};

/** Compute a teacher's load / streak / occupied periods for one weekday. */
export function teacherDayProfile(
  entries: ScheduledItem[],
  periods: PeriodWindow[],
  teacherId: string,
  dayOfWeek: number
): TeacherDayProfile {
  const periodById = new Map(periods.map((p) => [p.id, p]));
  const mine = entries
    .filter((e) => e.teacherId === teacherId && e.dayOfWeek === dayOfWeek)
    .map((e) => periodById.get(e.schedulePeriodId))
    .filter((p): p is PeriodWindow => Boolean(p))
    .sort((a, b) => a.orderIndex - b.orderIndex);

  let longest = 0;
  let run = 0;
  let prevEnd: string | null = null;
  const prefs = DEFAULT_SCHEDULING_PREFS;
  for (const p of mine) {
    const gap = prevEnd ? gapMinutes(prevEnd, p.startTime) : null;
    if (gap != null && gap < prefs.restGapMinutes) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prevEnd = p.endTime;
  }

  return {
    lessons: mine.length,
    longestStreak: longest,
    busyPeriodIds: new Set(mine.map((p) => p.id)),
    lessonsSorted: mine.map((p) => ({
      schedulePeriodId: p.id,
      startTime: p.startTime,
      endTime: p.endTime,
    })),
  };
}

export type SubjectFit = "OWN_CLASS" | "TEACHES_SUBJECT" | "NONE";

export type TeacherSlotAvailability = {
  teacherId: string;
  teacherName: string;
  status: "AVAILABLE" | "BUSY";
  busyWith: {
    classroomId: string;
    classroomName: string;
    subjectName: string | null;
    startTime: string;
    endTime: string;
  } | null;
  lessonsThatDay: number;
  longestStreak: number;
  gapBeforeMin: number | null;
  gapAfterMin: number | null;
  restBefore: boolean;
  restAfter: boolean;
  subjectFit: SubjectFit;
  /** True when a subject was requested but this teacher never teaches it. */
  subjectMismatch: boolean;
  ownsThisClassroom: boolean;
  score: number;
};

export type SlotAvailabilityInput = {
  periods: PeriodWindow[];
  entries: ScheduledItem[];
  dayOfWeek: number;
  schedulePeriodId: string;
  teachers: TeacherCandidate[];
  /** Subjects the teacher already teaches anywhere in the bell schedule. */
  subjectIdsTaught?: Set<string>;
  /** Subject being assigned in the slot (optional). */
  subjectId?: string | null;
  /** Classroom being scheduled (optional; enables owner/subject fit). */
  classroom?: ClassroomRefLike | null;
  /** All classrooms, to resolve ownerTeacherId → subject relationships. */
  classrooms?: ClassroomRefLike[];
  prefs?: Partial<SchedulingPrefs>;
};

/**
 * Availability of every candidate teacher for one slot:
 * free/busy, day load, rest before/after, subject fit, and a ranking score.
 * Sorted best-first (available, subject-fit, lighter load, better rest).
 */
export function computeTeacherSlotAvailability(input: SlotAvailabilityInput): TeacherSlotAvailability[] {
  const prefs = withDefaults(input.prefs);
  const periodById = new Map(input.periods.map((p) => [p.id, p]));
  const target = periodById.get(input.schedulePeriodId);
  const classrooms = input.classrooms || [];
  const subjectId = input.subjectId || null;
  const classroomId = input.classroom?.id || null;
  const ownerTeacherId = input.classroom?.ownerTeacherId || null;

  const out: TeacherSlotAvailability[] = [];

  for (const teacher of input.teachers) {
    const profile = teacherDayProfile(input.entries, input.periods, teacher.id, input.dayOfWeek);

    const overlap = target
      ? input.entries.find(
          (e) =>
            e.teacherId === teacher.id &&
            e.dayOfWeek === input.dayOfWeek &&
            e.schedulePeriodId !== input.schedulePeriodId &&
            (() => {
              const other = periodById.get(e.schedulePeriodId);
              return other ? timesOverlap(target.startTime, target.endTime, other.startTime, other.endTime) : false;
            })()
        )
      : undefined;
    const busyNow = target ? profile.busyPeriodIds.has(input.schedulePeriodId) : false;

    let gapBeforeMin: number | null = null;
    let gapAfterMin: number | null = null;
    if (target) {
      const before = profile.lessonsSorted.filter((l) => l.endTime <= target.startTime).pop();
      const after = profile.lessonsSorted.find((l) => l.startTime >= target.endTime);
      if (before) gapBeforeMin = gapMinutes(before.endTime, target.startTime);
      if (after) gapAfterMin = gapMinutes(target.endTime, after.startTime);
    }

    let subjectFit: SubjectFit = "NONE";
    if (subjectId) {
      if (classroomId && teacher.id === ownerTeacherId) subjectFit = "OWN_CLASS";
      else {
        const ownsSubjectRoom = classrooms.some(
          (c) => c.subjectId === subjectId && c.ownerTeacherId === teacher.id
        );
        const teachesNow = input.subjectIdsTaught?.has(`${teacher.id}|${subjectId}`) || false;
        if (ownsSubjectRoom || teachesNow) subjectFit = "TEACHES_SUBJECT";
      }
    } else if (classroomId && teacher.id === ownerTeacherId) {
      subjectFit = "OWN_CLASS";
    }

    const status: TeacherSlotAvailability["status"] = busyNow || overlap ? "BUSY" : "AVAILABLE";
    const restBefore = gapBeforeMin != null && gapBeforeMin >= prefs.restGapMinutes;
    const restAfter = gapAfterMin != null && gapAfterMin >= prefs.restGapMinutes;

    let score = 0;
    score += status === "AVAILABLE" ? 100 : -50;
    if (subjectFit === "OWN_CLASS") score += 30;
    if (subjectFit === "TEACHES_SUBJECT") score += 20;
    if (ownerTeacherId && teacher.id === ownerTeacherId) score += 15;
    score += Math.max(0, prefs.maxLessonsPerDay - profile.lessons) * 4;
    if (restBefore) score += 8;
    if (restAfter) score += 8;
    if (profile.longestStreak >= prefs.maxConsecutive) score -= 15;
    if (subjectId && subjectFit === "NONE") score -= 25;

    out.push({
      teacherId: teacher.id,
      teacherName: teacher.name || "",
      status,
      busyWith: overlap
        ? {
            classroomId: overlap.classroomId,
            classroomName: overlap.classroomName || "",
            subjectName: overlap.subjectName || null,
            startTime: periodById.get(overlap.schedulePeriodId)?.startTime || "",
            endTime: periodById.get(overlap.schedulePeriodId)?.endTime || "",
          }
        : null,
      lessonsThatDay: profile.lessons,
      longestStreak: profile.longestStreak,
      gapBeforeMin,
      gapAfterMin,
      restBefore,
      restAfter,
      subjectFit,
      subjectMismatch: Boolean(subjectId) && subjectFit === "NONE",
      ownsThisClassroom: Boolean(classroomId) && teacher.id === ownerTeacherId,
      score,
    });
  }

  out.sort((a, b) => b.score - a.score || a.teacherName.localeCompare(b.teacherName));
  return out;
}

/** Period ids (ordered) where a classroom has no lesson on a weekday. */
export function freePeriodIdsForClassroom(
  periods: PeriodWindow[],
  entries: ScheduledItem[],
  classroomId: string,
  dayOfWeek: number
): string[] {
  const taken = new Set(
    entries
      .filter((e) => e.classroomId === classroomId && e.dayOfWeek === dayOfWeek)
      .map((e) => e.schedulePeriodId)
  );
  return byOrder(periods)
    .filter((p) => !taken.has(p.id))
    .map((p) => p.id);
}

export type WorkloadWarning = {
  teacherId: string;
  teacherName: string;
  dayOfWeek: number;
  code: "LONG_STREAK" | "OVERLOADED";
  message: string;
  lessons: number;
  longestStreak: number;
};

const DAY_SHORT: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

/** Per-teacher/day warnings: back-to-back streaks and overloaded days. */
export function computeWorkloadWarnings(
  entries: ScheduledItem[],
  periods: PeriodWindow[],
  prefs?: Partial<SchedulingPrefs>
): WorkloadWarning[] {
  const p = withDefaults(prefs);
  const pairs = new Map<string, { teacherId: string; teacherName: string; day: number }>();
  for (const e of entries) {
    const key = `${e.teacherId}|${e.dayOfWeek}`;
    if (!pairs.has(key)) {
      pairs.set(key, {
        teacherId: e.teacherId,
        teacherName: e.teacherName || "",
        day: e.dayOfWeek,
      });
    }
  }

  const warnings: WorkloadWarning[] = [];
  for (const { teacherId, teacherName, day } of pairs.values()) {
    const profile = teacherDayProfile(entries, periods, teacherId, day);
    if (profile.lessons === 0) continue;
    if (profile.longestStreak > p.maxConsecutive) {
      warnings.push({
        teacherId,
        teacherName,
        dayOfWeek: day,
        code: "LONG_STREAK",
        message: `${teacherName || "Teacher"} teaches ${profile.longestStreak} periods back-to-back on ${
          DAY_SHORT[day] || `day ${day}`
        } — add a rest gap`,
        lessons: profile.lessons,
        longestStreak: profile.longestStreak,
      });
    }
    if (profile.lessons > p.maxLessonsPerDay) {
      warnings.push({
        teacherId,
        teacherName,
        dayOfWeek: day,
        code: "OVERLOADED",
        message: `${teacherName || "Teacher"} has ${profile.lessons} lessons on ${
          DAY_SHORT[day] || `day ${day}`
        } (max ${p.maxLessonsPerDay}) — rebalance the day`,
        lessons: profile.lessons,
        longestStreak: profile.longestStreak,
      });
    }
  }
  warnings.sort((a, b) => a.dayOfWeek - b.dayOfWeek || b.lessons - a.lessons);
  return warnings;
}

export type ClassOccupancy = {
  classroomId: string;
  classroomName: string;
  lessons: number;
  totalSlots: number;
  fillRate: number;
};

/** Fill rate per classroom across the given weekdays (e.g. Mon–Fri). */
export function computeClassroomOccupancy(
  entries: ScheduledItem[],
  periods: PeriodWindow[],
  classrooms: Array<{ id: string; name?: string | null }>,
  gridDays: number[]
): ClassOccupancy[] {
  const totalSlots = Math.max(0, periods.length * gridDays.length);
  return classrooms
    .map((c) => {
      const lessons = entries.filter(
        (e) => e.classroomId === c.id && gridDays.includes(e.dayOfWeek)
      ).length;
      return {
        classroomId: c.id,
        classroomName: c.name || "",
        lessons,
        totalSlots,
        fillRate: totalSlots ? Math.round((lessons / totalSlots) * 100) : 0,
      };
    })
    .sort((a, b) => a.fillRate - b.fillRate || a.classroomName.localeCompare(b.classroomName));
}

export type ClassSuggestion = {
  dayOfWeek: number;
  schedulePeriodId: string;
  teacherId: string;
  teacherName: string;
  subjectId: string | null;
  subjectName: string | null;
  reasons: string[];
};

export type SuggestInput = {
  periods: PeriodWindow[];
  /** Existing entries across the school (not mutated). */
  entries: ScheduledItem[];
  classroom: ClassroomRefLike & { name?: string | null };
  teachers: TeacherCandidate[];
  subjects: Array<{ id: string; name: string }>;
  /**
   * Subjects allowed for this class:
   * - classroom.subjectId set → that single subject,
   * - else grade offerings,
   * - null → any subject (or none).
   */
  allowedSubjectIds: string[] | null;
  gridDays?: number[];
  prefs?: Partial<SchedulingPrefs>;
};

/**
 * Suggest teacher+subject for every empty cell of one classroom,
 * respecting:
 * - classroom free slots (no double-book),
 * - teacher free slots (no time overlap school-wide),
 * - subject constraints (class subject / grade offerings),
 * - teacher rest (prefers slots that keep rest gaps, avoids extending
 *   back-to-back streaks),
 * - workload balance (prefers less-loaded teachers, caps daily load).
 * Suggested cells are applied as it goes so later picks see earlier ones.
 */
export function suggestAssignments(input: SuggestInput): ClassSuggestion[] {
  const prefs = withDefaults(input.prefs);
  const gridDays = input.gridDays && input.gridDays.length ? input.gridDays : [1, 2, 3, 4, 5];
  const periods = byOrder(input.periods);
  const subjectById = new Map(input.subjects.map((s) => [s.id, s]));
  const allowed =
    input.allowedSubjectIds && input.allowedSubjectIds.length > 0
      ? input.allowedSubjectIds.filter((id) => subjectById.has(id))
      : null;

  const suggestions: ClassSuggestion[] = [];
  // Working copy so consecutive picks avoid colliding with each other.
  const working: ScheduledItem[] = input.entries.map((e) => ({ ...e }));

  const subjectUsage = new Map<string, number>();
  for (const e of working) {
    if (e.classroomId === input.classroom.id && e.subjectId) {
      subjectUsage.set(e.subjectId, (subjectUsage.get(e.subjectId) || 0) + 1);
    }
  }

  const rebuildSubjectIdsTaught = () => {
    const set = new Set<string>();
    for (const e of working) {
      if (e.subjectId) set.add(`${e.teacherId}|${e.subjectId}`);
    }
    return set;
  };

  for (const day of gridDays) {
    const freeIds = new Set(freePeriodIdsForClassroom(periods, working, input.classroom.id, day));
    for (const period of periods) {
      if (!freeIds.has(period.id)) continue;

      let subjectId: string | null = null;
      if (input.classroom.subjectId && subjectById.has(input.classroom.subjectId)) {
        subjectId = input.classroom.subjectId;
      } else if (allowed && allowed.length > 0) {
        subjectId = [...allowed].sort(
          (a, b) => (subjectUsage.get(a) || 0) - (subjectUsage.get(b) || 0) || a.localeCompare(b)
        )[0];
      }

      let best: TeacherSlotAvailability | null = null;
      let bestGapBefore: number | null = null;
      let bestGapAfter: number | null = null;

      for (const avail of computeTeacherSlotAvailability({
        periods,
        entries: working,
        dayOfWeek: day,
        schedulePeriodId: period.id,
        teachers: input.teachers,
        subjectIdsTaught: rebuildSubjectIdsTaught(),
        subjectId,
        classroom: input.classroom,
        prefs,
      })) {
        if (avail.status !== "AVAILABLE") continue;
        if (avail.lessonsThatDay >= prefs.maxTeacherDayLoad) continue;
        // Avoid stacking another lesson on top of a long streak.
        if (avail.longestStreak >= prefs.maxConsecutive) continue;
        if (!best || avail.score > best.score) {
          best = avail;
          bestGapBefore = avail.gapBeforeMin;
          bestGapAfter = avail.gapAfterMin;
        }
      }
      if (!best) continue;

      const reasons: string[] = [];
      if (best.ownsThisClassroom) reasons.push("Class teacher");
      if (subjectId && best.subjectFit === "TEACHES_SUBJECT") reasons.push("Already teaches this subject");
      reasons.push(`${best.lessonsThatDay} lesson${best.lessonsThatDay === 1 ? "" : "s"} that day`);
      if (bestGapBefore != null && bestGapBefore >= prefs.restGapMinutes) {
        reasons.push(`${bestGapBefore} min rest before`);
      }
      if (bestGapAfter != null && bestGapAfter >= prefs.restGapMinutes) {
        reasons.push(`${bestGapAfter} min rest after`);
      }

      const subjectName = subjectId ? subjectById.get(subjectId)?.name || null : null;
      suggestions.push({
        dayOfWeek: day,
        schedulePeriodId: period.id,
        teacherId: best.teacherId,
        teacherName: best.teacherName,
        subjectId,
        subjectName,
        reasons,
      });
      if (subjectId) subjectUsage.set(subjectId, (subjectUsage.get(subjectId) || 0) + 1);

      working.push({
        classroomId: input.classroom.id,
        classroomName: input.classroom.name || "",
        teacherId: best.teacherId,
        teacherName: best.teacherName,
        subjectId,
        subjectName,
        dayOfWeek: day,
        schedulePeriodId: period.id,
      });
    }
  }

  return suggestions;
}
