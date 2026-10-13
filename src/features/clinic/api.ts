import { api } from "../../services/api";

export const clinicApi = {
  fetchVisits: (schoolId: string, params?: { date?: string; studentId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date) qs.set("date", params.date);
    if (params?.studentId) qs.set("studentId", params.studentId);
    const q = qs.toString();
    return api.get(`/api/schools/${schoolId}/clinic/visits${q ? `?${q}` : ""}`);
  },
  createVisit: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/clinic/visits`, data),
  getHealthProfile: (schoolId: string, studentId: string) =>
    api.get(`/api/schools/${schoolId}/clinic/health-profiles/${studentId}`),
  saveHealthProfile: (schoolId: string, studentId: string, data: unknown) =>
    api.put(`/api/schools/${schoolId}/clinic/health-profiles/${studentId}`, data),
};
