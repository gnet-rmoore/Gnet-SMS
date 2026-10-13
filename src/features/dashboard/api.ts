import { api } from "../../services/api";

/** Thin API wrappers for the dashboard feature. */
export const dashboardApi = {
  fetchStats: (schoolId: string) => api.get(`/api/schools/${schoolId}/stats`),
  fetchFinanceSummary: (schoolId: string) => api.get(`/api/schools/${schoolId}/finance/summary`),
};
