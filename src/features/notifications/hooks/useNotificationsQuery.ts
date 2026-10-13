import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { api } from "../../../services/api";
import { notificationsApi } from "../api";
import type { InAppNotification } from "../types";

const POLL_MS = 45_000;

async function softCount(url: string): Promise<number> {
  try {
    const data = await api.get(url);
    if (Array.isArray(data)) {
      return data.filter((x: any) => x?.status === "PENDING" || x?.status === "OPEN").length;
    }
    return 0;
  } catch {
    return 0;
  }
}

async function softArrayLength(url: string): Promise<number> {
  try {
    const data = await api.get(url);
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

async function softArrayCount(url: string, predicate?: (row: any) => boolean): Promise<number> {
  try {
    const data = await api.get(url);
    if (!Array.isArray(data)) return 0;
    return predicate ? data.filter(predicate).length : data.length;
  } catch {
    return 0;
  }
}

/** Compact inbox for the header bell (no pager). */
export function useNotificationsInbox(opts?: { enabled?: boolean; limit?: number }) {
  const schoolId = useAuthStore((s) => s.school?.id);
  const userId = useAuthStore((s) => s.user?.id);
  const enabled = Boolean(userId) && opts?.enabled !== false;
  const limit = opts?.limit ?? 50;

  return useQuery({
    queryKey: ["notifications", "list", schoolId, userId, limit],
    enabled,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const data = await notificationsApi.list({ limit, schoolId });
      return (Array.isArray(data) ? data : data?.items || []) as InAppNotification[];
    },
  });
}

/** Full notifications page — server-paged envelope. */
export function useNotificationsPaged(opts: {
  page: number;
  pageSize: number;
  unreadOnly?: boolean;
  q?: string;
}) {
  const schoolId = useAuthStore((s) => s.school?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: [
      "notifications",
      "paged",
      schoolId,
      userId,
      opts.page,
      opts.pageSize,
      opts.unreadOnly,
      opts.q,
    ],
    enabled: Boolean(userId),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const data = await notificationsApi.list({
        page: opts.page,
        pageSize: opts.pageSize,
        limit: opts.pageSize,
        unreadOnly: opts.unreadOnly,
        schoolId,
        paged: true,
      });
      const items = (Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : []) as InAppNotification[];
      const total = Number(data?.total ?? items.length) || 0;
      const q = (opts.q || "").trim().toLowerCase();
      const filtered = q
        ? items.filter(
            (n) =>
              (n.title || "").toLowerCase().includes(q) ||
              (n.body || "").toLowerCase().includes(q)
          )
        : items;
      return {
        items: filtered,
        total: q ? filtered.length : total,
        page: Number(data?.page) || opts.page,
        pageSize: Number(data?.pageSize) || opts.pageSize,
        /** Search is client-side on the current page when `q` is set. */
        searchScoped: Boolean(q),
      };
    },
  });
}

export function useUnreadCount() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.user?.role);

  return useQuery({
    queryKey: ["notifications", "unread", schoolId, userId],
    enabled: Boolean(userId && schoolId && role !== "SUPER_ADMIN"),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const data = await notificationsApi.unreadCount(schoolId);
      return Number(data?.count) || 0;
    },
  });
}

export function useNavBadges() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.user?.role);

  return useQuery({
    queryKey: ["notifications", "nav-badges", schoolId, userId, role],
    enabled: Boolean(userId && schoolId && role !== "SUPER_ADMIN"),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [inboxRes, leaveCount, woCount, lessonPending, overdueLoans, clinicToday, unassignedRoutes] =
        await Promise.all([
        notificationsApi.navBadges(schoolId).catch(() => ({ badges: {} })),
        ["SCHOOL_ADMIN", "PRINCIPAL", "VPA"].includes(role || "")
          ? softCount(`/api/schools/${schoolId}/leave-requests`)
          : Promise.resolve(0),
        ["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "MAINTENANCE"].includes(role || "")
          ? softCount(`/api/schools/${schoolId}/work-orders`)
          : Promise.resolve(0),
        ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(role || "")
          ? softArrayLength(`/api/schools/${schoolId}/lesson-plans/pending`)
          : Promise.resolve(0),
        role === "LIBRARIAN"
          ? softArrayCount(`/api/schools/${schoolId}/library/loans?status=OVERDUE`)
          : Promise.resolve(0),
        role === "NURSE"
          ? softArrayCount(`/api/schools/${schoolId}/clinic/visits?date=${today}`)
          : Promise.resolve(0),
        role === "TRANSPORTATION"
          ? softArrayCount(
              `/api/schools/${schoolId}/transport/routes`,
              (r) => r?.status === "ACTIVE" && !r?.driverStaffId
            )
          : Promise.resolve(0),
      ]);
      const badges: Record<string, number> = {
        ...((inboxRes as any)?.badges || {}),
      };
      if (leaveCount > 0) {
        badges["leave-approval"] = Math.max(badges["leave-approval"] || 0, leaveCount);
      }
      if (woCount > 0) {
        badges["work-orders"] = Math.max(badges["work-orders"] || 0, woCount);
      }
      if (lessonPending > 0) {
        badges["lesson-plans"] = Math.max(badges["lesson-plans"] || 0, lessonPending);
      }
      if (overdueLoans > 0) {
        badges.library = Math.max(badges.library || 0, overdueLoans);
      }
      if (clinicToday > 0) {
        badges.clinic = Math.max(badges.clinic || 0, clinicToday);
      }
      if (unassignedRoutes > 0) {
        badges.drivers = Math.max(badges.drivers || 0, unassignedRoutes);
      }
      return badges;
    },
  });
}

export function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.school?.id);
  return () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    if (schoolId) {
      queryClient.invalidateQueries({ queryKey: ["notifications", schoolId] });
    }
  };
}
