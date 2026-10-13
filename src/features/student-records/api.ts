import { api } from "../../services/api";

/** Thin API wrappers for the student-records feature. */
export const studentRecordsApi = {
  fetchStudents: (schoolId: string) => api.get(`/api/schools/${schoolId}/students`),
  updateUser: (id: string, data: unknown) => api.patch(`/api/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/api/users/${id}`),
};
