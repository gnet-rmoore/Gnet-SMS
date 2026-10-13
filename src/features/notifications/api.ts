import { api } from "../../services/api";

export const notificationsApi = {
  list: (opts?: {
    unreadOnly?: boolean;
    limit?: number;
    page?: number;
    pageSize?: number;
    schoolId?: string;
    /** Request `{ items, total, page, pageSize }` envelope. */
    paged?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (opts?.unreadOnly) q.set("unreadOnly", "true");
    if (opts?.limit) q.set("limit", String(opts.limit));
    if (opts?.page) q.set("page", String(opts.page));
    if (opts?.pageSize) q.set("pageSize", String(opts.pageSize));
    if (opts?.schoolId) q.set("schoolId", opts.schoolId);
    if (opts?.paged) q.set("paged", "true");
    const qs = q.toString();
    return api.get(`/api/notifications${qs ? `?${qs}` : ""}`);
  },
  unreadCount: (schoolId?: string) =>
    api.get(
      `/api/notifications/unread-count${
        schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ""
      }`
    ),
  navBadges: (schoolId?: string) =>
    api.get(
      `/api/notifications/nav-badges${
        schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ""
      }`
    ),
  markRead: (id: string) => api.patch(`/api/notifications/${id}/read`, {}),
  markAllRead: (schoolId?: string) =>
    api.post(`/api/notifications/read-all`, { schoolId }),
};
