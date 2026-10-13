import { api } from "../../services/api";

export const reportsApi = {
  fetchStats: (schoolId: string) => api.get(`/api/schools/${schoolId}/stats`),
  fetchAttendanceStats: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/attendance/stats`),
  fetchFinanceSummary: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/finance/summary`),
  fetchWorkOrders: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/work-orders`),
  fetchLeaveRequests: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/leave-requests`),
};
