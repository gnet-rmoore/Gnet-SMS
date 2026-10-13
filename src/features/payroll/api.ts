import { api } from "../../services/api";

/** Thin API wrappers for the payroll feature. */
export const payrollApi = {
  fetchPayrolls: (
    schoolId: string,
    month?: number,
    year?: number,
    filters?: { status?: string; q?: string; page?: number; pageSize?: number }
  ) => {
    const params = new URLSearchParams();
    if (month != null) params.set("month", String(month));
    if (year != null) params.set("year", String(year));
    if (filters?.status) params.set("status", filters.status);
    if (filters?.q) params.set("q", filters.q);
    if (filters?.page != null) params.set("page", String(filters.page));
    if (filters?.pageSize != null) params.set("pageSize", String(filters.pageSize));
    const qs = params.toString();
    return api.get(`/api/schools/${schoolId}/payrolls${qs ? `?${qs}` : ""}`);
  },
  fetchStaff: (schoolId: string) => api.get(`/api/schools/${schoolId}/staff`),
  createPayroll: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/payrolls`, data),
  updatePayroll: (id: string, data: unknown) =>
    api.put(`/api/payrolls/${id}`, data),
  deletePayroll: (id: string) => api.delete(`/api/payrolls/${id}`),
  fetchAttendanceSummary: (
    schoolId: string,
    userId: string,
    year: number,
    month: number
  ) =>
    api.get(
      `/api/schools/${schoolId}/staff-attendance/summary?userId=${encodeURIComponent(userId)}&year=${year}&month=${month}`
    ),
};
