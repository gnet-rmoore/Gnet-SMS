import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { workOrdersApi } from "../api";
import type { StaffMember, WorkOrder } from "../types";

function staffDisplayName(member: any): string {
  return (
    member?.user?.name ||
    member?.name ||
    member?.userName ||
    [member?.firstName, member?.lastName].filter(Boolean).join(" ") ||
    "Staff member"
  );
}

function staffRole(member: any): string {
  return member?.user?.role || member?.role || "STAFF";
}

function normalizeStaff(raw: any[]): StaffMember[] {
  return raw
    .map((s) => ({
      id: s?.userId || s?.user?.id || s?.id,
      name: staffDisplayName(s),
      role: staffRole(s),
      email: s?.user?.email || s?.email,
      photoUrl: s?.user?.photoUrl || s?.photoUrl || null,
      isActive: s?.isActive !== false,
    }))
    .filter((s) => Boolean(s.id));
}

function enrichOrders(
  orders: any[],
  staff: StaffMember[],
  self?: { id?: string; name?: string; role?: string; photoUrl?: string | null } | null
): WorkOrder[] {
  const byId = new Map(staff.map((s) => [s.id, s]));
  if (self?.id && !byId.has(self.id)) {
    byId.set(self.id, {
      id: self.id,
      name: self.name || "You",
      role: self.role || "STAFF",
      photoUrl: self.photoUrl || null,
      isActive: true,
    });
  }
  return orders.map((o) => {
    const requester = byId.get(o.requestedBy);
    const assignee = o.assignedTo ? byId.get(o.assignedTo) : null;
    return {
      ...o,
      requester: requester
        ? {
            id: requester.id,
            name: requester.name,
            role: requester.role,
            photoUrl: requester.photoUrl,
          }
        : {
            id: o.requestedBy,
            name: "Staff member",
          },
      assignee: assignee
        ? {
            id: assignee.id,
            name: assignee.name,
            role: assignee.role,
            photoUrl: assignee.photoUrl,
          }
        : null,
    };
  });
}

export function useWorkOrdersQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["work-orders", schoolId, user?.id],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [workOrdersRaw, staffRaw] = await Promise.all([
        workOrdersApi.fetchWorkOrders(schoolId),
        workOrdersApi.fetchStaff(schoolId),
      ]);
      const staff = normalizeStaff(
        Array.isArray(staffRaw)
          ? staffRaw
          : Array.isArray((staffRaw as any)?.items)
            ? (staffRaw as any).items
            : []
      );
      const workOrders = enrichOrders(
        Array.isArray(workOrdersRaw)
          ? workOrdersRaw
          : Array.isArray((workOrdersRaw as any)?.items)
            ? (workOrdersRaw as any).items
            : [],
        staff,
        user
          ? {
              id: user.id,
              name: user.name,
              role: user.role,
              photoUrl: user.photoUrl,
            }
          : null
      );
      return { workOrders, staff };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["work-orders", schoolId] });

  return {
    ...query,
    workOrders: query.data?.workOrders ?? [],
    staff: query.data?.staff ?? [],
    loading: query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
