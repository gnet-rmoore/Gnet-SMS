import { api } from "../../services/api";

/** Thin API wrappers for the fees feature. */
export const feesApi = {
  fetchFees: (schoolId: string, params: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "" && String(v) !== "ALL") {
        q.set(k, String(v));
      }
    });
    const qs = q.toString();
    return api.get(`/api/schools/${schoolId}/fees${qs ? `?${qs}` : ""}`);
  },
  fetchMyFees: (_?: void) => api.get(`/api/my-fees`),
  fetchStudents: (schoolId: string) => api.get(`/api/schools/${schoolId}/students`),
  fetchClassrooms: (schoolId: string) => api.get(`/api/schools/${schoolId}/classrooms`),
  fetchMembers: (classroomId: string) => api.get(`/api/classrooms/${classroomId}/members`),
  createFee: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/fees`, data),
  updateFee: (schoolId: string, feeId: string, data: unknown) =>
    api.patch(`/api/schools/${schoolId}/fees/${feeId}`, data),
  voidFee: (schoolId: string, feeId: string) =>
    api.post(`/api/schools/${schoolId}/fees/${feeId}/void`, {}),
  writeOffFee: (schoolId: string, feeId: string, data: unknown = {}) =>
    api.post(`/api/schools/${schoolId}/fees/${feeId}/write-off`, data),
  fetchBillingSettings: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/fee-billing-settings`),
  updateBillingSettings: (schoolId: string, data: unknown) =>
    api.patch(`/api/schools/${schoolId}/fee-billing-settings`, data),
  backfillLegacyTxns: (schoolId: string) =>
    api.post(`/api/schools/${schoolId}/fee-payment-txns/backfill-legacy`, {}),
  collectFee: (schoolId: string, feeId: string, data: unknown = {}) =>
    api.post(`/api/schools/${schoolId}/fees/${feeId}/collect`, data),
  recordPayment: (feeId: string, data: unknown = {}) =>
    api.post(`/api/fees/${feeId}/payments`, data),
  fetchFeePayments: (feeId: string) => api.get(`/api/fees/${feeId}/payments`),
  fetchSchoolPaymentTxns: (schoolId: string, params: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "") q.set(k, String(v));
    });
    const qs = q.toString();
    return api.get(`/api/schools/${schoolId}/fee-payment-txns${qs ? `?${qs}` : ""}`);
  },
  exportSchoolPaymentTxnsUrl: (schoolId: string, params: Record<string, string | undefined> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) q.set(k, v);
    });
    const qs = q.toString();
    return `/api/schools/${schoolId}/fee-payment-txns/export${qs ? `?${qs}` : ""}`;
  },
  fetchMyPaymentTxns: () => api.get(`/api/my-fee-payment-txns`),
  remindFee: (feeId: string, data: unknown = {}) =>
    api.post(`/api/fees/${feeId}/remind`, data),
  payFee: (feeId: string, data: unknown = {}) =>
    api.patch(`/api/fees/${feeId}/pay`, data),
  createCheckout: (
    feeId: string,
    data: { successUrl?: string; cancelUrl?: string; email?: string; amount?: number } = {}
  ) => api.post(`/api/fees/${feeId}/checkout`, data),
  fetchTemplates: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/fee-templates`),
  createTemplate: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/fee-templates`, data),
  updateTemplate: (schoolId: string, templateId: string, data: unknown) =>
    api.patch(`/api/schools/${schoolId}/fee-templates/${templateId}`, data),
  deleteTemplate: (schoolId: string, templateId: string) =>
    api.delete(`/api/schools/${schoolId}/fee-templates/${templateId}`),
  batchApply: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/fees/batch-apply`, data),
  fetchGradeLevels: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/grade-levels`),
  fetchDivisions: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/divisions`),
};

/** Attach classroom memberships onto students (Identity no longer embeds them). */
export async function enrichStudentsWithClassrooms(
  schoolId: string,
  students: any[]
): Promise<any[]> {
  if (!students.length) return students;
  try {
    const classroomsRaw = await feesApi.fetchClassrooms(schoolId);
    const classrooms = Array.isArray(classroomsRaw) ? classroomsRaw : [];
    const memberships = await Promise.all(
      classrooms.map(async (c: any) => {
        try {
          const members = await feesApi.fetchMembers(c.id);
          const studentIds = (Array.isArray(members) ? members : [])
            .filter((m: any) => (m.role || m.user?.role) === "STUDENT")
            .map((m: any) => m.userId || m.user?.id)
            .filter(Boolean);
          return { classroom: { id: c.id, name: c.name }, studentIds };
        } catch {
          return { classroom: { id: c.id, name: c.name }, studentIds: [] as string[] };
        }
      })
    );

    const byStudent = new Map<string, Array<{ classroom: { id: string; name: string } }>>();
    for (const { classroom, studentIds } of memberships) {
      for (const uid of studentIds) {
        const arr = byStudent.get(uid) || [];
        arr.push({ classroom });
        byStudent.set(uid, arr);
      }
    }

    return students.map((s) => ({
      ...s,
      classroomMembers: byStudent.get(s.id) || s.classroomMembers || [],
    }));
  } catch {
    return students;
  }
}
