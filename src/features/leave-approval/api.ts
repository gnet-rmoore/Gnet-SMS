import { api } from "../../services/api";

export const leaveApprovalApi = {
  fetchLeaveRequests: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/leave-requests`),
  fetchStaff: (schoolId: string) => api.get(`/api/schools/${schoolId}/staff`),
  updateLeaveStatus: (id: string, data: { status: string; comment?: string }) =>
    api.patch(`/api/leave-requests/${id}`, data),
};
