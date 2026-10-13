export type LessonPlanStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "RETURNED";

export type LessonActivity = {
  title: string;
  minutes?: number | null;
  description?: string;
};

export type LessonPlan = {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  gradeLevelId?: string | null;
  gradeLevelName?: string | null;
  classroomId?: string | null;
  classroomName?: string | null;
  syllabusPlanId?: string | null;
  classroomPostId?: string | null;
  title: string;
  lessonDate: string;
  durationMinutes: number;
  periodLabel?: string | null;
  schedulePeriodId?: string | null;
  objectives: string;
  standards?: string | null;
  warmUp?: string | null;
  activities: string;
  materials?: string | null;
  assessment?: string | null;
  differentiation?: string | null;
  homework?: string | null;
  reflection?: string | null;
  status: LessonPlanStatus | string;
  feedback?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  submittedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LessonPlanTemplate = {
  id: string;
  schoolId: string;
  createdById: string;
  createdByName: string;
  title: string;
  subjectId: string;
  subjectName: string;
  gradeLevelId?: string | null;
  gradeLevelName?: string | null;
  durationMinutes: number;
  periodLabel?: string | null;
  objectives: string;
  standards?: string | null;
  warmUp?: string | null;
  activities: string;
  materials?: string | null;
  assessment?: string | null;
  differentiation?: string | null;
  homework?: string | null;
  sourceLessonPlanId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SyllabusWithUnits = {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  gradeLevelId: string;
  gradeLevelName: string;
  teacherName: string;
  academicYear: string;
  standardsFramework: string;
  objectives: string[];
  units: { week?: string; topic?: string; activities?: string; assessment?: string }[];
};

export type LessonPlanForm = {
  title: string;
  lessonDate: string;
  durationMinutes: number;
  periodLabel: string;
  schedulePeriodId: string;
  subjectId: string;
  subjectName: string;
  gradeLevelId: string;
  gradeLevelName: string;
  classroomId: string;
  classroomName: string;
  objectives: string[];
  standards: string;
  warmUp: string;
  activities: LessonActivity[];
  materials: string[];
  assessment: string;
  differentiation: string;
  homework: string;
};
