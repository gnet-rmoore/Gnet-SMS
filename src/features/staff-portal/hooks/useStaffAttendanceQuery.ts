import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { staffPortalApi, type StaffAttendancePage } from "../api";

const emptyPage: StaffAttendancePage = {
  items: [],
  page: 1,
  pageSizeDays: 31,
  hasMore: false,
};

export function useStaffAttendanceQuery(historyPage: number, enabled: boolean) {
  const schoolId = useAuthStore((s) => s.school?.id);
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const todayQuery = useQuery({
    queryKey: ["staff-attendance", "today", schoolId, userId],
    enabled: Boolean(enabled && schoolId && userId),
    queryFn: async () => {
      const res = await staffPortalApi.getStaffAttendance(schoolId!, { scope: "today" });
      return res.items?.[0] ?? null;
    },
  });

  const historyQuery = useQuery({
    queryKey: ["staff-attendance", "history", schoolId, userId, historyPage],
    enabled: Boolean(enabled && schoolId && userId),
    queryFn: async () => {
      const res = await staffPortalApi.getStaffAttendance(schoolId!, { page: historyPage });
      return res;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-attendance"] });
  };

  const history = historyQuery.data ?? emptyPage;

  return {
    todayAttendance: todayQuery.data ?? null,
    attendanceHistory: history.items,
    attendancePage: history.page,
    attendancePageSizeDays: history.pageSizeDays,
    attendanceHasMore: history.hasMore,
    loading: todayQuery.isLoading || historyQuery.isLoading,
    invalidate,
  };
}
