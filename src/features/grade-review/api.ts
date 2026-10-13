import { api } from "../../services/api";

export const gradeReviewApi = {
  fetchPending: (schoolId: string, opts?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (opts?.page) q.set("page", String(opts.page));
    if (opts?.limit) q.set("limit", String(opts.limit));
    const qs = q.toString();
    return api.get(
      `/api/schools/${schoolId}/grades/pending${qs ? `?${qs}` : ""}`
    );
  },

  fetchMySubmissions: (
    schoolId: string,
    opts?: { page?: number; limit?: number; status?: string }
  ) => {
    const q = new URLSearchParams();
    if (opts?.page) q.set("page", String(opts.page));
    if (opts?.limit) q.set("limit", String(opts.limit));
    if (opts?.status) q.set("status", opts.status);
    const qs = q.toString();
    return api.get(
      `/api/schools/${schoolId}/grades/my-submissions${qs ? `?${qs}` : ""}`
    );
  },

  reviewEntry: (
    id: string,
    data: { status: "ACCEPTED" | "REJECTED"; feedback?: string; isLocked?: boolean }
  ) => api.patch(`/api/grade-entries/${id}`, data),

  reviewBatch: (
    schoolId: string,
    data: { ids: string[]; status: "ACCEPTED" | "REJECTED"; feedback?: string }
  ) => api.post(`/api/schools/${schoolId}/grades/review-batch`, data),

  reopenEntry: (id: string, data?: { reason?: string }) =>
    api.post(`/api/grade-entries/${id}/reopen`, data || {}),
};
