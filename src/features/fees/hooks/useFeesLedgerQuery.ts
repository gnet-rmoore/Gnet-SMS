import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { enrichStudentsWithClassrooms, feesApi } from "../api";
import type { FeePayment } from "../types";

export type FeesLedgerParams = {
  q?: string;
  status?: string;
  type?: string;
  page: number;
  pageSize: number;
  sort?: string;
  order?: "asc" | "desc";
  /** When false, skip fetch (e.g. wrong tab / portal viewer). */
  enabled?: boolean;
};

/**
 * Server-paged fee ledger rows (`page` always sent so finance returns an envelope).
 */
export function useFeesLedgerQuery(params: FeesLedgerParams) {
  const schoolId = useAuthStore((s) => s.school?.id);
  const role = useAuthStore((s) => s.user?.role);
  const isPortalViewer = role === "STUDENT" || role === "PARENT";
  const enabled =
    params.enabled !== false && Boolean(schoolId) && !isPortalViewer;

  const query = useQuery({
    queryKey: [
      "fees",
      "ledger",
      schoolId,
      params.q,
      params.status,
      params.type,
      params.page,
      params.pageSize,
      params.sort,
      params.order,
    ],
    enabled,
    queryFn: async () => {
      if (!schoolId) throw new Error("Missing school");
      const res: any = await feesApi.fetchFees(schoolId, {
        q: params.q || undefined,
        status: params.status && params.status !== "ALL" ? params.status : undefined,
        type: params.type && params.type !== "ALL" ? params.type : undefined,
        page: params.page,
        pageSize: params.pageSize,
        sort: params.sort,
        order: params.order,
      });

      const items: FeePayment[] = Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res)
          ? res
          : [];
      const total = Number(res?.total ?? items.length) || 0;

      let students: any[] = [];
      try {
        const raw = await feesApi.fetchStudents(schoolId);
        students = Array.isArray(raw) ? raw : [];
        students = await enrichStudentsWithClassrooms(schoolId, students);
      } catch {
        students = [];
      }

      const byStudentId = new Map(students.map((s: any) => [s.id, s]));
      const enriched = items.map((f: any) => {
        const member = byStudentId.get(f.studentId);
        if (!member) return f;
        return {
          ...f,
          student: {
            ...(f.student || {}),
            id: member.id,
            name: f.student?.name || member.name,
            email: f.student?.email || member.email,
            photoUrl: f.student?.photoUrl || member.photoUrl || null,
            classroomMembers: member.classroomMembers || [],
          },
        };
      });

      return {
        fees: enriched as FeePayment[],
        total,
        page: Number(res?.page) || params.page,
        pageSize: Number(res?.pageSize) || params.pageSize,
      };
    },
  });

  return {
    ...query,
    fees: query.data?.fees ?? [],
    total: query.data?.total ?? 0,
    loading: query.isLoading,
  };
}
