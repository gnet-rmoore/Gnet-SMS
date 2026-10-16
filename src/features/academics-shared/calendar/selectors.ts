import type { AcademicCalendar, AcademicPeriod, ExamComponent } from "./types";

/**
 * Pure, reusable Academic Calendar selectors.
 *
 * These are the single implementations of "is the calendar ready?", "which
 * period is this date in?", and "what is the academic year label?". They are
 * intentionally lenient about input shape so every feature can call them with
 * whatever the calendar endpoint returned.
 */

/** Structural view accepted by the selectors (allows partial API payloads). */
export type CalendarPeriodLike = {
  id?: string;
  periodNumber?: number;
  label?: string;
  shortCode?: string;
  startDate?: string;
  endDate?: string;
  annualWeightPct?: number;
  examComponents?: CalendarComponentLike[];
};

export type CalendarComponentLike = {
  id?: string;
  label?: string;
  shortCode?: string;
  weightPct?: number;
  examStartDate?: string;
  examEndDate?: string;
  gradeSubmissionDeadline?: string;
};

export type CalendarLike = {
  id?: string;
  name?: string;
  patternType?: string;
  isActive?: boolean;
  periods?: CalendarPeriodLike[] | null;
};

function toIsoDate(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function normalizeCalendarPeriods(
  periods: CalendarPeriodLike[] | null | undefined
): CalendarPeriodLike[] {
  if (!Array.isArray(periods)) return [];
  return periods.map((p) => ({
    ...p,
    startDate: p.startDate ? toIsoDate(p.startDate) : p.startDate,
    endDate: p.endDate ? toIsoDate(p.endDate) : p.endDate,
    annualWeightPct: Number(p.annualWeightPct) || 0,
    examComponents: (p.examComponents ?? []).map((c) => ({
      ...c,
      weightPct: Number(c.weightPct) || 0,
    })),
  }));
}

/** A calendar is ready when it has been persisted and has at least one period. */
export function isCalendarReady(
  calendar: unknown,
  options?: { requireId?: boolean }
): boolean {
  if (!calendar || typeof calendar !== "object") return false;
  const obj = calendar as { id?: unknown; periods?: unknown };
  if (options?.requireId && !obj.id) return false;
  return Array.isArray(obj.periods) && obj.periods.length > 0;
}

/** Alias kept for callers that prefer the "active" phrasing. */
export function hasActiveCalendar(
  calendar: unknown,
  options?: { requireId?: boolean }
): boolean {
  return isCalendarReady(calendar, options);
}

/**
 * Display label for the academic year — the calendar name when present,
 * otherwise a derived `startYear-endYear` span from the period dates.
 */
export function academicYearLabel(
  calendar: AcademicCalendar | CalendarLike | null | undefined
): string {
  if (!calendar) return "";
  if (calendar.name?.trim()) return calendar.name.trim();
  const periods = normalizeCalendarPeriods(calendar.periods);
  if (periods.length === 0) return "";
  const first = periods[0].startDate;
  const last = periods[periods.length - 1].endDate;
  if (!first || !last) return "";
  const startYear = new Date(`${first}T12:00:00`).getFullYear();
  const endYear = new Date(`${last}T12:00:00`).getFullYear();
  return startYear === endYear ? String(startYear) : `${startYear}-${endYear}`;
}

export function periodsOf(
  calendar: AcademicCalendar | CalendarLike | null | undefined
): CalendarPeriodLike[] {
  return normalizeCalendarPeriods(calendar?.periods);
}

export function periodById(
  calendar: AcademicCalendar | CalendarLike | null | undefined,
  periodId?: string | null
): CalendarPeriodLike | null {
  if (!periodId) return null;
  return periodsOf(calendar).find((p) => String(p.id) === String(periodId)) ?? null;
}

/** The period whose [startDate, endDate] contains the given ISO date. */
export function periodContainingDate(
  periods: CalendarPeriodLike[] | null | undefined,
  isoDate: string
): CalendarPeriodLike | null {
  if (!isoDate) return null;
  const normalized = normalizeCalendarPeriods(periods);
  return normalized.find((p) => isoDate >= (p.startDate ?? "") && isoDate <= (p.endDate ?? "")) ?? null;
}

/**
 * Resolve the "current" period for a reference date (defaults to today).
 * Falls back to the first period when the reference date is outside all
 * period windows (e.g. before term starts).
 */
export function currentPeriod(
  calendar: AcademicCalendar | CalendarLike | null | undefined,
  referenceDate: string | Date = new Date()
): CalendarPeriodLike | null {
  const periods = periodsOf(calendar);
  if (periods.length === 0) return null;
  const iso = toIsoDate(referenceDate);
  return periodContainingDate(periods, iso) ?? periods[0];
}

export function examComponentsForPeriod(
  period: CalendarPeriodLike | null | undefined
): CalendarComponentLike[] {
  return period?.examComponents ?? [];
}

export function examComponentsForCalendar(
  calendar: AcademicCalendar | CalendarLike | null | undefined
): CalendarComponentLike[] {
  return periodsOf(calendar).flatMap((p) => p.examComponents ?? []);
}

/** Convenience: strongly-typed period cast for feature code that knows its shape. */
export function asAcademicPeriod(
  period: CalendarPeriodLike | null | undefined
): AcademicPeriod | null {
  if (!period || !period.startDate || !period.endDate) return null;
  return period as AcademicPeriod;
}

/** Convenience: strongly-typed component cast. */
export function asExamComponent(
  component: CalendarComponentLike | null | undefined
): ExamComponent | null {
  if (!component || !component.label) return null;
  return component as ExamComponent;
}
