import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { registrarApi } from "../api";

export function useRegistrarQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["registrar", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [studentsRes, gradeLevels, classrooms] = await Promise.all([
        registrarApi.fetchStudents(schoolId, { page: "1", pageSize: "50" }),
        registrarApi.fetchGradeLevels(schoolId),
        registrarApi.fetchClassrooms(schoolId),
      ]);
      const students = Array.isArray(studentsRes)
        ? studentsRes
        : Array.isArray((studentsRes as any)?.items)
          ? (studentsRes as any).items
          : [];
      return {
        students,
        gradeLevels: Array.isArray(gradeLevels) ? gradeLevels : [],
        classrooms: Array.isArray(classrooms) ? classrooms : [],
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["registrar", schoolId] });

  return {
    ...query,
    students: query.data?.students ?? [],
    gradeLevels: query.data?.gradeLevels ?? [],
    classrooms: query.data?.classrooms ?? [],
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
