import { api } from "../../services/api";

/** Thin API wrappers for the maintenance feature. */
export const maintenanceApi = {
  fetchWorkOrders: (schoolId: string) => api.get(`/api/schools/${schoolId}/work-orders`),
  fetchInventory: (schoolId: string) => api.get(`/api/schools/${schoolId}/inventory`),
  fetchStaff: (schoolId: string) => api.get(`/api/schools/${schoolId}/staff`),
  createWorkOrder: (schoolId: string, data: unknown) => api.post(`/api/schools/${schoolId}/work-orders`, data),
  updateWorkOrder: (id: string, data: unknown) => api.patch(`/api/work-orders/${id}`, data),
  createInventory: (schoolId: string, data: unknown) => api.post(`/api/schools/${schoolId}/inventory`, data),
  updateInventory: (id: string, data: unknown) => api.patch(`/api/inventory/${id}`, data),
};
