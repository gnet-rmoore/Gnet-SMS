import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { classroomsApi } from "../api";

const toArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: any[] }).items;
  }
  return [];
};

const safeFetch = async <T,>(fn: () => Promise<T>): Promise<T | []> => {
  try {
    return await fn();
  } catch (err) {
    console.error("Failed to fetch in useClassroomsQuery", err);
    return [];
  }
};

export function useClassroomsQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["classrooms", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [classrooms, gradeLevels, staff, students, subjects] = await Promise.all([
        safeFetch(() => classroomsApi.fetchClassrooms(schoolId)),
        safeFetch(() => classroomsApi.fetchGradeLevels(schoolId)),
        safeFetch(() => classroomsApi.fetchStaff(schoolId)),
        safeFetch(() => classroomsApi.fetchStudents(schoolId)),
        safeFetch(() => classroomsApi.fetchSubjects(schoolId)),
      ]);
      return {
        classrooms: toArray(classrooms),
        gradeLevels: toArray(gradeLevels),
        staff: toArray(staff),
        students: toArray(students),
        subjects: toArray(subjects),
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["classrooms", schoolId] });

  return {
    ...query,
    classrooms: query.data?.classrooms ?? [],
    gradeLevels: query.data?.gradeLevels ?? [],
    staff: query.data?.staff ?? [],
    students: query.data?.students ?? [],
    subjects: query.data?.subjects ?? [],
    loading: query.isLoading || query.isFetching,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
