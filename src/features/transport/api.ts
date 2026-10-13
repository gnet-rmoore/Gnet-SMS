import { api } from "../../services/api";

export const transportApi = {
  fetchVehicles: (schoolId: string) => api.get(`/api/schools/${schoolId}/vehicles`),
  createVehicle: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/vehicles`, data),
  updateVehicle: (id: string, data: unknown) => api.patch(`/api/vehicles/${id}`, data),
  logMaintenance: (vehicleId: string, data: unknown) =>
    api.post(`/api/vehicles/${vehicleId}/maintenance`, data),
  fetchRoutes: (schoolId: string) => api.get(`/api/schools/${schoolId}/transport/routes`),
  createRoute: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/transport/routes`, data),
  updateRoute: (id: string, data: unknown) => api.patch(`/api/transport/routes/${id}`, data),
  addStop: (routeId: string, data: unknown) =>
    api.post(`/api/transport/routes/${routeId}/stops`, data),
  addRider: (routeId: string, data: unknown) =>
    api.post(`/api/transport/routes/${routeId}/riders`, data),
  removeRider: (routeId: string, studentId: string) =>
    api.delete(`/api/transport/routes/${routeId}/riders/${studentId}`),
  fetchStaff: (schoolId: string) => api.get(`/api/schools/${schoolId}/staff`),
  fetchStudents: (schoolId: string) => api.get(`/api/schools/${schoolId}/students`),
};
