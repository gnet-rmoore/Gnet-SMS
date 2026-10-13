import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { registrarApi } from "../api";

export type ApplicationsListFilters = {
  q?: string;
  status?: string;
  gradeLevelId?: string;
  page?: number;
  pageSize?: number;
};

export function useApplicationsQuery(filters: ApplicationsListFilters = {}) {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();
  const q = filters.q?.trim() || undefined;
  const status = filters.status || undefined;
  const gradeLevelId = filters.gradeLevelId || undefined;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;

  const query = useQuery({
    queryKey: [
      "registrar-applications",
      schoolId,
      q || "",
      status || "",
      gradeLevelId || "",
      page,
      pageSize,
    ],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const raw = await registrarApi.fetchApplications(schoolId, {
        q,
        status,
        gradeLevelId,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (raw && typeof raw === "object" && "items" in (raw as object)) {
        const env = raw as { items: unknown[]; total: number; page: number; pageSize: number };
        return {
          applications: Array.isArray(env.items) ? env.items : [],
          total: env.total,
          page: env.page,
          pageSize: env.pageSize,
        };
      }
      const list = Array.isArray(raw) ? raw : [];
      return { applications: list, total: list.length, page: 1, pageSize };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["registrar-applications", schoolId] });

  return {
    applications: query.data?.applications ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? page,
    pageSize: query.data?.pageSize ?? pageSize,
    loading: query.isLoading,
    refetch: query.refetch,
    invalidate,
  };
}
