import { api } from "../../services/api";

/** Thin API wrappers for the work-orders feature. */
export const workOrdersApi = {
  fetchWorkOrders: (schoolId: string) => api.get(`/api/schools/${schoolId}/work-orders`),
  fetchStaff: (schoolId: string) => api.get(`/api/schools/${schoolId}/staff`),
  createWorkOrder: (schoolId: string, data: unknown) => api.post(`/api/schools/${schoolId}/work-orders`, data),
  updateWorkOrder: (id: string, data: unknown) => api.patch(`/api/work-orders/${id}`, data),
};
