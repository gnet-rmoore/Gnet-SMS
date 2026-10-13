import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { studentsApi } from "../api";

export type StudentsListFilters = {
  q?: string;
  gradeLevelId?: string;
  feeCohort?: string;
  page?: number;
  pageSize?: number;
};

export function useStudentsQuery(filters: StudentsListFilters = {}) {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();
  const q = filters.q?.trim() || undefined;
  const gradeLevelId = filters.gradeLevelId || undefined;
  const feeCohort = filters.feeCohort || undefined;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;

  const query = useQuery({
    queryKey: ["students", schoolId, q || "", gradeLevelId || "", feeCohort || "", page, pageSize],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [studentsRes, classrooms, gradeLevels] = await Promise.all([
        studentsApi.fetchStudents(schoolId, {
          q,
          gradeLevelId,
          feeCohort,
          page: String(page),
          pageSize: String(pageSize),
        }),
        studentsApi.fetchClassrooms(schoolId),
        studentsApi.fetchGradeLevels(schoolId),
      ]);
      const envelope =
        studentsRes && typeof studentsRes === "object" && "items" in (studentsRes as object)
          ? (studentsRes as { items: unknown[]; total: number; page: number; pageSize: number })
          : {
              items: Array.isArray(studentsRes) ? studentsRes : [],
              total: Array.isArray(studentsRes) ? studentsRes.length : 0,
              page: 1,
              pageSize,
            };
      return {
        students: envelope.items,
        total: envelope.total,
        page: envelope.page,
        pageSize: envelope.pageSize,
        classrooms: Array.isArray(classrooms) ? classrooms : [],
        gradeLevels: Array.isArray(gradeLevels) ? gradeLevels : [],
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["students", schoolId] });

  return {
    ...query,
    students: query.data?.students ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? page,
    pageSize: query.data?.pageSize ?? pageSize,
    classrooms: query.data?.classrooms ?? [],
    gradeLevels: query.data?.gradeLevels ?? [],
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
