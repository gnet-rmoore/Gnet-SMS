import { api } from "../../services/api";

export type ExpensesListFilters = {
  q?: string;
  category?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

/** Thin API wrappers for the expenses feature. */
export const expensesApi = {
  fetchExpenses: (schoolId: string, filters: ExpensesListFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    if (filters.status) params.set("status", filters.status);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.page != null) params.set("page", String(filters.page));
    if (filters.pageSize != null) params.set("pageSize", String(filters.pageSize));
    const qs = params.toString();
    return api.get(`/api/schools/${schoolId}/expenses${qs ? `?${qs}` : ""}`);
  },
  fetchFees: (schoolId: string) => api.get(`/api/schools/${schoolId}/fees`),
  fetchPayrolls: (schoolId: string) => api.get(`/api/schools/${schoolId}/payrolls`),
  fetchStaff: (schoolId: string) => api.get(`/api/schools/${schoolId}/staff`),
  fetchFinanceSummary: (schoolId: string) => api.get(`/api/schools/${schoolId}/finance/summary`),
  createExpense: (schoolId: string, data: unknown) => api.post(`/api/schools/${schoolId}/expenses`, data),
  updateExpense: (schoolId: string, id: string, data: unknown) => api.patch(`/api/schools/${schoolId}/expenses/${id}`, data),
  deleteExpense: (schoolId: string, id: string) => api.delete(`/api/schools/${schoolId}/expenses/${id}`),
};
