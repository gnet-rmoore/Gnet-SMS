import { api } from "../../services/api";

/** Thin API wrappers for the calendar-page feature. */
export const calendarPageApi = {
  fetchEvents: (params?: { from?: string; to?: string; studentId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (params?.studentId) qs.set("studentId", params.studentId);
    const q = qs.toString();
    return api.get(`/api/calendar/events${q ? `?${q}` : ""}`);
  },
  createEvent: (data: unknown) => api.post(`/api/calendar/events`, data),
  updateEvent: (id: string, data: unknown) =>
    api.patch(`/api/calendar/events/${id}`, data),
  deleteEvent: (id: string) => api.delete(`/api/calendar/events/${id}`),
};
