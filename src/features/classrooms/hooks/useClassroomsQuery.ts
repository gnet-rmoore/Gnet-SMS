import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { classroomsApi } from "../api";

export function useClassroomsQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["classrooms", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [classrooms, gradeLevels, staff, students, subjects] = await Promise.all([
        classroomsApi.fetchClassrooms(schoolId),
        classroomsApi.fetchGradeLevels(schoolId),
        classroomsApi.fetchStaff(schoolId),
        classroomsApi.fetchStudents(schoolId),
        classroomsApi.fetchSubjects(schoolId),
      ]);
      return {
        classrooms: Array.isArray(classrooms) ? classrooms : [],
        gradeLevels: Array.isArray(gradeLevels) ? gradeLevels : [],
        staff: Array.isArray(staff) ? staff : [],
        students: Array.isArray(students) ? students : [],
        subjects: Array.isArray(subjects) ? subjects : [],
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
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
