export type SchedulePeriodDto = {
  id: string;
  bellScheduleId: string;
  schoolId: string;
  periodNumber: number;
  label: string;
  shortCode: string;
  startTime: string;
  endTime: string;
  orderIndex: number;
};

export type BellScheduleDto = {
  id: string;
  schoolId: string;
  schoolYearId: string | null;
  name: string;
  isActive: boolean;
  createdById: string;
  periods: SchedulePeriodDto[];
};

export type TimetableEntryDto = {
  id: string;
  schoolId: string;
  bellScheduleId: string;
  classroomId: string;
  classroomName: string;
  teacherId: string;
  teacherName: string;
  subjectId: string | null;
  subjectName: string | null;
  dayOfWeek: number;
  schedulePeriodId: string;
  periodLabel: string | null;
  periodShortCode: string | null;
  startTime: string | null;
  endTime: string | null;
  effectiveFrom: string;
  effectiveTo: string;
  locationOverride: string | null;
};

export type ClassroomOption = {
  id: string;
  name: string;
  subjectId?: string | null;
  ownerTeacherId?: string;
  subject?: { id: string; name: string } | null;
  ownerTeacher?: { id: string; name: string } | null;
};

export type DraftCell = {
  classroomId: string;
  teacherId: string;
  teacherName: string;
  subjectId: string | null;
  subjectName: string | null;
  dayOfWeek: number;
  schedulePeriodId: string;
};

export type SubjectFit = "OWN_CLASS" | "TEACHES_SUBJECT" | "NONE";

export type TeacherSlotAvailabilityDto = {
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
  subjectMismatch: boolean;
  ownsThisClassroom: boolean;
  score: number;
};

export type SlotAvailabilityDto = {
  dayOfWeek: number;
  schedulePeriodId: string;
  period: SchedulePeriodDto | null;
  classroom: ClassroomOption | null;
  freePeriodIds: string[];
  subjectsForClass: Array<{ id: string; name: string }>;
  teachers: TeacherSlotAvailabilityDto[];
};

export type ClassSuggestionDto = {
  dayOfWeek: number;
  schedulePeriodId: string;
  teacherId: string;
  teacherName: string;
  subjectId: string | null;
  subjectName: string | null;
  reasons: string[];
};

export type SuggestResultDto = {
  bellScheduleId: string;
  classroomId: string;
  classroomName: string;
  count: number;
  suggestions: ClassSuggestionDto[];
};

export type WorkloadWarningDto = {
  teacherId: string;
  teacherName: string;
  dayOfWeek: number;
  code: "LONG_STREAK" | "OVERLOADED";
  message: string;
  lessons: number;
  longestStreak: number;
};

export type ClassOccupancyDto = {
  classroomId: string;
  classroomName: string;
  lessons: number;
  totalSlots: number;
  fillRate: number;
};

export type ScheduleHealthDto = {
  bellScheduleId: string;
  warnings: WorkloadWarningDto[];
  classroomOccupancy: ClassOccupancyDto[];
};


/** ISO weekday: 1=Mon … 5=Fri for the admin grid (weekdays only). */
export const GRID_DAYS = [1, 2, 3, 4, 5] as const;

export const DAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

export function cellKey(dayOfWeek: number, schedulePeriodId: string) {
  return `${dayOfWeek}|${schedulePeriodId}`;
}
