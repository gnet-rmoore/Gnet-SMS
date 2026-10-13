import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { staffPortalApi } from "../api";

export function useStaffPortalQuery(activeTab: string) {
  const schoolId = useAuthStore((s) => s.school?.id);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["staff-portal", schoolId, user?.id, activeTab],
    enabled: Boolean(schoolId && user?.id),
    queryFn: async () => {
      if (!schoolId || !user?.id) throw new Error("Missing school/user");
      if (activeTab === "attendance") {
        return {
          attendance: [],
          leaves: [],
          leaveBalances: [],
          tasks: [],
          announcements: [],
          documents: [],
          payrolls: [],
        };
      }
      if (activeTab === "leave") {
        const [leaves, leaveBalances] = await Promise.all([
          staffPortalApi.getLeaveRequests(schoolId, user.id),
          staffPortalApi.getLeaveBalances(schoolId, user.id),
        ]);
        return {
          attendance: [],
          leaves: Array.isArray(leaves) ? leaves : [],
          leaveBalances: Array.isArray(leaveBalances) ? leaveBalances : [],
          tasks: [],
          announcements: [],
          documents: [],
          payrolls: [],
        };
      }
      if (activeTab === "tasks") {
        const tasks = await staffPortalApi.getTasks(schoolId, user.id);
        return {
          attendance: [],
          leaves: [],
          leaveBalances: [],
          tasks: Array.isArray(tasks) ? tasks : [],
          announcements: [],
          documents: [],
          payrolls: [],
        };
      }
      if (activeTab === "announcements") {
        const announcements = await staffPortalApi.getAnnouncements(schoolId, user.role);
        return {
          attendance: [],
          leaves: [],
          leaveBalances: [],
          tasks: [],
          announcements: Array.isArray(announcements) ? announcements : [],
          documents: [],
          payrolls: [],
        };
      }
      if (activeTab === "documents") {
        const documents = await staffPortalApi.getDocuments(schoolId, user.role);
        return {
          attendance: [],
          leaves: [],
          leaveBalances: [],
          tasks: [],
          announcements: [],
          documents: Array.isArray(documents) ? documents : [],
          payrolls: [],
        };
      }
      if (activeTab === "payroll") {
        const payrolls = await staffPortalApi.getUserPayrolls(user.id);
        return {
          attendance: [],
          leaves: [],
          leaveBalances: [],
          tasks: [],
          announcements: [],
          documents: [],
          payrolls: Array.isArray(payrolls) ? payrolls : [],
        };
      }
      return {
        attendance: [],
        leaves: [],
        leaveBalances: [],
        tasks: [],
        announcements: [],
        documents: [],
        payrolls: [],
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["staff-portal", schoolId, user?.id] });

  return {
    ...query,
    attendance: query.data?.attendance ?? [],
    leaves: query.data?.leaves ?? [],
    leaveBalances: query.data?.leaveBalances ?? [],
    tasks: query.data?.tasks ?? [],
    announcements: query.data?.announcements ?? [],
    documents: query.data?.documents ?? [],
    payrolls: query.data?.payrolls ?? [],
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
