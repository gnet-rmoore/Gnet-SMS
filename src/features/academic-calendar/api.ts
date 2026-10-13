import { api } from "../../services/api";

/** Thin API wrappers for the academic-calendar feature. */
export const academicCalendarApi = {
  fetchCalendar: (schoolId: string) => api.get(`/api/schools/${schoolId}/calendar`),
  fetchTemplates: (schoolId: string) => api.get(`/api/schools/${schoolId}/calendar/templates`),
  saveCalendar: (schoolId: string, data: unknown) => api.post(`/api/schools/${schoolId}/calendar`, data),
  updatePeriod: (id: string, data: unknown) => api.patch(`/api/periods/${id}`, data),
  createExamComponent: (periodId: string, data: unknown) => api.post(`/api/periods/${periodId}/exam-components`, data),
  updateExamComponent: (id: string, data: unknown) => api.patch(`/api/exam-components/${id}`, data),
  deleteExamComponent: (id: string) => api.delete(`/api/exam-components/${id}`),
};
