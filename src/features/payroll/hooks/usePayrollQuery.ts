import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { payrollApi } from "../api";
import type { StaffMember } from "../types";

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
  return member?.user?.role || member?.role || member?.position || "STAFF";
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

export function usePayrollQuery(
  month?: number,
  year?: number,
  filters: { status?: string; q?: string; page?: number; pageSize?: number } = {}
) {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();
  const status = filters.status || undefined;
  const q = filters.q?.trim() || undefined;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;

  const query = useQuery({
    queryKey: ["payroll", schoolId, month, year, status || "", q || "", page, pageSize],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [payrollsRaw, staffRaw] = await Promise.all([
        payrollApi.fetchPayrolls(schoolId, month, year, { status, q, page, pageSize }),
        payrollApi.fetchStaff(schoolId),
      ]);
      const staff = normalizeStaff(Array.isArray(staffRaw) ? staffRaw : []);
      const byUserId = new Map(staff.map((s) => [s.id, s]));

      const envelope =
        payrollsRaw && typeof payrollsRaw === "object" && "items" in (payrollsRaw as object)
          ? (payrollsRaw as { items: unknown[]; total: number; page: number; pageSize: number })
          : {
              items: Array.isArray(payrollsRaw) ? payrollsRaw : [],
              total: Array.isArray(payrollsRaw) ? payrollsRaw.length : 0,
              page: 1,
              pageSize,
            };

      const payrolls = envelope.items.map((p: any) => {
        if (p.user?.name) return p;
        const member = byUserId.get(p.userId);
        if (!member) {
          return {
            ...p,
            user: p.user || {
              id: p.userId,
              name: "Unknown staff",
              role: "STAFF",
            },
          };
        }
        return {
          ...p,
          user: {
            id: p.userId,
            name: member.name,
            role: member.role,
            email: member.email,
            photoUrl: member.photoUrl,
          },
        };
      });

      const withPhotos = payrolls.map((p: any) => {
        if (p.user?.photoUrl) return p;
        const member = byUserId.get(p.userId);
        if (!member?.photoUrl) return p;
        return {
          ...p,
          user: { ...(p.user || { id: p.userId }), photoUrl: member.photoUrl },
        };
      });

      return {
        payrolls: withPhotos,
        staff,
        total: envelope.total,
        page: envelope.page,
        pageSize: envelope.pageSize,
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["payroll", schoolId] });

  return {
    ...query,
    payrolls: query.data?.payrolls ?? [],
    staff: query.data?.staff ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? page,
    pageSize: query.data?.pageSize ?? pageSize,
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
