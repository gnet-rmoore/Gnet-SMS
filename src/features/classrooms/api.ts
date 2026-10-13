import { api } from "../../services/api";

/** Thin API wrappers for the classrooms feature. */
export const classroomsApi = {
  fetchClassrooms: (schoolId: string) => api.get(`/api/schools/${schoolId}/classrooms`),
  fetchGradeLevels: (schoolId: string) => api.get(`/api/schools/${schoolId}/grade-levels`),
  fetchStaff: (schoolId: string) => api.get(`/api/schools/${schoolId}/staff`),
  fetchStudents: (schoolId: string) => api.get(`/api/schools/${schoolId}/students`),
  fetchSubjects: (schoolId: string) => api.get(`/api/schools/${schoolId}/subjects`),
  createClassroom: (schoolId: string, data: unknown) => api.post(`/api/schools/${schoolId}/classrooms`, data),
  updateClassroom: (id: string, data: unknown) => api.patch(`/api/classrooms/${id}`, data),
  deleteClassroom: (id: string) => api.delete(`/api/classrooms/${id}`),
  propagateRoster: (id: string) => api.post(`/api/classrooms/${id}/propagate-roster`, {}),
};
