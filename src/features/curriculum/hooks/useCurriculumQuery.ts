import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { curriculumApi } from "../api";
import { useListFilters, type FilterFieldDef } from "../../list-filters";
import { fetchAllItems, unwrapItems, unwrapTotal } from "../../../lib/apiEnvelope";

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

  const selectorQuery = useQuery({
    queryKey: ["curriculum-selectors", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [subjects, gradeLevels, classrooms, staff, offerings] = await Promise.all([
        fetchAllItems<{ id: string; name: string; code?: string }>((page, pageSize) =>
          curriculumApi.fetchSubjects(schoolId, page, pageSize)
        ),
        fetchAllItems<{ id: string; name: string }>((page, pageSize) =>
          curriculumApi.fetchGradeLevels(schoolId, page, pageSize)
        ),
        curriculumApi.fetchClassrooms(schoolId),
        curriculumApi.fetchStaff(schoolId),
        curriculumApi.fetchSubjectOfferings(schoolId),
      ]);
      return {
        subjects,
        gradeLevels,
        classrooms: unwrapItems<{
          id: string;
          name: string;
          subjectId?: string | null;
          gradeLevelId?: string | null;
          ownerTeacherId?: string | null;
          members?: Array<{ userId: string; role: string }>;
        }>(classrooms),
        staff: unwrapItems<{ id: string; name: string; role?: string; photoUrl?: string | null; email?: string | null }>(staff),
        offerings: unwrapItems<{ id: string; subjectId: string; gradeLevelId: string }>(offerings),
      };
    },
  });

  const query = useQuery({
    queryKey: ["curriculum", schoolId, filters.page, filters.pageSize, filters.committedQ],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const syllabi = await curriculumApi.fetchSyllabi(schoolId, filters.page, filters.pageSize);
      return {
        syllabi: unwrapItems<{
          id: string;
          schoolId: string;
          subjectId: string;
          gradeLevelId: string;
          teacherId: string;
          teacherName: string;
          subjectName: string;
          gradeLevelName: string;
          title: string;
          academicYear: string;
          calendarPatternId?: string | null;
          standardsFramework: string;
          objectives: string;
          units: string;
          textbooks?: string;
          differentiation?: string;
          accommodations?: string;
          gradingCriteria?: string;
          status: string;
          feedback?: string;
          createdAt: string;
          updatedAt: string;
        }>(syllabi),
        totalSyllabi: unwrapTotal(syllabi),
      };
    },
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["curriculum", schoolId] }),
      queryClient.invalidateQueries({ queryKey: ["curriculum-selectors", schoolId] }),
    ]);

  return {
    ...query,
    subjects: selectorQuery.data?.subjects ?? [],
    gradeLevels: selectorQuery.data?.gradeLevels ?? [],
    classrooms: selectorQuery.data?.classrooms ?? [],
    syllabi: query.data?.syllabi ?? [],
    staff: selectorQuery.data?.staff ?? [],
    offerings: selectorQuery.data?.offerings ?? [],
    totalSubjects: selectorQuery.data?.subjects.length ?? 0,
    totalGradeLevels: selectorQuery.data?.gradeLevels.length ?? 0,
    totalClassrooms: selectorQuery.data?.classrooms.length ?? 0,
    totalSyllabi: query.data?.totalSyllabi ?? 0,
    loading: query.isLoading || selectorQuery.isLoading,
    refetchAll: () => Promise.all([query.refetch(), selectorQuery.refetch()]),
    invalidate,
    filters,
  };
}
