/**
 * Syllabus ↔ Academic Calendar alignment helpers.
 * Run: npx tsx tests/syllabus-calendar.test.ts
 */
import {
  academicYearLabel,
  applyCalendarToSyllabusForm,
  clampWeekStartToPeriod,
  gradingCriteriaFromCalendar,
  hasActiveCalendar,
  mapTemplateUnitsToPeriods,
  mergeTemplateWithCalendar,
  periodContainingDate,
  periodWeekLabel,
  syllabusFormFromPlan,
  weekStartOf,
} from "../src/features/academics-shared/syllabusCalendar.ts";
import { syllabusPayloadHasContentChanges } from "../services/academic/src/lib/syllabusCalendarValidation.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

const sampleCalendar = {
  id: "cal-1",
  name: "2025-2026 School Year",
  periods: [
    {
      id: "p1",
      label: "Term 1",
      startDate: "2025-09-01",
      endDate: "2025-12-15",
      annualWeightPct: 40,
      examComponents: [
        { id: "c1", label: "Midterm", weightPct: 30 },
        { id: "c2", label: "Final", weightPct: 70 },
      ],
    },
    {
      id: "p2",
      label: "Term 2",
      startDate: "2026-01-08",
      endDate: "2026-06-01",
      annualWeightPct: 60,
      examComponents: [{ id: "c3", label: "Final Exam", weightPct: 100 }],
    },
  ],
};

console.log("=========================================");
console.log(" SYLLABUS CALENDAR ALIGNMENT TESTS");
console.log("=========================================\n");

assert(hasActiveCalendar(sampleCalendar), "detects active calendar");
assert(!hasActiveCalendar(null), "null is not active");
assert(academicYearLabel(sampleCalendar) === "2025-2026 School Year", "uses calendar name");

const criteria = gradingCriteriaFromCalendar(sampleCalendar);
assert(criteria.length === 3, "flattens all exam components");
assert(
  criteria.reduce((s, c) => s + c.weight, 0) === 100,
  "annualized weights sum to 100"
);
assert(criteria[0].fromCalendar === true, "marks calendar-sourced criteria");
assert(
  criteria.some((c) => c.label.includes("Term 1: Midterm")),
  "labels include period prefix"
);

const applied = applyCalendarToSyllabusForm(
  { title: "", subjectId: "math", gradingCriteria: [] },
  sampleCalendar
);
assert(applied.calendarPatternId === "cal-1", "stores calendar pattern id");
assert(
  (applied.units as any[])[0].academicPeriodId === "p1",
  "first unit tied to first period"
);
assert(
  periodWeekLabel(sampleCalendar.periods[0]).includes("Term 1"),
  "period week label includes period name"
);

const midTerm1 = periodContainingDate(sampleCalendar.periods, "2025-10-15");
assert(midTerm1?.id === "p1", "finds period for date");

const clamped = clampWeekStartToPeriod(weekStartOf("2025-09-01"), sampleCalendar.periods[0]);
assert(clamped >= "2025-09-01", "clamps week start inside period");

const mapped = mapTemplateUnitsToPeriods(
  [{ week: "Weeks 1-4", topic: "A", activities: "", assessment: "" }],
  sampleCalendar
);
assert(mapped[0].academicPeriodId === "p1", "maps template unit to first period");

const merged = mergeTemplateWithCalendar(
  {
    title: "Template",
    units: [{ week: "W1", topic: "Topic", activities: "Act", assessment: "Quiz" }],
    gradingCriteria: [{ label: "Custom", weight: 100 }],
  },
  sampleCalendar
);
assert(merged.calendarPatternId === "cal-1", "mergeTemplate sets calendar id");
assert((merged.units as any[])[0].topic === "Topic", "mergeTemplate keeps unit topics");

const fromPlan = syllabusFormFromPlan(
  {
    title: "Saved",
    subjectId: "s1",
    gradeLevelId: "g1",
    calendarPatternId: "cal-1",
    academicYear: "2025-2026",
    objectives: JSON.stringify(["Obj 1"]),
    units: JSON.stringify([
      { week: "T1", topic: "Algebra", activities: "", assessment: "", academicPeriodId: "p1" },
    ]),
    gradingCriteria: JSON.stringify([{ label: "Midterm", weight: 100, fromCalendar: true }]),
    status: "REJECTED",
  },
  sampleCalendar
);
assert(fromPlan.title === "Saved", "syllabusFormFromPlan preserves title");
assert(fromPlan.weightsFromCalendar === true, "detects calendar weights on edit");

assert(syllabusPayloadHasContentChanges({ title: "x" }) === true, "detects content changes");
assert(syllabusPayloadHasContentChanges({ status: "APPROVED" }) === false, "status-only patch");
assert(syllabusPayloadHasContentChanges({ feedback: "note" }) === false, "feedback-only patch");

console.log("\n=========================================");
if (failed > 0) {
  console.error(` ${failed} test(s) failed`);
  process.exit(1);
}
console.log(" All syllabus calendar tests passed");
process.exit(0);
