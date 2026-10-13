import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { enrollmentApi } from "../api";
import { useListFilters, type FilterFieldDef } from "../../list-filters";

export interface StudentPickerItem {
  id: string;
  name?: string;
  email?: string;
  photoUrl?: string | null;
  gradeLevel?: { id?: string; name?: string } | null;
  gradeLevelId?: string | null;
}

export interface PagedStudentResult {
  items: StudentPickerItem[];
  total: number;
  page: number;
  pageSize: number;
}

export function usePagedStudentsQuery(schoolId?: string, options?: {
  gradeLevelId?: string;
  feeCohort?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const authSchoolId = useAuthStore((s) => s.school?.id);
  const effectiveSchoolId = schoolId || authSchoolId;
  const queryClient = useQueryClient();

  const filterFields: FilterFieldDef[] = [
    {
      key: "gradeLevelId",
      label: "Grade Level",
      type: "enum",
      primary: true,
      allLabel: "All Grades",
      options: [], // Will be populated by parent component if needed
    },
  ];

  const filters = useListFilters({ fields: [], syncUrl: false });

  const query = useQuery({
    queryKey: ["paged-students", authSchoolId, {
      gradeLevelId: options?.gradeLevelId,
      feeCohort: options?.feeCohort,
      q: options?.q,
      page: options?.page,
      pageSize: options?.pageSize,
    }],
    enabled: Boolean(authSchoolId),
    queryFn: async () => {
      if (!authSchoolId) throw new Error("Missing school");
      const raw = await enrollmentApi.fetchStudents(
        authSchoolId,
        options?.page,
        options?.pageSize
      );
      if (raw && typeof raw === "object" && "items" in (raw as object)) {
        const env = raw as { items: any[]; total: number; page: number; pageSize: number };
        return {
          items: Array.isArray(env.items) ? env.items : [],
          total: env.total,
          page: env.page,
          pageSize: env.pageSize,
        };
      }
      const list = Array.isArray(raw) ? raw : [];
      return { items: list, total: list.length, page: 1, pageSize: list.length };
    },
    placeholderData: (previousData) => previousData,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["paged-students", authSchoolId] });

  return {
    ...query,
    students: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? 1,
    pageSize: query.data?.pageSize ?? 50,
    loading: query.isLoading,
    refetch: query.refetch,
    invalidate,
    filters,
  };
}

export function useStudentsQuery(schoolId?: string) {
  const authSchoolId = useAuthStore((s) => s.school?.id);
  const effectiveSchoolId = schoolId || authSchoolId;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["students", effectiveSchoolId],
    enabled: Boolean(effectiveSchoolId),
    queryFn: async () => {
      if (!effectiveSchoolId) throw new Error("Missing school");
      const students = await fetch(`/api/schools/${effectiveSchoolId}/students`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }).then((r) => r.json());
      return Array.isArray(students) ? students : [];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["students", effectiveSchoolId] });

  return {
    ...query,
    students: query.data ?? [],
    loading: query.isLoading,
    refetch: query.refetch,
    invalidate,
  };
}

export function usePagedStudents(schoolId?: string) {
  const authSchoolId = useAuthStore((s) => s.school?.id);
  const effectiveSchoolId = schoolId || authSchoolId;
  const queryClient = useQueryClient();

  const filterFields = [
    {
      key: "q",
      label: "Search",
      type: "text",
      primary: true,
      placeholder: "Search students...",
    },
  ];

  const filters = useListFilters({ fields: [], syncUrl: false });

  const query = useQuery({
    queryKey: ["paged-students", authSchoolId, filters.page, filters.pageSize, filters.committedQ],
    enabled: Boolean(authSchoolId),
    queryFn: async () => {
      if (!authSchoolId) throw new Error("Missing school");
      const raw = await fetch(
        `/api/schools/${authSchoolId}/students?${new URLSearchParams({
          ...(filters.page ? { page: String(filters.page) } : {}),
          ...(filters.pageSize ? { pageSize: String(filters.pageSize) } : {}),
          ...(filters.committedQ ? { q: filters.committedQ } : {}),
        })}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      ).then((r) => r.json());
      if (raw && typeof raw === "object" && "items" in (raw as object)) {
        const env = raw as { items: any[]; total: number; page: number; pageSize: number };
        return {
          items: Array.isArray(env.items) ? env.items : [],
          total: env.total,
          page: env.page,
          pageSize: env.pageSize,
        };
      }
      const list = Array.isArray(raw) ? raw : [];
      return { items: list, total: list.length, page: 1, pageSize: list.length };
    },
    placeholderData: (previousData) => previousData,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["paged-students", authSchoolId] });

  return {
    ...query,
    students: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? 1,
    pageSize: query.data?.pageSize ?? 50,
    loading: query.isLoading,
    refetch: query.refetch,
    invalidate,
    filters,
  };
}