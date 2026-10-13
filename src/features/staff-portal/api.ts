import { api } from "../../services/api";

export type StaffAttendanceRecord = {
  id: string;
  userId: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: string;
  notes?: string | null;
  photoIn?: string | null;
  photoOut?: string | null;
};

export type StaffAttendancePage = {
  items: StaffAttendanceRecord[];
  page: number;
  pageSizeDays: number;
  hasMore: boolean;
};

/** Thin API wrappers for the staff-portal feature. */
export const staffPortalApi = {
  getStaffAttendance: (
    schoolId: string,
    opts?: { date?: string; scope?: "today"; page?: number }
  ): Promise<StaffAttendancePage> => {
    const params = new URLSearchParams();
    if (opts?.date) params.set("date", opts.date);
    if (opts?.scope) params.set("scope", opts.scope);
    if (opts?.page) params.set("page", String(opts.page));
    const qs = params.toString();
    return api.get(`/api/schools/${schoolId}/staff-attendance${qs ? `?${qs}` : ""}`);
  },
  getLeaveRequests: (schoolId: string, userId?: string) =>
    api.get(`/api/schools/${schoolId}/leave-requests${userId ? `?userId=${userId}` : ""}`),
  getLeaveBalances: (schoolId: string, userId?: string, year?: number) => {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (year) params.set("year", String(year));
    const qs = params.toString();
    return api.get(`/api/schools/${schoolId}/leave-balances${qs ? `?${qs}` : ""}`);
  },
  createLeaveRequest: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/leave-requests`, data),
  getTasks: (schoolId: string, assignedTo?: string) =>
    api.get(`/api/schools/${schoolId}/staff-tasks${assignedTo ? `?assignedTo=${assignedTo}` : ""}`),
  updateTaskStatus: (id: string, status: string) =>
    api.patch(`/api/staff-tasks/${id}`, { status }),
  getAnnouncements: (schoolId: string, role?: string) =>
    api.get(`/api/schools/${schoolId}/announcements${role ? `?role=${role}` : ""}`),
  acknowledgeAnnouncement: (id: string) =>
    api.post(`/api/announcements/${id}/acknowledge`, {}),
  getDocuments: (schoolId: string, role?: string) =>
    api.get(`/api/schools/${schoolId}/documents${role ? `?role=${role}` : ""}`),
  getUserPayrolls: (userId: string) =>
    api.get(`/api/users/${userId}/payrolls`),
  markAttendance: (schoolId: string, type: "checkIn" | "checkOut", notes?: string, photo?: string) =>
    api.post(`/api/schools/${schoolId}/staff-attendance`, { type, notes, photo }),
};
