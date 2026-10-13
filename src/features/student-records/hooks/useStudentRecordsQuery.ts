import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { studentRecordsApi } from "../api";

export function useStudentRecordsQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["student-records", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [students] = await Promise.all([
        studentRecordsApi.fetchStudents(schoolId),
      ]);
      return {
        students: Array.isArray(students) ? students : [],
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["student-records", schoolId] });

  return {
    ...query,
    students: query.data?.students ?? [],
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
