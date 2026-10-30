import { api } from "../../services/api";
import { fetchAllItems } from "../../lib/apiEnvelope";

/** Thin API wrappers for the students feature. */
export const studentsApi = {
  fetchStudents: (
    schoolId: string,
    params: Record<string, string | undefined> = {}
  ) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) q.set(k, v);
    });
    const qs = q.toString();
    return api.get(`/api/schools/${schoolId}/students${qs ? `?${qs}` : ""}`);
  },
  fetchClassrooms: (schoolId: string) => api.get(`/api/schools/${schoolId}/classrooms`),
  fetchGradeLevels: (schoolId: string) =>
    fetchAllItems<{ id: string; name: string }>((page, pageSize) =>
      api.get(`/api/schools/${schoolId}/grade-levels?page=${page}&pageSize=${pageSize}`)
    ),
  createStudent: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/students`, data),
  updateUser: (id: string, data: unknown) => api.patch(`/api/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/api/users/${id}`),
  addClassroomMember: (classroomId: string, data: unknown) =>
    api.post(`/api/classrooms/${classroomId}/members`, data),
};
