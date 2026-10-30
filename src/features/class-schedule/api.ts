import { api } from "../../services/api";
import { academicCalendarApi } from "../academics-shared/calendar/api";
import { fetchAllItems } from "../../lib/apiEnvelope";
import type {
  BellScheduleDto,
  ScheduleHealthDto,
  SlotAvailabilityDto,
  SuggestResultDto,
  TimetableEntryDto,
} from "./types";

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

  getSlotAvailability: (
    schoolId: string,
    params: {
      bellScheduleId: string;
      dayOfWeek: number | string;
      schedulePeriodId: string;
      classroomId?: string;
      subjectId?: string;
    }
  ) => {
    const qs = new URLSearchParams();
    qs.set("bellScheduleId", params.bellScheduleId);
    qs.set("dayOfWeek", String(params.dayOfWeek));
    qs.set("schedulePeriodId", params.schedulePeriodId);
    if (params.classroomId) qs.set("classroomId", params.classroomId);
    if (params.subjectId) qs.set("subjectId", params.subjectId);
    return api.get(`/api/schools/${schoolId}/timetable/availability?${qs.toString()}`) as Promise<
      SlotAvailabilityDto
    >;
  },

  getScheduleHealth: (schoolId: string, params: { bellScheduleId: string }) => {
    const qs = new URLSearchParams({ bellScheduleId: params.bellScheduleId }).toString();
    return api.get(`/api/schools/${schoolId}/timetable/health?${qs}`) as Promise<ScheduleHealthDto>;
  },

  suggestClassSchedule: (
    schoolId: string,
    body: { bellScheduleId: string; classroomId: string }
  ) => api.post(`/api/schools/${schoolId}/timetable/suggest`, body) as Promise<SuggestResultDto>,

  deleteEntry: (id: string) => api.delete(`/api/timetable-entries/${id}`),

  fetchClassrooms: (schoolId: string) => api.get(`/api/schools/${schoolId}/classrooms`) as Promise<unknown[]>,

  fetchSubjects: (schoolId: string) =>
    fetchAllItems((page, pageSize) =>
      api.get(`/api/schools/${schoolId}/subjects?page=${page}&pageSize=${pageSize}`)
    ),

  fetchTeachers: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/staff`) as Promise<unknown[]>,

  fetchAcademicCalendar: (schoolId: string) =>
    academicCalendarApi.fetchCalendar(schoolId) as Promise<unknown>,
};
