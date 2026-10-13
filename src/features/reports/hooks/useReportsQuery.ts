import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { reportsApi } from "../api";

async function softFetch<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export function useReportsQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const role = useAuthStore((s) => s.user?.role);
  const queryClient = useQueryClient();

  const canFinance = ["SCHOOL_ADMIN", "ACCOUNTANT", "PRINCIPAL", "VPA", "SUPER_ADMIN"].includes(
    role || ""
  );
  const canAttendance = [
    "SCHOOL_ADMIN",
    "PRINCIPAL",
    "VPI",
    "VPA",
    "TEACHER",
    "SUPER_ADMIN",
  ].includes(role || "");
  const canOps = ["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "MAINTENANCE", "SUPER_ADMIN"].includes(
    role || ""
  );
  const canLeave = ["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "SUPER_ADMIN"].includes(role || "");

  const query = useQuery({
    queryKey: ["school-reports", schoolId, role],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");

      const [stats, attendance, finance, workOrders, leaveRequests] =
        await Promise.all([
          softFetch(() => reportsApi.fetchStats(schoolId)),
          canAttendance
            ? softFetch(() => reportsApi.fetchAttendanceStats(schoolId))
            : Promise.resolve(null),
          canFinance
            ? softFetch(() => reportsApi.fetchFinanceSummary(schoolId))
            : Promise.resolve(null),
          canOps
            ? softFetch(() => reportsApi.fetchWorkOrders(schoolId))
            : Promise.resolve(null),
          canLeave
            ? softFetch(() => reportsApi.fetchLeaveRequests(schoolId))
            : Promise.resolve(null),
        ]);

      const woList = Array.isArray(workOrders) ? workOrders : [];
      const leaveList = Array.isArray(leaveRequests) ? leaveRequests : [];

      return {
        stats,
        attendance,
        finance,
        workOrderCounts: {
          total: woList.length,
          open: woList.filter((o: any) => o.status === "OPEN").length,
          inProgress: woList.filter((o: any) => o.status === "IN_PROGRESS")
            .length,
        },
        leavePending: leaveList.filter((r: any) => r.status === "PENDING")
          .length,
        canFinance,
        canAttendance,
        canOps,
        canLeave,
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["school-reports", schoolId] });

  return {
    ...query,
    data: query.data,
    loading: query.isLoading,
    invalidate,
  };
}
