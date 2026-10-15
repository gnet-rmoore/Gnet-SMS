#!/usr/bin/env tsx

import {
  computeExamEnvelope,
  synthesizeScheduleFromExam,
  validateScheduleWindow,
} from "../services/academic/src/lib/examSchedule";

let failures = 0;
const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
    return;
  }
  console.log("PASSED:", msg);
};

// validateScheduleWindow
{
  const ok = validateScheduleWindow(new Date("2026-01-01T09:00:00Z"), new Date("2026-01-01T11:00:00Z"));
  assert(ok.ok, "start before end is valid");
  const bad = validateScheduleWindow(new Date("2026-01-01T11:00:00Z"), new Date("2026-01-01T09:00:00Z"));
  assert(!bad.ok && bad.error, "end before start is invalid");
  const bad2 = validateScheduleWindow("bad", "also-bad");
  assert(!bad2.ok, "invalid dates are rejected");
}

// computeExamEnvelope
{
  const now = new Date();
  const env = computeExamEnvelope(
    [
      { startAt: new Date(now.getTime() - 2 * 3600_000), endAt: new Date(now.getTime() + 1 * 3600_000) },
      { startAt: new Date(now.getTime() - 1 * 3600_000), endAt: new Date(now.getTime() + 2 * 3600_000) },
    ],
    { startDate: now, endDate: now }
  );
  assert(env.startDate.getTime() <= (now.getTime() - 2 * 3600_000) + 5, "env expands to earliest start");
  assert(env.endDate.getTime() >= (now.getTime() + 2 * 3600_000) - 5, "env expands to latest end");

  const fallback = computeExamEnvelope([], { startDate: new Date("2026-01-01T09:00:00Z"), endDate: new Date("2026-01-01T10:00:00Z") });
  assert(fallback.startDate.getTime() === new Date("2026-01-01T09:00:00Z").getTime(), "fallback used when no schedules");
}

// synthesizeScheduleFromExam
{
  const exam = {
    id: "exam-1",
    schoolId: "school-1",
    classId: "c-1",
    startDate: new Date("2026-01-01T09:00:00Z"),
    endDate: new Date("2026-01-01T11:00:00Z"),
  };
  const s = synthesizeScheduleFromExam(exam);
  assert(s.synthetic === true, "synthetic flag set");
  assert(s.examId === "exam-1", "examId propagated");
  assert(s.classId === "c-1", "classId propagated");
}

if (failures) {
  console.error(`FAILED: ${failures} test(s)`);
  process.exit(1);
}
console.log("All exam-schedule pure tests passed");
