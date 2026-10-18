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
import {
  computeClassroomOccupancy,
  computeTeacherSlotAvailability,
  computeWorkloadWarnings,
  freePeriodIdsForClassroom,
  gapMinutes,
  suggestAssignments,
  teacherDayProfile,
  type PeriodWindow,
  type ScheduledItem,
} from "../services/academic/src/lib/availabilityHelpers.ts";

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

console.log("\n--- Slot availability & workload helpers ---");

const periods: PeriodWindow[] = [
  { id: "p1", label: "P1", shortCode: "P1", startTime: "08:00", endTime: "08:45", orderIndex: 0 },
  { id: "p2", label: "P2", shortCode: "P2", startTime: "08:50", endTime: "09:35", orderIndex: 1 },
  { id: "p3", label: "P3", shortCode: "P3", startTime: "09:40", endTime: "10:25", orderIndex: 2 },
  { id: "p4", label: "P4", shortCode: "P4", startTime: "10:30", endTime: "11:15", orderIndex: 3 },
];

assert(gapMinutes("08:45", "08:50") === 5, "gapMinutes computes 5 min");
assert(gapMinutes("08:45", "08:30") === 0, "negative gap clamps to 0");
assert(gapMinutes("bad", "08:50") === null, "invalid time returns null gap");

const entry = (
  classroomId: string,
  teacherId: string,
  dayOfWeek: number,
  schedulePeriodId: string,
  extra?: Partial<ScheduledItem>
): ScheduledItem => ({
  classroomId,
  classroomName: classroomId,
  teacherId,
  teacherName: teacherId,
  subjectId: null,
  subjectName: null,
  dayOfWeek,
  schedulePeriodId,
  ...extra,
});

const busyT1 = [entry("c1", "t1", 1, "p1")];
const p1Profile = teacherDayProfile(busyT1, periods, "t1", 1);
assert(p1Profile.lessons === 1, "teacherDayProfile counts 1 lesson");
assert(p1Profile.busyPeriodIds.has("p1"), "teacherDayProfile marks busy period");

const streakEntries = [
  entry("c1", "t1", 2, "p1"),
  entry("c1", "t1", 2, "p2"),
  entry("c1", "t1", 2, "p3"),
  entry("c1", "t1", 2, "p4"),
];
assert(
  teacherDayProfile(streakEntries, periods, "t1", 2).longestStreak === 4,
  "back-to-back lessons form a streak of 4"
);

const slotAvail = computeTeacherSlotAvailability({
  periods,
  entries: busyT1,
  dayOfWeek: 1,
  schedulePeriodId: "p1",
  teachers: [
    { id: "t1", name: "T1" },
    { id: "t2", name: "T2" },
  ],
});
const t1 = slotAvail.find((a) => a.teacherId === "t1")!;
const t2 = slotAvail.find((a) => a.teacherId === "t2")!;
assert(t1.status === "BUSY", "booked teacher marked BUSY");
assert(t2.status === "AVAILABLE", "free teacher marked AVAILABLE");
assert(t2.score > t1.score, "available teacher ranks above busy teacher");
assert(slotAvail[0].teacherId === "t2", "available teacher sorted first");

const restAvail = computeTeacherSlotAvailability({
  periods,
  entries: busyT1,
  dayOfWeek: 1,
  schedulePeriodId: "p2",
  teachers: [{ id: "t1", name: "T1" }],
})[0];
assert(restAvail.status === "AVAILABLE", "teacher free in adjacent period");
assert(restAvail.gapBeforeMin === 5, "5 min gap before adjacent period");
assert(restAvail.restBefore === false, "5 min gap is not real rest");

const laterAvail = computeTeacherSlotAvailability({
  periods,
  entries: busyT1,
  dayOfWeek: 1,
  schedulePeriodId: "p4",
  teachers: [{ id: "t1", name: "T1" }],
})[0];
assert(laterAvail.gapBeforeMin === 105, "gap before later period computed");
assert(laterAvail.restBefore === true, "105 min gap counts as rest");

const fitAvail = computeTeacherSlotAvailability({
  periods,
  entries: busyT1,
  dayOfWeek: 1,
  schedulePeriodId: "p2",
  teachers: [
    { id: "t1", name: "T1" },
    { id: "t2", name: "T2" },
  ],
  subjectId: "s1",
  subjectIdsTaught: new Set(["t1|s1"]),
  classroom: { id: "c2", name: "C2", subjectId: "s1", ownerTeacherId: "t2" },
  classrooms: [{ id: "c2", name: "C2", subjectId: "s1", ownerTeacherId: "t2" }],
});
assert(fitAvail.find((a) => a.teacherId === "t2")!.subjectFit === "OWN_CLASS", "class teacher gets OWN_CLASS fit");
assert(
  fitAvail.find((a) => a.teacherId === "t1")!.subjectFit === "TEACHES_SUBJECT",
  "subject teacher gets TEACHES_SUBJECT fit"
);

const freeIds = freePeriodIdsForClassroom(periods, busyT1, "c1", 1);
assert(freeIds.join(",") === "p2,p3,p4", "classroom free periods exclude booked slot");

const warningEntries = [
  ...streakEntries,
  entry("c2", "t1", 2, "p5"),
  entry("c2", "t1", 2, "p6"),
  entry("c2", "t1", 2, "p7"),
  entry("c2", "t1", 2, "p8"),
];
const periods8: PeriodWindow[] = [
  ...periods,
  { id: "p5", startTime: "11:20", endTime: "12:05", orderIndex: 4 },
  { id: "p6", startTime: "12:10", endTime: "12:55", orderIndex: 5 },
  { id: "p7", startTime: "13:00", endTime: "13:45", orderIndex: 6 },
  { id: "p8", startTime: "13:50", endTime: "14:35", orderIndex: 7 },
];
const warnings = computeWorkloadWarnings(warningEntries, periods8);
assert(warnings.some((w) => w.code === "LONG_STREAK"), "long back-to-back streak warns");
assert(
  warnings.some((w) => w.code === "OVERLOADED" && w.lessons === 8),
  "overloaded day warns"
);

const occupancy = computeClassroomOccupancy(
  busyT1,
  periods,
  [
    { id: "c1", name: "C1" },
    { id: "c2", name: "C2" },
  ],
  [1, 2, 3, 4, 5]
);
assert(occupancy[0].classroomId === "c2", "least occupied classroom sorted first");
assert(occupancy.find((o) => o.classroomId === "c1")!.fillRate === 5, "fill rate = 1/20 = 5%");

const suggestions = suggestAssignments({
  periods,
  entries: [],
  classroom: { id: "c1", name: "C1", subjectId: "s1", ownerTeacherId: "t1" },
  teachers: [
    { id: "t1", name: "T1" },
    { id: "t2", name: "T2" },
  ],
  subjects: [{ id: "s1", name: "Math" }],
  allowedSubjectIds: ["s1"],
  gridDays: [1],
});
assert(suggestions.length === periods.length, "suggestions fill every empty period");
assert(
  suggestions.every((s) => s.subjectId === "s1" && s.subjectName === "Math"),
  "suggestions respect class subject"
);
assert(
  new Set(suggestions.map((s) => `${s.dayOfWeek}|${s.schedulePeriodId}`)).size === suggestions.length,
  "suggestions never double-book a class slot"
);
assert(
  suggestions[0].teacherId === "t1",
  "suggestions prefer the class teacher first"
);
assert(
  new Set(suggestions.map((s) => s.teacherId)).size > 1,
  "suggestions rotate teachers to preserve rest (no endless streak)"
);

const subjectAwareSuggestions = suggestAssignments({
  periods,
  entries: [entry("cX", "t2", 5, "p1", { subjectId: "s1", subjectName: "Math" })],
  classroom: { id: "c9", name: "C9", subjectId: "s1" },
  teachers: [
    { id: "t1", name: "T1" },
    { id: "t2", name: "T2" },
  ],
  subjects: [{ id: "s1", name: "Math" }],
  allowedSubjectIds: ["s1"],
  gridDays: [1],
});
assert(
  subjectAwareSuggestions[0].teacherId === "t2",
  "suggestions prefer a teacher who already teaches the subject"
);

const splitSuggestions = suggestAssignments({
  periods,
  entries: [],
  classroom: { id: "c1", name: "C1" },
  teachers: [
    { id: "t1", name: "T1" },
    { id: "t2", name: "T2" },
  ],
  subjects: [
    { id: "s1", name: "Math" },
    { id: "s2", name: "Science" },
  ],
  allowedSubjectIds: ["s1", "s2"],
  gridDays: [1],
});
const subjectCounts = new Map<string, number>();
for (const s of splitSuggestions) subjectCounts.set(s.subjectId!, (subjectCounts.get(s.subjectId!) || 0) + 1);
assert(subjectCounts.get("s1")! >= 2 && subjectCounts.get("s2")! >= 2, "multiple class subjects balanced");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All class-schedule helper tests passed");
