import { api } from "../../services/api";

/** Thin API wrappers for the attendance feature. */
export type AttendanceFilters = {
  classroomId?: string;
  from?: string;
  to?: string;
  status?: string;
  studentId?: string;
};

export const attendanceApi = {
  fetchAttendance: (
    schoolId: string,
    params: AttendanceFilters & { page?: number; pageSize?: number } = {}
  ) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    const suffix = query.toString();
    return api.get(
      `/api/schools/${schoolId}/attendance${suffix ? `?${suffix}` : ""}`
    );
  },
  fetchAttendanceStats: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/attendance/stats`),
  fetchSchoolClassrooms: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/classrooms`),
  fetchMyClassrooms: () => api.get(`/api/classrooms`),
  fetchClassroomMembers: (classroomId: string) =>
    api.get(`/api/classrooms/${classroomId}/members`),
  createAttendance: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/attendance`, data),
  fetchAttendanceDetails: (id: string) => api.get(`/api/attendance/${id}`),
  checkInstructionalDay: (schoolId: string, date: string) =>
    api.get(
      `/api/schools/${schoolId}/calendar/instructional-day?date=${encodeURIComponent(date)}`
    ),
};
