import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { academicCalendarApi } from "../api";

export function useAcademicCalendarQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["academic-calendar", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [calendar, templates] = await Promise.all([
        academicCalendarApi.fetchCalendar(schoolId),
        academicCalendarApi.fetchTemplates(schoolId),
      ]);
      return {
        calendar,
        templates: Array.isArray(templates) ? templates : [],
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["academic-calendar", schoolId] });

  return {
    ...query,
    calendar: query.data?.calendar ?? null,
    templates: query.data?.templates ?? [],
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
