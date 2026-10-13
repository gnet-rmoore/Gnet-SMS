import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { attendanceApi } from "../api";

const STATS_ROLES = new Set([
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "TEACHER",
]);

export function useAttendanceQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const role = useAuthStore((s) => s.user?.role);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["attendance", schoolId, role],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const canStats = role ? STATS_ROLES.has(role) : false;
      const [attendanceResult, statsResult] = await Promise.allSettled([
        attendanceApi.fetchAttendance(schoolId),
        canStats
          ? attendanceApi.fetchAttendanceStats(schoolId)
          : Promise.resolve(null),
      ]);
      const attendanceRaw =
        attendanceResult.status === "fulfilled" ? attendanceResult.value : null;
      const attendance = Array.isArray(attendanceRaw)
        ? attendanceRaw
        : Array.isArray((attendanceRaw as any)?.items)
          ? (attendanceRaw as any).items
          : [];
      return {
        attendance,
        stats:
          statsResult.status === "fulfilled" ? statsResult.value : null,
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["attendance", schoolId] });

  return {
    ...query,
    attendance: query.data?.attendance ?? [],
    stats: query.data?.stats ?? null,
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
