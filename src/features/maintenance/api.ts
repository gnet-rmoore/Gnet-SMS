import { api } from "../../services/api";

/** Thin API wrappers for the maintenance feature. */
export const maintenanceApi = {
  fetchWorkOrders: (schoolId: string, page = 1, pageSize = 100) =>
    api.get(`/api/schools/${schoolId}/work-orders?page=${page}&pageSize=${pageSize}`),
  fetchInventory: (schoolId: string) => api.get(`/api/schools/${schoolId}/inventory`),
  fetchStaff: (schoolId: string) => api.get(`/api/schools/${schoolId}/staff`),
  createWorkOrder: (schoolId: string, data: unknown) => api.post(`/api/schools/${schoolId}/work-orders`, data),
  updateWorkOrder: (id: string, data: unknown) => api.patch(`/api/work-orders/${id}`, data),
  createInventory: (schoolId: string, data: unknown) => api.post(`/api/schools/${schoolId}/inventory`, data),
  updateInventory: (id: string, data: unknown) => api.patch(`/api/inventory/${id}`, data),
  fetchInventoryMovements: (id: string) => api.get(`/api/inventory/${id}/movements`),
  createInventoryMovement: (id: string, data: unknown) =>
    api.post(`/api/inventory/${id}/movements`, data),
};
