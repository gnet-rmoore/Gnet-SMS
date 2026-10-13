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
