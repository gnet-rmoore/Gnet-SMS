import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { expensesApi, type ExpensesListFilters } from "../api";

function staffName(member: any): string {
  return (
    member?.user?.name ||
    member?.name ||
    [member?.firstName, member?.lastName].filter(Boolean).join(" ") ||
    "Staff member"
  );
}

function parseListEnvelope<T>(
  raw: unknown,
  pageSize: number
): { items: T[]; total: number; page: number; pageSize: number } {
  if (raw && typeof raw === "object" && "items" in (raw as object)) {
    const env = raw as { items: T[]; total: number; page: number; pageSize: number };
    return {
      items: Array.isArray(env.items) ? env.items : [],
      total: Number(env.total) || 0,
      page: Number(env.page) || 1,
      pageSize: Number(env.pageSize) || pageSize,
    };
  }
  const arr = Array.isArray(raw) ? (raw as T[]) : [];
  return { items: arr, total: arr.length, page: 1, pageSize };
}

export function useExpensesQuery(ledgerFilters: ExpensesListFilters = {}) {
  const schoolId = useAuthStore((s) => s.school?.id);
  const queryClient = useQueryClient();
  const q = ledgerFilters.q?.trim() || undefined;
  const category = ledgerFilters.category || undefined;
  const status = ledgerFilters.status || undefined;
  const page = ledgerFilters.page || 1;
  const pageSize = ledgerFilters.pageSize || 50;

  const query = useQuery({
    queryKey: [
      "expenses",
      schoolId,
      q || "",
      category || "",
      status || "",
      page,
      pageSize,
    ],
    enabled: Boolean(schoolId),
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const [expensesRaw, fees, payrollsRaw, staff, summary] = await Promise.all([
        expensesApi.fetchExpenses(schoolId, { q, category, status, page, pageSize }),
        expensesApi.fetchFees(schoolId).catch(() => []),
        expensesApi.fetchPayrolls(schoolId).catch(() => []),
        expensesApi.fetchStaff(schoolId).catch(() => []),
        expensesApi.fetchFinanceSummary(schoolId).catch(() => null),
      ]);

      const expenseEnvelope = parseListEnvelope<any>(expensesRaw, pageSize);

      const staffList = Array.isArray(staff) ? staff : [];
      const byUserId = new Map<string, any>();
      for (const s of staffList) {
        const uid = s?.userId || s?.user?.id || s?.id;
        if (uid) byUserId.set(uid, s);
      }

      const payrollEnvelope = parseListEnvelope<any>(payrollsRaw, 50);
      const payrolls = payrollEnvelope.items.map((p: any) => {
        if (p.user?.name) return p;
        const member = byUserId.get(p.userId);
        return {
          ...p,
          user: {
            id: p.userId,
            name: member ? staffName(member) : "Staff member",
            role: member?.user?.role || member?.role || "STAFF",
          },
        };
      });

      return {
        expenses: expenseEnvelope.items,
        expenseTotal: expenseEnvelope.total,
        expensePage: expenseEnvelope.page,
        expensePageSize: expenseEnvelope.pageSize,
        fees: Array.isArray(fees) ? fees : [],
        payrolls,
        summary,
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["expenses", schoolId] });

  return {
    ...query,
    expenses: query.data?.expenses ?? [],
    total: query.data?.expenseTotal ?? 0,
    page: query.data?.expensePage ?? page,
    pageSize: query.data?.expensePageSize ?? pageSize,
    fees: query.data?.fees ?? [],
    payrolls: query.data?.payrolls ?? [],
    summary: query.data?.summary ?? null,
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    refetchAll: () => query.refetch(),
    invalidate,
  };
}
