import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { curriculumApi } from "../api";
import { useListFilters, type FilterFieldDef } from "../../list-filters";

export function useCurriculumQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();

  const filterFields: FilterFieldDef[] = [
    {
      key: "search",
      label: "Search",
      type: "text",
      primary: true,
    },
  ];

  const filters = useListFilters({ fields: filterFields, syncUrl: true });

  const query = useQuery({
    queryKey: ["curriculum", schoolId, filters.page, filters.pageSize, filters.committedQ],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [subjects, gradeLevels, classrooms, syllabi, staff, offerings] = await Promise.all([
        curriculumApi.fetchSubjects(schoolId, filters.page, filters.pageSize),
        curriculumApi.fetchGradeLevels(schoolId, filters.page, filters.pageSize),
        curriculumApi.fetchClassrooms(schoolId, filters.page, filters.pageSize),
        curriculumApi.fetchSyllabi(schoolId, filters.page, filters.pageSize),
        curriculumApi.fetchStaff(schoolId),
        curriculumApi.fetchSubjectOfferings(schoolId).catch(() => []),
      ]);
      return {
        subjects: Array.isArray(subjects?.items) ? subjects.items : (Array.isArray(subjects) ? subjects : []),
        gradeLevels: Array.isArray(gradeLevels?.items) ? gradeLevels.items : (Array.isArray(gradeLevels) ? gradeLevels : []),
        classrooms: Array.isArray(classrooms?.items) ? classrooms.items : (Array.isArray(classrooms) ? classrooms : []),
        syllabi: Array.isArray(syllabi?.items) ? syllabi.items : (Array.isArray(syllabi) ? syllabi : []),
        staff: Array.isArray(staff) ? staff : [],
        offerings: Array.isArray(offerings) ? offerings : [],
        totalSubjects: subjects?.total ?? 0,
        totalGradeLevels: gradeLevels?.total ?? 0,
        totalClassrooms: classrooms?.total ?? 0,
        totalSyllabi: syllabi?.total ?? 0,
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["curriculum", schoolId] });

  return {
    ...query,
    subjects: query.data?.subjects ?? [],
    gradeLevels: query.data?.gradeLevels ?? [],
    classrooms: query.data?.classrooms ?? [],
    syllabi: query.data?.syllabi ?? [],
    staff: query.data?.staff ?? [],
    offerings: query.data?.offerings ?? [],
    totalSubjects: query.data?.totalSubjects ?? 0,
    totalGradeLevels: query.data?.totalGradeLevels ?? 0,
    totalClassrooms: query.data?.totalClassrooms ?? 0,
    totalSyllabi: query.data?.totalSyllabi ?? 0,
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
    filters,
  };
}
