import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { leaveApprovalApi } from "../api";
import type { LeaveRequest, LeaveStaff } from "../types";

function staffDisplayName(member: any): string {
  return (
    member?.user?.name ||
    member?.name ||
    member?.userName ||
    [member?.firstName, member?.lastName].filter(Boolean).join(" ") ||
    "Staff member"
  );
}

function normalizeStaff(raw: any[]): LeaveStaff[] {
  return raw
    .map((s) => ({
      id: s?.userId || s?.user?.id || s?.id,
      name: staffDisplayName(s),
      role: s?.user?.role || s?.role || "STAFF",
      email: s?.user?.email || s?.email,
      photoUrl: s?.user?.photoUrl || s?.photoUrl || null,
    }))
    .filter((s) => Boolean(s.id));
}

function enrichRequests(raw: any[], staff: LeaveStaff[]): LeaveRequest[] {
  const byId = new Map(staff.map((s) => [s.id, s]));
  return raw.map((r) => {
    const user = byId.get(r.userId);
    const approver = r.approvedBy ? byId.get(r.approvedBy) : null;
    return {
      ...r,
      user: user
        ? {
            id: user.id,
            name: user.name,
            role: user.role,
            email: user.email,
            photoUrl: user.photoUrl,
          }
        : r.user || { id: r.userId, name: "Unknown staff", role: "STAFF" },
      approver: approver
        ? { id: approver.id, name: approver.name, role: approver.role, photoUrl: approver.photoUrl }
        : null,
    };
  });
}

export function useLeaveApprovalQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["leave-approval", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [requestsRaw, staffRaw] = await Promise.all([
        leaveApprovalApi.fetchLeaveRequests(schoolId),
        leaveApprovalApi.fetchStaff(schoolId),
      ]);
      const staff = normalizeStaff(Array.isArray(staffRaw) ? staffRaw : []);
      const requests = enrichRequests(
        Array.isArray(requestsRaw) ? requestsRaw : [],
        staff
      );
      return { requests, staff };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["leave-approval", schoolId] });

  return {
    ...query,
    requests: query.data?.requests ?? [],
    staff: query.data?.staff ?? [],
    loading: query.isLoading,
    invalidate,
  };
}
