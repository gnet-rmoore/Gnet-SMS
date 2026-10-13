import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { settingsApi } from "../api";
import { academicCalendarApi } from "../../academic-calendar/api";

export function useSettingsQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const authSchool = useAuthStore((s) => s.school);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["settings", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [schoolData, gradeLegends, calendar] = await Promise.all([
        settingsApi.fetchSchool(schoolId).catch(() => authSchool || null),
        settingsApi.fetchGradeLegends(schoolId).catch(() => []),
        academicCalendarApi.fetchCalendar(schoolId).catch(() => null),
      ]);
      return {
        schoolData,
        gradeLegends: Array.isArray(gradeLegends) ? gradeLegends : [],
        calendar: calendar || null,
      };
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["settings", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["academic-calendar", schoolId] });
  };

  return {
    ...query,
    schoolData: query.data?.schoolData ?? null,
    gradeLegends: query.data?.gradeLegends ?? [],
    calendar: query.data?.calendar ?? null,
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
