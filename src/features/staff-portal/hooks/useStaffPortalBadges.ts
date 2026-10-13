import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { staffPortalApi } from "../api";

export function useStaffPortalBadges() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.user?.role);
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ["staff-portal-badges", "tasks", schoolId, userId],
    enabled: Boolean(schoolId && userId),
    queryFn: async () => {
      const res = await staffPortalApi.getTasks(schoolId!, userId!);
      return Array.isArray(res) ? res : [];
    },
    staleTime: 30_000,
  });

  const announcementsQuery = useQuery({
    queryKey: ["staff-portal-badges", "announcements", schoolId, userId, role],
    enabled: Boolean(schoolId && userId && role),
    queryFn: async () => {
      const res = await staffPortalApi.getAnnouncements(schoolId!, role!);
      return Array.isArray(res) ? res : [];
    },
    staleTime: 30_000,
  });

  const tasks = tasksQuery.data ?? [];
  const announcements = announcementsQuery.data ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-portal-badges"] });
  };

  return {
    pendingTasksCount: tasks.filter((t) => t.status !== "COMPLETED").length,
    unreadAnnouncementsCount: announcements.filter((a) => !a.acknowledgedByMe).length,
    invalidate,
  };
}
