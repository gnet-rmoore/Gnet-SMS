import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { maintenanceApi } from "../api";

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  photoUrl?: string | null;
  isActive?: boolean;
};

function staffDisplayName(member: any): string {
  return (
    member?.user?.name ||
    member?.name ||
    [member?.firstName, member?.lastName].filter(Boolean).join(" ") ||
    "Staff member"
  );
}

function normalizeStaff(raw: any[]): StaffMember[] {
  return raw
    .map((s) => ({
      id: s?.userId || s?.user?.id || s?.id,
      name: staffDisplayName(s),
      role: s?.user?.role || s?.role || "STAFF",
      photoUrl: s?.user?.photoUrl || s?.photoUrl || null,
      isActive: s?.isActive !== false,
    }))
    .filter((s) => Boolean(s.id));
}

function enrichWorkOrders(orders: any[], staff: StaffMember[]) {
  const byId = new Map(staff.map((s) => [s.id, s]));
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
        : { id: o.requestedBy, name: "Staff member" },
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

export function useMaintenanceQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["maintenance", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [workOrdersRaw, inventoryRaw, staffRaw] = await Promise.all([
        maintenanceApi.fetchWorkOrders(schoolId),
        maintenanceApi.fetchInventory(schoolId),
        maintenanceApi.fetchStaff(schoolId),
      ]);
      const staff = normalizeStaff(Array.isArray(staffRaw) ? staffRaw : []);
      const workOrders = enrichWorkOrders(
        Array.isArray(workOrdersRaw) ? workOrdersRaw : [],
        staff
      );
      return {
        workOrders,
        inventory: Array.isArray(inventoryRaw) ? inventoryRaw : [],
        staff,
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["maintenance", schoolId] });

  return {
    ...query,
    workOrders: query.data?.workOrders ?? [],
    inventory: query.data?.inventory ?? [],
    staff: query.data?.staff ?? [],
    loading: query.isLoading,
    invalidate,
  };
}
