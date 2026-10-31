import { validateScheduleExamForm } from "../src/features/exams/scheduleExamValidation.ts";
import {
  emptyScheduleForm,
  type ScheduleExamFormData,
} from "../src/features/exams/types.ts";
import type { ExamComponent, Period } from "../src/features/academic-calendar/types.ts";

let failures = 0;
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    failures += 1;
    console.error("FAILED:", message);
  } else {
    console.log("PASSED:", message);
  }
};

const period: Period = {
  id: "period-1",
  periodNumber: 1,
  label: "Term 1",
  shortCode: "T1",
  startDate: "2026-01-01",
  endDate: "2026-03-31",
  annualWeightPct: 100,
  examComponents: [],
};
const component: ExamComponent = {
  id: "component-1",
  label: "Midterm",
  shortCode: "MID",
  componentType: "MID_TERM",
  maxScore: 100,
  weightPct: 100,
  isGraded: true,
};
const validForm: ScheduleExamFormData = {
  ...emptyScheduleForm(),
  title: "Term 1 Midterm",
  periodId: "period-1",
  examComponentId: "component-1",
  startDate: "2026-02-10T09:00",
  endDate: "2026-02-10T11:00",
  gradeSubmissionDeadline: "2026-02-15T17:00",
  duration: "120",
  paperDueAt: "2026-02-09T17:00",
};

assert(
  Object.keys(validateScheduleExamForm(validForm, period, component)).length === 0,
  "accepts a complete exam within its academic period"
);
assert(
  Boolean(
    validateScheduleExamForm(
      { ...validForm, examComponentId: "" },
      period,
      null
    ).examComponentId
  ),
  "requires a valid selected exam component"
);
assert(
  Boolean(
    validateScheduleExamForm(
      { ...validForm, startDate: "", endDate: "" },
      period,
      component
    ).startDate
  ),
  "requires dates when the selected component has no saved date window"
);
assert(
  Boolean(
    validateScheduleExamForm(
      { ...validForm, endDate: "2026-02-10T08:00" },
      period,
      component
    ).endDate
  ),
  "rejects an end time before the start"
);
assert(
  Boolean(
    validateScheduleExamForm(
      { ...validForm, startDate: "2025-12-31T09:00" },
      period,
      component
    ).startDate
  ),
  "rejects dates outside the selected academic period"
);
assert(
  Boolean(
    validateScheduleExamForm(
      { ...validForm, duration: "0" },
      period,
      component
    ).duration
  ),
  "requires a positive whole-number duration"
);
assert(
  Boolean(
    validateScheduleExamForm(
      { ...validForm, paperDueAt: "2026-02-10T10:00" },
      period,
      component
    ).paperDueAt
  ),
  "rejects a paper deadline after the exam begins"
);

if (failures > 0) process.exit(1);
