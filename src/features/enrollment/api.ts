import { api } from "../../services/api";
import { fetchAllItems } from "../../lib/apiEnvelope";

export type BulkMemberResult = {
  userId: string;
  success: boolean;
  alreadyMember?: boolean;
  reason?: string;
};

export const enrollmentApi = {
  fetchStudents: (
    schoolId: string,
    filters: {
      q?: string;
      gradeLevelId?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) => {
    const params = new URLSearchParams();
    if (filters.q?.trim()) params.set("q", filters.q.trim());
    if (filters.gradeLevelId) params.set("gradeLevelId", filters.gradeLevelId);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
    const query = params.toString();
    return api.get(`/api/schools/${schoolId}/students${query ? `?${query}` : ""}`);
  },
  fetchClassrooms: (schoolId: string) => api.get(`/api/schools/${schoolId}/classrooms`),
  fetchGradeLevels: (schoolId: string) =>
    fetchAllItems<{ id: string; name: string }>((page, pageSize) =>
      api.get(`/api/schools/${schoolId}/grade-levels?page=${page}&pageSize=${pageSize}`)
    ),
  fetchSubjects: (schoolId: string) =>
    fetchAllItems<{ id: string; name: string; code?: string }>((page, pageSize) =>
      api.get(`/api/schools/${schoolId}/subjects?page=${page}&pageSize=${pageSize}`)
    ),
  fetchMembers: (classroomId: string) => api.get(`/api/classrooms/${classroomId}/members`),
  addMember: (classroomId: string, userId: string) =>
    api.post(`/api/classrooms/${classroomId}/members`, { userId, role: "STUDENT" }),
  addMembersBulk: (classroomId: string, userIds: string[]) =>
    api.post(`/api/classrooms/${classroomId}/members/bulk`, {
      userIds,
      role: "STUDENT",
    }),
  removeMember: (classroomId: string, userId: string) =>
    api.delete(`/api/classrooms/${classroomId}/members/${userId}`),
};
