import { api } from "../../services/api";
import { fetchAllItems } from "../../lib/apiEnvelope";

/** Thin API wrappers for the classrooms feature. */
export const classroomsApi = {
  fetchClassrooms: (schoolId: string) => api.get(`/api/schools/${schoolId}/classrooms`),
  fetchGradeLevels: (schoolId: string) =>
    fetchAllItems<{ id: string; name: string }>((page, pageSize) =>
      api.get(`/api/schools/${schoolId}/grade-levels?page=${page}&pageSize=${pageSize}`)
    ),
  fetchStaff: (schoolId: string) => api.get(`/api/schools/${schoolId}/staff`),
  fetchStudents: (schoolId: string) => api.get(`/api/schools/${schoolId}/students`),
  fetchSubjects: (schoolId: string) =>
    fetchAllItems<{ id: string; name: string; code?: string }>((page, pageSize) =>
      api.get(`/api/schools/${schoolId}/subjects?page=${page}&pageSize=${pageSize}`)
    ),
  createClassroom: (schoolId: string, data: unknown) => api.post(`/api/schools/${schoolId}/classrooms`, data),
  updateClassroom: (id: string, data: unknown) => api.patch(`/api/classrooms/${id}`, data),
  deleteClassroom: (id: string) => api.delete(`/api/classrooms/${id}`),
  propagateRoster: (id: string) => api.post(`/api/classrooms/${id}/propagate-roster`, {}),
};
