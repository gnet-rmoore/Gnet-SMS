import { api } from "../../services/api";

export const examsApi = {
  list: (schoolId: string, params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return api.get(`/api/schools/${schoolId}/exams${qs}`);
  },
  create: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/exams`, data),
  releaseGrades: (examId: string, isGradesReleased: boolean) =>
    api.patch(`/api/exams/${examId}/release-grades`, { isGradesReleased }),
  listSchedules: (examId: string) => api.get(`/api/exams/${examId}/schedule`),
  createSchedule: (examId: string, data: unknown) =>
    api.post(`/api/exams/${examId}/schedule`, data),
  updateSchedule: (scheduleId: string, data: unknown) =>
    api.patch(`/api/exam-schedules/${scheduleId}`, data),
  deleteSchedule: (scheduleId: string) =>
    api.delete(`/api/exam-schedules/${scheduleId}`),
};
