import { api } from "./api";

export const staffService = {
  getLeaveRequests: (schoolId: string, userId?: string) =>
    api.get(`/api/schools/${schoolId}/leave-requests${userId ? `?userId=${userId}` : ""}`),

  getLeaveBalances: (schoolId: string, userId?: string, year?: number) => {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (year) params.set("year", String(year));
    const qs = params.toString();
    return api.get(`/api/schools/${schoolId}/leave-balances${qs ? `?${qs}` : ""}`);
  },

  createLeaveRequest: (schoolId: string, body: unknown) =>
    api.post(`/api/schools/${schoolId}/leave-requests`, body),

  getLeavePolicies: (schoolId: string) => api.get(`/api/schools/${schoolId}/leave-policies`),

  updateLeavePolicies: (schoolId: string, policies: unknown) =>
    api.put(`/api/schools/${schoolId}/leave-policies`, { policies }),

  updateLeaveStatus: (id: string, body: unknown) =>
    api.patch(`/api/leave-requests/${id}`, body),

  getTasks: (schoolId: string, assignedTo?: string) =>
    api.get(`/api/schools/${schoolId}/staff-tasks${assignedTo ? `?assignedTo=${assignedTo}` : ""}`),

  createTask: (schoolId: string, body: unknown) =>
    api.post(`/api/schools/${schoolId}/staff-tasks`, body),

  updateTaskStatus: (id: string, status: string) =>
    api.patch(`/api/staff-tasks/${id}`, { status }),

  getStaffAttendance: (schoolId: string, date?: string) =>
    api.get(`/api/schools/${schoolId}/staff-attendance${date ? `?date=${date}` : ""}`),

  markAttendance: (schoolId: string, type: string, notes?: string, photo?: unknown) =>
    api.post(`/api/schools/${schoolId}/staff-attendance`, { type, notes, photo }),

  getAnnouncements: (schoolId: string, role?: string) =>
    api.get(`/api/schools/${schoolId}/announcements${role ? `?role=${role}` : ""}`),

  acknowledgeAnnouncement: (id: string) =>
    api.post(`/api/announcements/${id}/acknowledge`, {}),

  getDocuments: (schoolId: string, role?: string) =>
    api.get(`/api/schools/${schoolId}/documents${role ? `?role=${role}` : ""}`),

  getUserPayrolls: (userId: string) => api.get(`/api/users/${userId}/payrolls`),
};
