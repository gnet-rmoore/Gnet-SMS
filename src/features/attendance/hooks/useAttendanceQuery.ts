import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { attendanceApi, type AttendanceFilters } from "../api";

const STATS_ROLES = new Set([
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "TEACHER",
]);

const PAGE_SIZE = 50;

export function useAttendanceQuery(filters: AttendanceFilters = {}) {
  const schoolId = useAuthStore((s) => s.school?.id);
  const role = useAuthStore((s) => s.user?.role);
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["attendance", schoolId, role, filters],
    enabled: Boolean(schoolId),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      if (!schoolId) throw new Error("Missing school");
      const canStats = role ? STATS_ROLES.has(role) : false;
      const [attendanceResult, statsResult] = await Promise.allSettled([
        attendanceApi.fetchAttendance(schoolId, {
          ...filters,
          page: pageParam,
          pageSize: PAGE_SIZE,
        }),
        canStats
          ? attendanceApi.fetchAttendanceStats(schoolId)
          : Promise.resolve(null),
      ]);
      if (attendanceResult.status === "rejected") throw attendanceResult.reason;
      const attendanceRaw = attendanceResult.value as any;
      const items = Array.isArray(attendanceRaw)
        ? attendanceRaw
        : Array.isArray(attendanceRaw?.items)
          ? attendanceRaw.items
          : [];
      return {
        items,
        total: Number(attendanceRaw?.total ?? items.length),
        page: Number(attendanceRaw?.page ?? pageParam),
        pageSize: Number(attendanceRaw?.pageSize ?? PAGE_SIZE),
        stats:
          statsResult.status === "fulfilled" ? statsResult.value : null,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total
        ? lastPage.page + 1
        : undefined,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["attendance", schoolId] });

  return {
    ...query,
    attendance: query.data?.pages.flatMap((page) => page.items) ?? [],
    stats: query.data?.pages[0]?.stats ?? null,
    total: query.data?.pages[0]?.total ?? 0,
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
