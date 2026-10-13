import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";

export type PagedStudentsFilters = {
  q?: string;
  gradeLevelId?: string;
  feeCohort?: string;
  page?: number;
  pageSize?: number;
};

function normalizeEnvelope(
  raw: unknown,
  page: number,
  pageSize: number
): { items: any[]; total: number; page: number; pageSize: number } {
  if (raw && typeof raw === "object" && "items" in (raw as object)) {
    const env = raw as { items: unknown[]; total: number; page?: number; pageSize?: number };
    return {
      items: Array.isArray(env.items) ? env.items : [],
      total: Number(env.total) || 0,
      page: Number(env.page) || page,
      pageSize: Number(env.pageSize) || pageSize,
    };
  }
  const items = Array.isArray(raw) ? raw : [];
  return { items, total: items.length, page: 1, pageSize };
}

/** Server-paged student list for pickers and directories (no extra grade/classroom fetches). */
export function usePagedStudents(filters: PagedStudentsFilters = {}) {
  const schoolId = useAuthStore((s) => s.school?.id);
  const q = filters.q?.trim() || undefined;
  const gradeLevelId = filters.gradeLevelId || undefined;
  const feeCohort = filters.feeCohort || undefined;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;

  const query = useQuery({
    queryKey: ["paged-students", schoolId, q || "", gradeLevelId || "", feeCohort || "", page, pageSize],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (gradeLevelId) params.set("gradeLevelId", gradeLevelId);
      if (feeCohort) params.set("feeCohort", feeCohort);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const raw = await api.get(`/api/schools/${schoolId}/students?${params.toString()}`);
      return normalizeEnvelope(raw, page, pageSize);
    },
  });

  return {
    students: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? page,
    pageSize: query.data?.pageSize ?? pageSize,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
