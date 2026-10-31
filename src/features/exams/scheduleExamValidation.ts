import type { ExamComponent, Period } from "../academic-calendar/types";
import type { ScheduleExamFormData } from "./types";

export type ScheduleExamField =
  | "periodId"
  | "examComponentId"
  | "title"
  | "startDate"
  | "endDate"
  | "gradeSubmissionDeadline"
  | "duration"
  | "paperDueAt";

export type ScheduleExamErrors = Partial<Record<ScheduleExamField, string>>;

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function day(value?: string | null): string {
  return value?.slice(0, 10) || "";
}

export function validateScheduleExamForm(
  form: ScheduleExamFormData,
  period: Period | null,
  component: ExamComponent | null
): ScheduleExamErrors {
  const errors: ScheduleExamErrors = {};
  if (!period) errors.periodId = "Choose an academic period.";
  if (!component || String(component.id) !== form.examComponentId) {
    errors.examComponentId = "Choose an assessment component.";
  }
  if (!form.title.trim()) errors.title = "Enter an exam title.";

  const startValue = form.startDate || component?.examStartDate || "";
  const endValue =
    form.endDate ||
    component?.examEndDate ||
    component?.examStartDate ||
    "";
  const startDate = parseDate(startValue);
  const endDate = parseDate(endValue);

  if (!startDate) errors.startDate = "Enter a valid exam start date and time.";
  if (!endDate) errors.endDate = "Enter a valid exam end date and time.";
  if (startDate && endDate && endDate < startDate) {
    errors.endDate = "The exam end must be on or after its start.";
  }
  if (period && startDate && day(startValue) < day(period.startDate)) {
    errors.startDate = "The exam must start within the selected academic period.";
  }
  if (period && endDate && day(endValue) > day(period.endDate)) {
    errors.endDate = "The exam must end within the selected academic period.";
  }

  const duration = Number(form.duration);
  if (!Number.isInteger(duration) || duration < 1) {
    errors.duration = "Enter a whole number of minutes greater than zero.";
  }

  if (form.gradeSubmissionDeadline && !parseDate(form.gradeSubmissionDeadline)) {
    errors.gradeSubmissionDeadline = "Enter a valid grade submission deadline.";
  }
  const paperDueAt = parseDate(form.paperDueAt);
  if (form.paperDueAt && !paperDueAt) {
    errors.paperDueAt = "Enter a valid paper deadline.";
  } else if (paperDueAt && startDate && paperDueAt > startDate) {
    errors.paperDueAt = "The paper deadline must be on or before the exam start.";
  }

  return errors;
}
