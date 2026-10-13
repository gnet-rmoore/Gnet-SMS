import { api } from "../../services/api";
import type { LessonPlan, LessonPlanTemplate, SyllabusWithUnits } from "./types";

export const lessonPlansApi = {
  list: (schoolId: string, params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return api.get(`/api/schools/${schoolId}/lesson-plans${qs ? `?${qs}` : ""}`) as Promise<
      LessonPlan[]
    >;
  },
  pending: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/lesson-plans/pending`) as Promise<LessonPlan[]>,
  create: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/lesson-plans`, data) as Promise<LessonPlan>,
  update: (id: string, data: unknown) =>
    api.patch(`/api/lesson-plans/${id}`, data) as Promise<LessonPlan>,
  submit: (id: string) => api.post(`/api/lesson-plans/${id}/submit`, {}) as Promise<LessonPlan>,
  review: (id: string, data: { status: "APPROVED" | "RETURNED"; feedback?: string }) =>
    api.post(`/api/lesson-plans/${id}/review`, data) as Promise<LessonPlan>,
  duplicate: (id: string, data?: { lessonDate?: string }) =>
    api.post(`/api/lesson-plans/${id}/duplicate`, data || {}) as Promise<LessonPlan>,
  reschedule: (id: string, lessonDate: string) =>
    api.post(`/api/lesson-plans/${id}/reschedule`, { lessonDate }) as Promise<LessonPlan>,
  saveAsTemplate: (id: string) =>
    api.post(`/api/lesson-plans/${id}/save-as-template`, {}) as Promise<LessonPlanTemplate>,
  shareToClassroom: (id: string) =>
    api.post(`/api/lesson-plans/${id}/share-to-classroom`, {}) as Promise<LessonPlan>,
  remove: (id: string) => api.delete(`/api/lesson-plans/${id}`),
  listTemplates: (schoolId: string, params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return api.get(
      `/api/schools/${schoolId}/lesson-plan-templates${qs ? `?${qs}` : ""}`
    ) as Promise<LessonPlanTemplate[]>;
  },
  createFromTemplate: (
    schoolId: string,
    data: {
      templateId: string;
      lessonDate?: string;
      classroomId?: string;
      classroomName?: string;
    }
  ) =>
    api.post(`/api/schools/${schoolId}/lesson-plans/from-template`, data) as Promise<LessonPlan>,
  deleteTemplate: (id: string) => api.delete(`/api/lesson-plan-templates/${id}`),
  listSyllabusUnits: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/lesson-plan-syllabus-units`) as Promise<
      SyllabusWithUnits[]
    >,
  createFromSyllabusUnit: (
    schoolId: string,
    data: {
      syllabusPlanId: string;
      unitIndex: number;
      lessonDate?: string;
      classroomId?: string;
      classroomName?: string;
    }
  ) =>
    api.post(
      `/api/schools/${schoolId}/lesson-plans/from-syllabus-unit`,
      data
    ) as Promise<LessonPlan>,
  fetchSubjects: (schoolId: string) => api.get(`/api/schools/${schoolId}/subjects`),
  fetchGradeLevels: (schoolId: string) => api.get(`/api/schools/${schoolId}/grade-levels`),
  fetchClassrooms: (schoolId: string) => api.get(`/api/schools/${schoolId}/classrooms`),
  fetchBellSchedules: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/bell-schedules`) as Promise<
      Array<{
        id: string;
        isActive: boolean;
        periods: Array<{
          id: string;
          label: string;
          shortCode: string;
          startTime: string;
          endTime: string;
          orderIndex: number;
        }>;
      }>
    >,
};
