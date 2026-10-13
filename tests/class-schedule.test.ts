/**
 * Class schedule / timetable pure helpers.
 * Run: npm run test:schedules
 */
import {
  DAY_LABELS,
  findScheduleConflicts,
  isEffectiveOn,
  isoWeekdayFromYmd,
  timesOverlap,
} from "../services/academic/src/lib/scheduleHelpers.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

console.log("=========================================");
console.log(" CLASS SCHEDULE HELPER TESTS");
console.log("=========================================\n");

assert(isoWeekdayFromYmd("2026-07-20") === 1, "2026-07-20 is Monday (1)");
assert(isoWeekdayFromYmd("2026-07-24") === 5, "2026-07-24 is Friday (5)");
assert(isoWeekdayFromYmd("2026-07-26") === 7, "2026-07-26 is Sunday (7)");
assert(DAY_LABELS[1] === "Monday", "day label Monday");

assert(timesOverlap("08:00", "08:45", "08:30", "09:15") === true, "overlapping periods");
assert(timesOverlap("08:00", "08:45", "08:45", "09:30") === false, "adjacent periods do not overlap");
assert(timesOverlap("08:00", "08:45", "09:00", "09:45") === false, "non-overlapping periods");

// Write ACL: Principal / VPI / School Admin only — Registrar view-only
import { canEditClassSchedule } from "../src/features/class-schedule/access.ts";
assert(canEditClassSchedule("PRINCIPAL") === true, "Principal may edit schedules");
assert(canEditClassSchedule("VPI") === true, "VPI may edit schedules");
assert(canEditClassSchedule("SCHOOL_ADMIN") === true, "School Admin may edit schedules");
assert(canEditClassSchedule("REGISTRAR") === false, "Registrar cannot edit schedules");
assert(canEditClassSchedule("TEACHER") === false, "Teacher cannot edit schedules");
assert(canEditClassSchedule("STUDENT") === false, "Student cannot edit schedules");
assert(
  canEditClassSchedule("TEACHER", ["action.schedules.manage"]) === true,
  "capability grant enables schedule edit"
);
assert(
  canEditClassSchedule("PRINCIPAL", ["nav.schedules"]) === false,
  "nav alone does not grant schedule write"
);

assert(isEffectiveOn("2026-07-24", "", "") === true, "open range effective");
assert(isEffectiveOn("2026-07-24", "2026-07-20", "2026-07-31") === true, "within range");
assert(isEffectiveOn("2026-07-19", "2026-07-20", "") === false, "before from");
assert(isEffectiveOn("2026-08-01", "", "2026-07-31") === false, "after to");

const classroomConflicts = findScheduleConflicts([
  {
    classroomId: "c1",
    teacherId: "t1",
    dayOfWeek: 1,
    schedulePeriodId: "p1",
    startTime: "08:00",
    endTime: "08:45",
  },
  {
    classroomId: "c1",
    teacherId: "t2",
    dayOfWeek: 1,
    schedulePeriodId: "p1",
    startTime: "08:00",
    endTime: "08:45",
  },
]);
assert(
  classroomConflicts.some((c) => c.code === "CLASSROOM_DOUBLE"),
  "classroom double-book detected"
);

const teacherConflicts = findScheduleConflicts([
  {
    classroomId: "c1",
    teacherId: "t1",
    dayOfWeek: 2,
    schedulePeriodId: "p1",
    startTime: "08:00",
    endTime: "08:45",
  },
  {
    classroomId: "c2",
    teacherId: "t1",
    dayOfWeek: 2,
    schedulePeriodId: "p2",
    startTime: "08:30",
    endTime: "09:15",
  },
]);
assert(
  teacherConflicts.some((c) => c.code === "TEACHER_DOUBLE"),
  "teacher double-book detected"
);

const clean = findScheduleConflicts([
  {
    classroomId: "c1",
    teacherId: "t1",
    dayOfWeek: 1,
    schedulePeriodId: "p1",
    startTime: "08:00",
    endTime: "08:45",
  },
  {
    classroomId: "c2",
    teacherId: "t2",
    dayOfWeek: 1,
    schedulePeriodId: "p1",
    startTime: "08:00",
    endTime: "08:45",
  },
]);
assert(clean.length === 0, "no false conflicts for different teachers/rooms");

const invalidDay = findScheduleConflicts([
  {
    classroomId: "c1",
    teacherId: "t1",
    dayOfWeek: 9,
    schedulePeriodId: "p1",
    startTime: "08:00",
    endTime: "08:45",
  },
]);
assert(invalidDay.some((c) => c.code === "INVALID_DAY"), "invalid dayOfWeek flagged");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All class-schedule helper tests passed");
