import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { dashboardApi } from "../api";

export function useDashboardQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["dashboard", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [statsResult, summaryResult] = await Promise.allSettled([
        dashboardApi.fetchStats(schoolId),
        dashboardApi.fetchFinanceSummary(schoolId),
      ]);
      return {
        stats: statsResult.status === "fulfilled" ? statsResult.value : null,
        summary: summaryResult.status === "fulfilled" ? summaryResult.value : null,
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["dashboard", schoolId] });

  return {
    ...query,
    stats: query.data?.stats ?? null,
    summary: query.data?.summary ?? null,
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
