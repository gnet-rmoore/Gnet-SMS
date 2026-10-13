import { api } from "../../services/api";

export const announcementsApi = {
  list: (schoolId: string, role?: string) =>
    api.get(`/api/schools/${schoolId}/announcements${role ? `?role=${role}` : ""}`),
  create: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/announcements`, data),
  update: (id: string, data: unknown) => api.put(`/api/announcements/${id}`, data),
  remove: (id: string) => api.delete(`/api/announcements/${id}`),
};
