export type ExamPeriodRef = {
  id: string;
  label: string;
  shortCode: string;
  startDate?: string;
  endDate?: string;
};

export type ExamComponentRef = {
  id: string;
  label: string;
  shortCode: string;
  componentType?: string;
  period?: ExamPeriodRef | null;
};

export type Exam = {
  id: string;
  schoolId: string;
  title: string;
  startDate: string;
  endDate: string;
  gradeSubmissionDeadline: string;
  duration: number;
  status: string;
  displayStatus?: string;
  isGradesReleased: boolean;
  hasPendingGrades?: boolean;
  examComponentId?: string | null;
  examComponent?: ExamComponentRef | null;
};

export type ScheduleExamFormData = {
  title: string;
  startDate: string;
  endDate: string;
  gradeSubmissionDeadline: string;
  duration: string;
  examComponentId: string;
  periodId: string;
  deliveryMode: string;
  paperDueAt: string;
  classId?: string | null;
  subjectId?: string | null;
};

export const emptyScheduleForm = (): ScheduleExamFormData => ({
  title: "",
  startDate: "",
  endDate: "",
  gradeSubmissionDeadline: "",
  duration: "",
  examComponentId: "",
  periodId: "",
  deliveryMode: "ONLINE",
  paperDueAt: "",
  classId: null,
  subjectId: null,
});
