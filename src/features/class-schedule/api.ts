import { api } from "../../services/api";
import type { BellScheduleDto, TimetableEntryDto } from "./types";

export const classScheduleApi = {
  listBellSchedules: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/bell-schedules`) as Promise<BellScheduleDto[]>,

  ensureBellSchedule: (schoolId: string) =>
    api.post(`/api/schools/${schoolId}/bell-schedules/ensure`, {}) as Promise<BellScheduleDto>,

  createBellSchedule: (schoolId: string, body: { name?: string; withDefaults?: boolean }) =>
    api.post(`/api/schools/${schoolId}/bell-schedules`, body) as Promise<BellScheduleDto>,

  updateBellSchedule: (id: string, body: { name?: string; isActive?: boolean }) =>
    api.patch(`/api/bell-schedules/${id}`, body) as Promise<BellScheduleDto>,

  replacePeriods: (
    id: string,
    periods: Array<{
      periodNumber: number;
      label: string;
      shortCode: string;
      startTime: string;
      endTime: string;
      orderIndex?: number;
    }>
  ) => api.put(`/api/bell-schedules/${id}/periods`, { periods }) as Promise<BellScheduleDto>,

  listTimetable: (schoolId: string, params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {}).toString();
    return api.get(`/api/schools/${schoolId}/timetable${qs ? `?${qs}` : ""}`) as Promise<
      TimetableEntryDto[]
    >;
  },

  putTimetable: (
    schoolId: string,
    body: {
      bellScheduleId: string;
      classroomId?: string;
      effectiveFrom?: string;
      effectiveTo?: string;
      entries: Array<{
        classroomId: string;
        teacherId: string;
        subjectId?: string | null;
        dayOfWeek: number;
        schedulePeriodId: string;
        locationOverride?: string | null;
      }>;
    }
  ) => api.put(`/api/schools/${schoolId}/timetable`, body) as Promise<TimetableEntryDto[]>,

  validateTimetable: (
    schoolId: string,
    body: {
      bellScheduleId: string;
      entries: Array<{
        classroomId: string;
        teacherId: string;
        dayOfWeek: number;
        schedulePeriodId: string;
      }>;
      includeExisting?: boolean;
    }
  ) =>
    api.post(`/api/schools/${schoolId}/timetable/validate`, body) as Promise<{
      ok: boolean;
      conflicts: Array<{ code: string; message: string }>;
    }>,

  copyClassroom: (
    schoolId: string,
    body: { bellScheduleId: string; fromClassroomId: string; toClassroomId: string }
  ) => api.post(`/api/schools/${schoolId}/timetable/copy`, body) as Promise<TimetableEntryDto[]>,

  deleteEntry: (id: string) => api.delete(`/api/timetable-entries/${id}`),

  fetchClassrooms: (schoolId: string) => api.get(`/api/schools/${schoolId}/classrooms`) as Promise<unknown[]>,

  fetchSubjects: (schoolId: string) => api.get(`/api/schools/${schoolId}/subjects`) as Promise<unknown[]>,

  fetchTeachers: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/staff`) as Promise<unknown[]>,

  fetchAcademicCalendar: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/calendar`) as Promise<unknown>,
};
