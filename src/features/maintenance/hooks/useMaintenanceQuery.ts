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
      events: Array.isArray(o.events)
        ? o.events.map((event: any) => ({
            ...event,
            actorName: byId.get(event.actorId)?.name || null,
          }))
        : [],
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

export async function fetchAllWorkOrders(schoolId: string): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  let total: number | null = null;

  while (true) {
    const response: unknown = await maintenanceApi.fetchWorkOrders(schoolId, page, 100);
    if (Array.isArray(response)) {
      if (page !== 1) throw new Error("Work-order pagination response changed unexpectedly");
      return response;
    }
    if (response === null || typeof response !== "object" || !("items" in response)) {
      throw new Error("Invalid work-order response");
    }

    const pageItems = response.items;
    const pageTotal = "total" in response ? Number(response.total) : Number.NaN;
    if (
      !Array.isArray(pageItems) ||
      !Number.isSafeInteger(pageTotal) ||
      pageTotal < 0 ||
      (total !== null && total !== pageTotal)
    ) {
      throw new Error("Invalid work-order pagination response");
    }

    total = pageTotal;
    all.push(...pageItems);
    if (all.length >= total) return all;
    if (pageItems.length === 0) {
      throw new Error("Work-order pagination ended before all records were loaded");
    }
    page += 1;
  }
}

export function useMaintenanceQuery() {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["maintenance", schoolId],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [workOrders, inventoryRaw, staffRaw] = await Promise.all([
        fetchAllWorkOrders(schoolId),
        maintenanceApi.fetchInventory(schoolId),
        maintenanceApi.fetchStaff(schoolId),
      ]);
      const staff = normalizeStaff(Array.isArray(staffRaw) ? staffRaw : []);
      const inventory = Array.isArray(inventoryRaw)
        ? inventoryRaw.map((item) => ({
            ...item,
            assignedToName: staff.find((member) => member.id === item.assignedTo)?.name || null,
          }))
        : [];
      return {
        workOrders: enrichWorkOrders(workOrders, staff),
        inventory,
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
