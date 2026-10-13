import { api } from "../../services/api";

export const counselingApi = {
  fetchSessions: (schoolId: string, studentId?: string) => {
    const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    return api.get(`/api/schools/${schoolId}/counseling/sessions${qs}`);
  },
  createSession: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/counseling/sessions`, data),
};
