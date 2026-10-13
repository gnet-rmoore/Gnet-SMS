import { api } from "../../services/api";

export const hostelApi = {
  fetchBuildings: (schoolId: string) => api.get(`/api/schools/${schoolId}/hostel/buildings`),
  createBuilding: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/hostel/buildings`, data),
  createRoom: (buildingId: string, data: unknown) =>
    api.post(`/api/hostel/buildings/${buildingId}/rooms`, data),
  fetchAssignments: (schoolId: string) => api.get(`/api/schools/${schoolId}/hostel/assignments`),
  createAssignment: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/hostel/assignments`, data),
  checkout: (assignmentId: string) => api.patch(`/api/hostel/assignments/${assignmentId}/checkout`, {}),
};
