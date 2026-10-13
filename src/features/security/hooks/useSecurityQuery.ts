import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { securityApi } from "../api";

export function useSecurityQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["security", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [logs] = await Promise.all([
        securityApi.fetchSecurityLogs(schoolId),
      ]);
      return {
        logs: Array.isArray(logs) ? logs : [],
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["security", schoolId] });

  return {
    ...query,
    logs: query.data?.logs ?? [],
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
