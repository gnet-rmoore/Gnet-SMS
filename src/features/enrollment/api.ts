import { api } from "../../services/api";

export const enrollmentApi = {
  fetchStudents: (schoolId: string, page?: number, pageSize?: number) =>
    api.get(
      `/api/schools/${schoolId}/students${
        page || pageSize
          ? `?${new URLSearchParams({
              ...(page ? { page: String(page) } : {}),
              ...(pageSize ? { pageSize: String(pageSize) } : {}),
            })}`
          : ""
      }`
    ),
  fetchClassrooms: (schoolId: string) => api.get(`/api/schools/${schoolId}/classrooms`),
  fetchGradeLevels: (schoolId: string) => api.get(`/api/schools/${schoolId}/grade-levels`),
  fetchSubjects: (schoolId: string) => api.get(`/api/schools/${schoolId}/subjects`),
  fetchMembers: (classroomId: string) => api.get(`/api/classrooms/${classroomId}/members`),
  addMember: (classroomId: string, userId: string) =>
    api.post(`/api/classrooms/${classroomId}/members`, { userId, role: "STUDENT" }),
  removeMember: (classroomId: string, userId: string) =>
    api.delete(`/api/classrooms/${classroomId}/members/${userId}`),
};
