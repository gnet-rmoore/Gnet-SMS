import { api } from "../../services/api";

export const documentsApi = {
  list: (schoolId: string, role?: string) =>
    api.get(
      `/api/schools/${schoolId}/documents${role ? `?role=${encodeURIComponent(role)}` : ""}`
    ),
  create: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/documents`, data),
  update: (id: string, data: unknown) => api.put(`/api/documents/${id}`, data),
  remove: (id: string) => api.delete(`/api/documents/${id}`),
};
