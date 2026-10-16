import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { academicCalendarApi } from "./api";
import {
  currentPeriod as selectCurrentPeriod,
  periodsOf,
  type CalendarLike,
} from "./selectors";

/**
 * Canonical Academic Calendar query hook.
 *
 * Single react-query owner of `["academic-calendar", schoolId]`. All features
 * (Exams, Gradebook, Class Schedule, Settings, Report Cards, Curriculum,
 * Lesson Plans, Dashboard) share this cache entry, so a calendar save
 * anywhere invalidates and refreshes everywhere.
 */
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
        calendar: calendar as CalendarLike | null,
        templates: Array.isArray(templates) ? templates : [],
      };
    },
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["academic-calendar", schoolId] });
    // The School Calendar events are derived (server-side) from periods,
    // exam components and exams, so refresh it too.
    await queryClient.invalidateQueries({ queryKey: ["calendar-page"] });
  };

  // Kept permissive (`any`) so existing consumers that read arbitrary API
  // fields keep compiling; new code should use the typed selectors below.
  const calendar = (query.data?.calendar ?? null) as any;

  return {
    ...query,
    schoolId,
    calendar,
    periods: periodsOf(calendar),
    activePeriod: selectCurrentPeriod(calendar),
    templates: query.data?.templates ?? [],
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}

/** Invalidate the shared academic calendar cache without mounting the hook. */
export async function invalidateAcademicCalendar(
  queryClient: ReturnType<typeof useQueryClient>,
  schoolId?: string
) {
  await queryClient.invalidateQueries({
    queryKey: schoolId ? ["academic-calendar", schoolId] : ["academic-calendar"],
  });
  await queryClient.invalidateQueries({ queryKey: ["calendar-page"] });
}
