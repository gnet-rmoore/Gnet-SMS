/** Academic Calendar helpers for syllabus plans and lesson-plan week scoping. */

import {
  academicYearLabel as sharedAcademicYearLabel,
  hasActiveCalendar as sharedHasActiveCalendar,
  normalizeCalendarPeriods as sharedNormalizeCalendarPeriods,
  periodContainingDate as sharedPeriodContainingDate,
} from "./calendar/selectors";

export type CalendarExamComponent = {
  id?: string;
  label: string;
  weightPct: number;
};

export type CalendarPeriod = {
  id?: string;
  label: string;
  shortCode?: string;
  startDate: string;
  endDate: string;
  annualWeightPct: number;
  examComponents?: CalendarExamComponent[];
};

export type ActiveCalendar = {
  id?: string;
  name?: string;
  periods?: CalendarPeriod[];
};

export type SyllabusGradingCriterion = {
  label: string;
  weight: number;
  examComponentId?: string;
  academicPeriodId?: string;
  fromCalendar?: boolean;
};

export type SyllabusUnitBlock = {
  week: string;
  topic: string;
  activities: string;
  assessment: string;
  academicPeriodId?: string;
};

function toIsoDate(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Display label for academic year — calendar name or derived year span. */
export function academicYearLabel(calendar: ActiveCalendar | null | undefined): string {
  return sharedAcademicYearLabel(calendar);
}

export function normalizeCalendarPeriods(
  periods: CalendarPeriod[] | null | undefined
): CalendarPeriod[] {
  return sharedNormalizeCalendarPeriods(periods) as CalendarPeriod[];
}

/** Human-readable time frame for a syllabus unit row. */
export function periodWeekLabel(period: CalendarPeriod): string {
  const start = toIsoDate(period.startDate);
  const end = toIsoDate(period.endDate);
  return `${period.label} (${start} – ${end})`;
}

/**
 * Flatten calendar exam components to year-level syllabus weights.
 * Effective weight = period.annualWeightPct × component.weightPct / 100.
 */
export function gradingCriteriaFromCalendar(
  calendar: ActiveCalendar | null | undefined
): SyllabusGradingCriterion[] {
  const periods = normalizeCalendarPeriods(calendar?.periods);
  const criteria: SyllabusGradingCriterion[] = [];

  for (const period of periods) {
    const annual = period.annualWeightPct;
    for (const comp of period.examComponents ?? []) {
      const effective = Math.round((annual * comp.weightPct) / 100);
      criteria.push({
        label: `${period.label}: ${comp.label}`,
        weight: effective,
        examComponentId: comp.id,
        academicPeriodId: period.id,
        fromCalendar: true,
      });
    }
  }

  if (criteria.length === 0) return criteria;

  const total = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (total !== 100) {
    criteria[criteria.length - 1].weight += 100 - total;
  }
  return criteria;
}

export function hasActiveCalendar(calendar: ActiveCalendar | null | undefined): boolean {
  return sharedHasActiveCalendar(calendar, { requireId: true });
}

/** Apply calendar defaults to a syllabus form shell. */
export function applyCalendarToSyllabusForm<T extends Record<string, unknown>>(
  base: T,
  calendar: ActiveCalendar | null | undefined
): T {
  if (!hasActiveCalendar(calendar)) return base;

  const periods = normalizeCalendarPeriods(calendar!.periods);
  const gradingCriteria = gradingCriteriaFromCalendar(calendar);
  const firstPeriod = periods[0];

  return {
    ...base,
    calendarPatternId: calendar!.id,
    academicYear: academicYearLabel(calendar),
    weightsFromCalendar: gradingCriteria.length > 0,
    gradingCriteria:
      gradingCriteria.length > 0
        ? gradingCriteria
        : (base.gradingCriteria as SyllabusGradingCriterion[] | undefined) ?? [],
    units: [
      {
        week: periodWeekLabel(firstPeriod),
        topic: "",
        activities: "",
        assessment: "",
        academicPeriodId: firstPeriod.id ?? "",
      },
    ],
  };
}

export function periodContainingDate(
  periods: CalendarPeriod[],
  isoDate: string
): CalendarPeriod | null {
  return sharedPeriodContainingDate(periods, isoDate) as CalendarPeriod | null;
}

export function clampDateToPeriod(isoDate: string, period: CalendarPeriod): string {
  const start = toIsoDate(period.startDate);
  const end = toIsoDate(period.endDate);
  if (isoDate < start) return start;
  if (isoDate > end) return end;
  return isoDate;
}

/** Keep weekStart (Monday) inside period; shift back if week extends before period start. */
export function clampWeekStartToPeriod(
  weekStart: string,
  period: CalendarPeriod
): string {
  const start = toIsoDate(period.startDate);
  const end = toIsoDate(period.endDate);
  let clamped = weekStart;
  if (clamped < start) clamped = start;
  const weekEnd = addDays(clamped, 6);
  if (weekEnd > end) {
    const shifted = addDays(end, -6);
    clamped = shifted < start ? start : shifted;
  }
  return clamped;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function weekStartOf(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toIsoDate(d);
}

export function periodForWeekStart(
  periods: CalendarPeriod[],
  weekStart: string
): CalendarPeriod | null {
  const mid = addDays(weekStart, 3);
  return periodContainingDate(periods, mid);
}

/** Attach calendar period labels/ids to template unit rows without dropping content. */
export function mapTemplateUnitsToPeriods(
  units: SyllabusUnitBlock[],
  calendar: ActiveCalendar | null | undefined
): SyllabusUnitBlock[] {
  const periods = normalizeCalendarPeriods(calendar?.periods);
  if (periods.length === 0) return units;
  return units.map((unit, index) => {
    const period = periods[index] ?? periods[periods.length - 1];
    return {
      ...unit,
      academicPeriodId: period.id ?? "",
      week: periodWeekLabel(period),
    };
  });
}

export function parseSyllabusJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

/** Merge starter template or AI draft with active calendar metadata (keeps unit topics). */
export function mergeTemplateWithCalendar<T extends Record<string, unknown>>(
  template: T,
  calendar: ActiveCalendar | null | undefined
): T {
  const units = mapTemplateUnitsToPeriods(
    (Array.isArray(template.units) ? template.units : []) as SyllabusUnitBlock[],
    calendar
  );
  const calendarWeights = gradingCriteriaFromCalendar(calendar);
  const base = {
    ...template,
    units,
    weightsFromCalendar: calendarWeights.length > 0,
    gradingCriteria:
      calendarWeights.length > 0
        ? calendarWeights
        : (template.gradingCriteria as SyllabusGradingCriterion[] | undefined) ?? [],
  };
  if (!hasActiveCalendar(calendar)) return base as T;
  return {
    ...base,
    calendarPatternId: calendar!.id,
    academicYear: academicYearLabel(calendar),
  } as T;
}

export type SyllabusPlanRecord = {
  title?: string;
  subjectId?: string;
  gradeLevelId?: string;
  calendarPatternId?: string | null;
  academicYear?: string;
  standardsFramework?: string;
  textbooks?: string | null;
  differentiation?: string | null;
  accommodations?: string | null;
  objectives?: string | unknown;
  units?: string | unknown;
  gradingCriteria?: string | unknown;
  status?: string;
};

/** Hydrate syllabus builder form from an existing plan (edit / resubmit). */
export function syllabusFormFromPlan(
  plan: SyllabusPlanRecord,
  calendar?: ActiveCalendar | null
) {
  const gradingCriteria = parseSyllabusJsonField<SyllabusGradingCriterion[]>(
    plan.gradingCriteria,
    []
  );
  const shell = {
    title: plan.title || "",
    subjectId: plan.subjectId || "",
    gradeLevelId: plan.gradeLevelId || "",
    calendarPatternId: plan.calendarPatternId || "",
    academicYear: plan.academicYear || "",
    standardsFramework: plan.standardsFramework || "Cambridge International (CIE)",
    textbooks: plan.textbooks || "",
    differentiation: plan.differentiation || "",
    accommodations: plan.accommodations || "",
    objectives: parseSyllabusJsonField<string[]>(plan.objectives, [""]),
    units: parseSyllabusJsonField<SyllabusUnitBlock[]>(plan.units, [
      {
        week: "",
        topic: "",
        activities: "",
        assessment: "",
        academicPeriodId: "",
      },
    ]),
    gradingCriteria,
    weightsFromCalendar: gradingCriteria.some((c) => c.fromCalendar),
    status: plan.status || "PENDING",
  };

  if (hasActiveCalendar(calendar)) {
    return {
      ...shell,
      calendarPatternId: calendar!.id,
      academicYear: academicYearLabel(calendar),
      units: mapTemplateUnitsToPeriods(shell.units, calendar),
    };
  }
  return shell;
}

export function periodLabelById(
  calendar: ActiveCalendar | null | undefined,
  periodId?: string | null
): string | null {
  if (!periodId) return null;
  const period = normalizeCalendarPeriods(calendar?.periods).find((p) => p.id === periodId);
  return period?.label ?? null;
}
