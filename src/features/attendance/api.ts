import { api } from "../../services/api";

/** Thin API wrappers for the attendance feature. */
export const attendanceApi = {
  fetchAttendance: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/attendance`),
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
