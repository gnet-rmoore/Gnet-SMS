import { api } from "../../services/api";

/** Thin API wrappers for the security feature. */
export const securityApi = {
  fetchSecurityLogs: (schoolId: string) => api.get(`/api/schools/${schoolId}/security-logs`),
  createSecurityLog: (schoolId: string, data: unknown) => api.post(`/api/schools/${schoolId}/security-logs`, data),
};
