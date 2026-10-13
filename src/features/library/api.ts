import { api } from "../../services/api";

export const libraryApi = {
  fetchItems: (schoolId: string) => api.get(`/api/schools/${schoolId}/library/items`),
  createItem: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/library/items`, data),
  updateItem: (id: string, data: unknown) => api.patch(`/api/library/items/${id}`, data),
  fetchLoans: (schoolId: string, status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return api.get(`/api/schools/${schoolId}/library/loans${qs}`);
  },
  checkout: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/library/loans`, data),
  returnLoan: (loanId: string) => api.patch(`/api/library/loans/${loanId}/return`, {}),
};
