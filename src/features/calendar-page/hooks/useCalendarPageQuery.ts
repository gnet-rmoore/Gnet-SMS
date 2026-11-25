import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { useParentChild } from "../../../context/ParentChildContext";
import { calendarPageApi } from "../api";

function monthRange(d: Date) {
  const from = new Date(Date.UTC(d.getFullYear(), d.getMonth() - 1, 1));
  const to = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 2, 0));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function useCalendarPageQuery(viewDate?: Date) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { studentId: selectedStudentId } = useParentChild();
  const studentId = selectedStudentId || undefined;
  const anchor = viewDate || new Date();
  const { from, to } = monthRange(anchor);

  const query = useQuery({
    queryKey: ["calendar-page", user?.id, user?.role, from, to, studentId],
    enabled: Boolean(user?.role),
    queryFn: async () => {
      const events = await calendarPageApi.fetchEvents({ from, to, studentId });
      return {
        events: Array.isArray(events) ? events : [],
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["calendar-page", user?.id, user?.role] });

  return {
    ...query,
    events: query.data?.events ?? [],
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
