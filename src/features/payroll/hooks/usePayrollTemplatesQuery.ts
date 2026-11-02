import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { payrollApi } from "../api";
import type { PayrollTemplate } from "../types";

export function usePayrollTemplatesQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["payroll-templates", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const raw = await payrollApi.fetchPayrollTemplates(schoolId);
      return Array.isArray(raw) ? (raw as PayrollTemplate[]) : [];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["payroll-templates", schoolId] });

  return {
    ...query,
    templates: query.data ?? [],
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
