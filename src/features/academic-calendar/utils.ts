import {
  format,
  parseISO,
  addDays,
  differenceInCalendarDays,
  isValid,
  isBefore,
  isAfter,
  isEqual,
} from "date-fns";
import type { CalendarTemplate, ExamComponent, Period } from "./types";

/** Field-keyed validation map, e.g. `periods.0.endDate` */
export type FieldErrors = Record<string, string>;

export function toDateInput(value?: string | Date | null): string {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = parseISO(value.slice(0, 10));
  return isValid(d) ? d : null;
}

/** e.g. Feb. 12, 2026 */
export function formatFriendlyDate(value?: string | Date | null): string {
  if (!value) return "";
  const d =
    typeof value === "string"
      ? parseISO(String(value).slice(0, 10))
      : value;
  if (!isValid(d)) return "";
  return format(d, "MMM'.' d, yyyy");
}

/** e.g. Feb. 12, 2026, 5:00 PM */
export function formatFriendlyDateTime(value?: string | Date | null): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime()) || !isValid(d)) return "";
  return format(d, "MMM'.' d, yyyy, h:mm a");
}

export function toDateTimeLocal(value?: string | Date | null): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) {
    return typeof value === "string" ? value.substring(0, 16) : "";
  }
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function formatDisplayDate(value?: string | Date | null): string {
  const friendly = formatFriendlyDate(value);
  return friendly || "—";
}

export function weightsEqual100(total: number): boolean {
  return Math.abs(total - 100) < 0.05;
}

export function patternLabel(patternType: string): string {
  switch (patternType) {
    case "SEMESTER":
      return "Semester system";
    case "TWO_TERM":
      return "Two-term system";
    case "THREE_TERM":
      return "Three-term system";
    case "CUSTOM":
      return "Custom";
    default:
      return patternType.replace(/_/g, " ");
  }
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/** Split a school-year range evenly across periods (no gaps / overlaps). */
export function distributePeriodsEvenly(
  periods: Period[],
  yearStart: string,
  yearEnd: string
): Period[] {
  const start = parseDate(yearStart);
  const end = parseDate(yearEnd);
  if (!start || !end || !isBefore(start, end)) {
    return periods;
  }

  const n = Math.max(periods.length, 1);
  const totalDays = differenceInCalendarDays(end, start) + 1;
  if (totalDays < n) return periods;

  let cursor = start;
  return periods.map((p, i) => {
    const remaining = n - i;
    const daysLeft = differenceInCalendarDays(end, cursor) + 1;
    const chunk = Math.max(1, Math.floor(daysLeft / remaining));
    const chunkEnd = i === n - 1 ? end : addDays(cursor, chunk - 1);
    const row = {
      ...p,
      startDate: format(cursor, "yyyy-MM-dd"),
      endDate: format(chunkEnd, "yyyy-MM-dd"),
    };
    cursor = addDays(chunkEnd, 1);
    return row;
  });
}

/**
 * When a period date changes, keep neighbors contiguous:
 * previous ends the day before this starts; next starts the day after this ends.
 */
export function applyPeriodDateChange(
  periods: Period[],
  idx: number,
  field: "startDate" | "endDate",
  value: string
): Period[] {
  const next = periods.map((p) => ({ ...p }));
  next[idx] = { ...next[idx], [field]: value };

  const start = parseDate(next[idx].startDate);
  const end = parseDate(next[idx].endDate);
  if (start && end && !isBefore(start, end) && !isEqual(start, end)) {
    if (field === "startDate") {
      next[idx].endDate = format(addDays(start, 30), "yyyy-MM-dd");
    } else if (field === "endDate") {
      next[idx].startDate = format(addDays(end, -30), "yyyy-MM-dd");
    }
  }

  // Cascade forward from this period
  for (let i = idx; i < next.length - 1; i++) {
    const curEnd = parseDate(next[i].endDate);
    if (!curEnd) continue;
    const nextStart = addDays(curEnd, 1);
    const nextStartStr = format(nextStart, "yyyy-MM-dd");
    const prevDuration = (() => {
      const os = parseDate(periods[i + 1]?.startDate);
      const oe = parseDate(periods[i + 1]?.endDate);
      if (os && oe) return Math.max(1, differenceInCalendarDays(oe, os));
      return 90;
    })();
    let nextEnd = parseDate(next[i + 1].endDate);
    if (!nextEnd || !isAfter(nextEnd, nextStart)) {
      nextEnd = addDays(nextStart, prevDuration);
    }
    next[i + 1] = {
      ...next[i + 1],
      startDate: nextStartStr,
      endDate: format(nextEnd, "yyyy-MM-dd"),
    };
  }

  // Cascade backward when start date changes
  if (field === "startDate" && idx > 0 && value) {
    const thisStart = parseDate(value);
    if (thisStart) {
      const prevEnd = addDays(thisStart, -1);
      const prevEndStr = format(prevEnd, "yyyy-MM-dd");
      let prevStart = parseDate(next[idx - 1].startDate);
      if (!prevStart || !isBefore(prevStart, prevEnd)) {
        prevStart = addDays(prevEnd, -30);
      }
      next[idx - 1] = {
        ...next[idx - 1],
        startDate: format(prevStart, "yyyy-MM-dd"),
        endDate: prevEndStr,
      };
    }
  }

  return next;
}

/** Split a period’s exam window evenly across exam components. */
export function distributeExamComponentsEvenly(
  components: ExamComponent[],
  windowStart: string,
  windowEnd: string
): ExamComponent[] {
  const start = parseDate(windowStart);
  const end = parseDate(windowEnd);
  if (!start || !end || !isBefore(start, end)) {
    return components;
  }
  if (!components.length) return components;

  const n = components.length;
  const totalDays = differenceInCalendarDays(end, start) + 1;
  if (totalDays < n) return components;

  let cursor = start;
  return components.map((c, i) => {
    const remaining = n - i;
    const daysLeft = differenceInCalendarDays(end, cursor) + 1;
    const chunk = Math.max(1, Math.floor(daysLeft / remaining));
    const chunkEnd = i === n - 1 ? end : addDays(cursor, chunk - 1);
    const startStr = format(cursor, "yyyy-MM-dd");
    const endStr = format(chunkEnd, "yyyy-MM-dd");
    const row: ExamComponent = {
      ...c,
      examStartDate: startStr,
      examEndDate: endStr,
      gradeSubmissionDeadline: `${endStr}T23:59`,
    };
    cursor = addDays(chunkEnd, 1);
    return row;
  });
}

/**
 * When an exam component date changes, keep neighbors contiguous within the period.
 * Also nudges grade deadline to the exam end evening when end date changes.
 */
export function applyExamComponentDateChange(
  components: ExamComponent[],
  idx: number,
  field: "examStartDate" | "examEndDate",
  value: string
): ExamComponent[] {
  const next = components.map((c) => ({ ...c }));
  next[idx] = { ...next[idx], [field]: value };

  const start = parseDate(next[idx].examStartDate);
  const end = parseDate(next[idx].examEndDate);
  if (start && end && !isBefore(start, end) && !isEqual(start, end)) {
    if (field === "examStartDate") {
      next[idx].examEndDate = format(addDays(start, 7), "yyyy-MM-dd");
    } else {
      next[idx].examStartDate = format(addDays(end, -7), "yyyy-MM-dd");
    }
  }

  if (field === "examEndDate" && value) {
    next[idx].gradeSubmissionDeadline = `${value.slice(0, 10)}T23:59`;
  }

  for (let i = idx; i < next.length - 1; i++) {
    const curEnd = parseDate(next[i].examEndDate);
    if (!curEnd) continue;
    const nextStart = addDays(curEnd, 1);
    const nextStartStr = format(nextStart, "yyyy-MM-dd");
    const prevDuration = (() => {
      const os = parseDate(components[i + 1]?.examStartDate);
      const oe = parseDate(components[i + 1]?.examEndDate);
      if (os && oe) return Math.max(1, differenceInCalendarDays(oe, os));
      return 14;
    })();
    let nextEnd = parseDate(next[i + 1].examEndDate);
    if (!nextEnd || !isAfter(nextEnd, nextStart)) {
      nextEnd = addDays(nextStart, prevDuration);
    }
    const endStr = format(nextEnd, "yyyy-MM-dd");
    next[i + 1] = {
      ...next[i + 1],
      examStartDate: nextStartStr,
      examEndDate: endStr,
      gradeSubmissionDeadline: next[i + 1].gradeSubmissionDeadline || `${endStr}T23:59`,
    };
  }

  if (field === "examStartDate" && idx > 0 && value) {
    const thisStart = parseDate(value);
    if (thisStart) {
      const prevEnd = addDays(thisStart, -1);
      const prevEndStr = format(prevEnd, "yyyy-MM-dd");
      let prevStart = parseDate(next[idx - 1].examStartDate);
      if (!prevStart || !isBefore(prevStart, prevEnd)) {
        prevStart = addDays(prevEnd, -7);
      }
      next[idx - 1] = {
        ...next[idx - 1],
        examStartDate: format(prevStart, "yyyy-MM-dd"),
        examEndDate: prevEndStr,
        gradeSubmissionDeadline: `${prevEndStr}T23:59`,
      };
    }
  }

  return next;
}

export function inferYearRange(periods: Period[]): { start: string; end: string } {
  const starts = periods.map((p) => parseDate(p.startDate)).filter(Boolean) as Date[];
  const ends = periods.map((p) => parseDate(p.endDate)).filter(Boolean) as Date[];
  if (!starts.length || !ends.length) {
    const y = new Date().getFullYear();
    return { start: `${y}-09-01`, end: `${y + 1}-06-30` };
  }
  const minStart = starts.reduce((a, b) => (isBefore(a, b) ? a : b));
  const maxEnd = ends.reduce((a, b) => (isAfter(a, b) ? a : b));
  return {
    start: format(minStart, "yyyy-MM-dd"),
    end: format(maxEnd, "yyyy-MM-dd"),
  };
}

/** Field-level period validation with short, local messages. */
export function validatePeriodFields(cfg: CalendarTemplate): FieldErrors {
  const errors: FieldErrors = {};
  let totalAnnualWeight = 0;

  cfg.periods.forEach((p, idx) => {
    const name = p.label?.trim() || `Period ${idx + 1}`;
    if (!p.label?.trim()) errors[`periods.${idx}.label`] = "Enter a name for this period.";
    if (!p.shortCode?.trim()) errors[`periods.${idx}.shortCode`] = "Add a short code (e.g. T1).";
    if (!p.startDate) errors[`periods.${idx}.startDate`] = "Choose a start date.";
    if (!p.endDate) errors[`periods.${idx}.endDate`] = "Choose an end date.";

    const s = parseDate(p.startDate);
    const e = parseDate(p.endDate);
    if (s && e && !isBefore(s, e)) {
      errors[`periods.${idx}.endDate`] = "End date must be after the start date.";
    }
    if (p.annualWeightPct < 0) {
      errors[`periods.${idx}.annualWeightPct`] = "Weight cannot be negative.";
    }
    totalAnnualWeight += Number(p.annualWeightPct) || 0;
  });

  for (let i = 0; i < cfg.periods.length - 1; i++) {
    const p1 = cfg.periods[i];
    const p2 = cfg.periods[i + 1];
    const e1 = parseDate(p1.endDate);
    const s2 = parseDate(p2.startDate);
    if (e1 && s2 && !isBefore(e1, s2)) {
      const label1 = p1.label?.trim() || `Period ${i + 1}`;
      errors[`periods.${i}.endDate`] =
        `Overlaps the next period. End before ${formatFriendlyDate(p2.startDate) || "the next start"}, or use “Distribute evenly”.`;
      errors[`periods.${i + 1}.startDate`] =
        `Overlaps ${label1}. Start after ${formatFriendlyDate(p1.endDate) || "the previous end"}, or use “Distribute evenly”.`;
    }
  }

  if (!weightsEqual100(totalAnnualWeight)) {
    errors.annualWeight = `Period weights must add up to 100% (now ${totalAnnualWeight.toFixed(2)}%).`;
  }

  return errors;
}

export function validateComponentFields(cfg: CalendarTemplate): FieldErrors {
  const errors: FieldErrors = {};

  cfg.periods.forEach((p, pIdx) => {
    const periodName = p.label?.trim() || `Period ${pIdx + 1}`;
    if (!p.examComponents.length) {
      errors[`periods.${pIdx}.components`] = `Add at least one exam component for ${periodName}.`;
    }

    let totalCompWeight = 0;
    const seenCodes = new Set<string>();

    p.examComponents.forEach((c, cIdx) => {
      const key = `periods.${pIdx}.components.${cIdx}`;
      if (!c.componentType) errors[`${key}.componentType`] = "Select a type.";
      if (!c.label) errors[`${key}.label`] = "Enter a label.";
      if (!c.shortCode?.trim()) {
        errors[`${key}.shortCode`] = "Add a short code.";
      } else {
        const upper = c.shortCode.trim().toUpperCase();
        if (seenCodes.has(upper)) errors[`${key}.shortCode`] = "This short code is already used.";
        seenCodes.add(upper);
      }
      if (c.maxScore <= 0) errors[`${key}.maxScore`] = "Must be greater than 0.";
      if (c.weightPct < 0) errors[`${key}.weightPct`] = "Cannot be negative.";

      const es = parseDate(c.examStartDate);
      const ee = parseDate(c.examEndDate);
      const ps = parseDate(p.startDate);
      const pe = parseDate(p.endDate);

      if (es && ee && !isBefore(es, ee) && !isEqual(es, ee)) {
        errors[`${key}.examEndDate`] = "Exam end must be after exam start.";
      }
      if (es && ps && isBefore(es, ps)) {
        errors[`${key}.examStartDate`] = `Cannot be before ${periodName} starts (${formatFriendlyDate(p.startDate)}).`;
      }
      if (ee && pe && isAfter(ee, pe)) {
        errors[`${key}.examEndDate`] = `Cannot be after ${periodName} ends (${formatFriendlyDate(p.endDate)}).`;
      }
      if (c.gradeSubmissionDeadline && es) {
        const dl = new Date(c.gradeSubmissionDeadline);
        if (!Number.isNaN(dl.getTime()) && dl < es) {
          errors[`${key}.gradeSubmissionDeadline`] = "Deadline must be on or after the exam start.";
        }
      }

      totalCompWeight += Number(c.weightPct) || 0;
    });

    if (p.examComponents.length > 0 && !weightsEqual100(totalCompWeight)) {
      errors[`periods.${pIdx}.componentWeight`] =
        `Weights for ${periodName} must total 100% (now ${totalCompWeight.toFixed(2)}%).`;
    }
  });

  return errors;
}

export function fieldErrorsList(errors: FieldErrors): string[] {
  return Object.values(errors);
}

/** Fill missing period dates for a template (sequential school-year blocks). */
export function seedTemplateDates(template: CalendarTemplate): CalendarTemplate {
  const year = new Date().getFullYear();
  let cursor = new Date(year, 8, 1);
  const monthsPerPeriod = template.periods.length <= 2 ? 5 : 3;

  const periods: Period[] = template.periods.map((p, idx) => {
    const start = p.startDate ? parseDate(p.startDate) || new Date(cursor) : new Date(cursor);
    const end = p.endDate
      ? parseDate(p.endDate) || addMonths(start, monthsPerPeriod)
      : (() => {
          const e = addMonths(start, monthsPerPeriod);
          e.setDate(e.getDate() - 1);
          return e;
        })();

    cursor = addDays(end, 1);

    const examComponents: ExamComponent[] = (p.examComponents || []).map((c) => ({
      ...c,
      isGraded: c.isGraded ?? true,
      examStartDate: toDateInput(c.examStartDate),
      examEndDate: toDateInput(c.examEndDate),
      gradeSubmissionDeadline: toDateTimeLocal(c.gradeSubmissionDeadline),
    }));

    return {
      ...p,
      periodNumber: p.periodNumber || idx + 1,
      startDate: toDateInput(start),
      endDate: toDateInput(end),
      examComponents,
    };
  });

  return { ...template, periods };
}

export function hydrateCalendar(cal: any): CalendarTemplate & { id?: string; isActive?: boolean } {
  return {
    id: cal.id,
    name: cal.name,
    patternType: cal.patternType,
    isActive: cal.isActive,
    periods: (cal.periods || []).map((p: any, idx: number) => ({
      id: p.id,
      periodNumber: p.periodNumber ?? idx + 1,
      label: p.label || "",
      shortCode: p.shortCode || "",
      startDate: toDateInput(p.startDate),
      endDate: toDateInput(p.endDate),
      annualWeightPct: Number(p.annualWeightPct) || 0,
      examComponents: (p.examComponents || []).map((c: any) => ({
        id: c.id,
        label: c.label || "",
        shortCode: c.shortCode || "",
        componentType: c.componentType || "CUSTOM",
        maxScore: Number(c.maxScore) || 100,
        weightPct: Number(c.weightPct) || 0,
        isGraded: c.isGraded ?? true,
        examStartDate: toDateInput(c.examStartDate),
        examEndDate: toDateInput(c.examEndDate),
        gradeSubmissionDeadline: toDateTimeLocal(c.gradeSubmissionDeadline),
      })),
    })),
  };
}
