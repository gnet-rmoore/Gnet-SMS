import { api } from "../../services/api";
import { academicCalendarApi } from "../academics-shared/calendar/api";
import type { AssessmentStructureColumn } from "../../lib/assessmentStructure";

export type AssessmentGradeCell = {
  grade: number | null;
  status: string;
  isLocked: boolean;
  isIncomplete: boolean;
  incompleteNote: string | null;
  entryId: string | null;
};

export type AssessmentGradeRow = {
  studentId: string;
  student: {
    id?: string;
    name: string;
    email?: string;
    photoUrl?: string | null;
  };
  cells: Record<string, AssessmentGradeCell>;
};

export type AssessmentGradesPayload = {
  assessment: {
    id: string;
    label: string;
    shortCode: string;
    componentType: string;
    periodId: string;
    periodLabel: string;
    periodShortCode: string;
    gradebookStructure: AssessmentStructureColumn[];
    gradebookStructureCustom?: boolean;
    structureSource?: "school" | "assessment" | "default";
    gradeSubmissionDeadline: string | null;
  };
  rows: AssessmentGradeRow[];
};

export const gradebookApi = {
  fetchExams: (schoolId: string) => api.get(`/api/schools/${schoolId}/exams`),
  fetchExam: (examId: string) => api.get(`/api/exams/${examId}`),
  fetchTeacherClassrooms: (examId: string) =>
    api.get(`/api/exams/${examId}/teacher-classrooms`),
  fetchExamGrades: (examId: string, classroomId: string, teacherId?: string) => {
    const q = new URLSearchParams({ classroomId });
    if (teacherId) q.set("teacherId", teacherId);
    return api.get(`/api/exams/${examId}/grades?${q}`);
  },
  bulkExamGrades: (
    examId: string,
    data: {
      classId: string;
      subjectId: string;
      status: "DRAFT" | "SUBMITTED";
      examComponentId?: string | null;
      entries: Array<{ studentId: string; grade: number | null }>;
    }
  ) => api.post(`/api/exams/${examId}/grades/bulk`, data),
  fetchCalendar: (schoolId: string) => academicCalendarApi.fetchCalendar(schoolId),
  fetchMyClassrooms: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/classrooms`),
  fetchAssessmentGrades: (
    schoolId: string,
    opts: { classId: string; examComponentId: string; subjectId?: string }
  ) => {
    const q = new URLSearchParams({
      classId: opts.classId,
      examComponentId: opts.examComponentId,
    });
    if (opts.subjectId) q.set("subjectId", opts.subjectId);
    return api.get(
      `/api/schools/${schoolId}/gradebook/assessment-grades?${q}`
    ) as Promise<AssessmentGradesPayload>;
  },
  fetchComponentGrades: (
    schoolId: string,
    opts: { classId: string; examComponentId: string; subjectId?: string }
  ) => {
    const q = new URLSearchParams({
      classId: opts.classId,
      examComponentId: opts.examComponentId,
    });
    if (opts.subjectId) q.set("subjectId", opts.subjectId);
    return api.get(
      `/api/schools/${schoolId}/gradebook/component-grades?${q}`
    );
  },
  bulkComponentGrades: (
    schoolId: string,
    data: {
      classId: string;
      subjectId: string;
      examComponentId: string;
      status: "DRAFT" | "SUBMITTED";
      entries: Array<{
        studentId: string;
        grade: number | null;
        structureColumnId?: string | null;
        isIncomplete?: boolean;
        incompleteNote?: string | null;
      }>;
    }
  ) =>
    api.post(`/api/schools/${schoolId}/gradebook/component-grades/bulk`, data),
};
