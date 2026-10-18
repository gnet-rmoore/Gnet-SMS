import { api } from "../../services/api";

export type AdmissionPolicyPayload = {
  publicApplyEnabled: boolean;
  returningApplyEnabled: boolean;
  requireEntranceFee: boolean;
  requiredDocTypes: string[];
  requireClassroomOnEnroll: boolean;
  entranceFeeAmount: number;
  /** Custom background image for the public registration page. */
  applyBackgroundUrl?: string;
};

/** Thin API wrappers for the registrar feature. */
export const registrarApi = {
  fetchStudents: (schoolId: string, params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : "";
    return api.get(`/api/schools/${schoolId}/students${q}`);
  },
  fetchApplications: (
    schoolId: string,
    params?: { q?: string; status?: string; gradeLevelId?: string; page?: string; pageSize?: string }
  ) => {
    const q = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()}` : "";
    return api.get(`/api/schools/${schoolId}/applications${q}`);
  },
  fetchFunnel: (schoolId: string) => api.get(`/api/schools/${schoolId}/applications/funnel`),
  fetchGradeLevels: (schoolId: string) => api.get(`/api/schools/${schoolId}/grade-levels`),
  fetchClassrooms: (schoolId: string) => api.get(`/api/schools/${schoolId}/classrooms`),
  fetchClassroomMembers: (classroomId: string) => api.get(`/api/classrooms/${classroomId}/members`),
  updateUser: (userId: string, data: unknown) => api.patch(`/api/users/${userId}`, data),
  deleteUser: (userId: string) => api.delete(`/api/users/${userId}`),
  updateApplication: (applicationId: string, data: unknown) =>
    api.patch(`/api/applications/${applicationId}`, data),
  transitionApplication: (applicationId: string, to: string, data?: Record<string, unknown>) =>
    api.post(`/api/applications/${applicationId}/transition`, { to, ...(data || {}) }),
  enrollApplication: (
    applicationId: string,
    data?: { classroomId?: string; waiveFee?: boolean; waiveDocs?: boolean },
    idempotencyKey?: string
  ) =>
    api.post(`/api/applications/${applicationId}/enroll`, data || {}, {
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    }),
  getNextAction: (applicationId: string) => api.get(`/api/applications/${applicationId}/next-action`),
  createEntranceFee: (applicationId: string, amount: number) =>
    api.post(`/api/applications/${applicationId}/create-entrance-fee`, { amount }),
  presignDocument: (applicationId: string, data: unknown) =>
    api.post(`/api/applications/${applicationId}/documents/presign`, data),
  confirmDocument: (applicationId: string, data: unknown) =>
    api.post(`/api/applications/${applicationId}/documents/confirm`, data),
  reviewDocument: (applicationId: string, docId: string, data: unknown) =>
    api.patch(`/api/applications/${applicationId}/documents/${docId}`, data),
  createApplication: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/applications`, data),
  addClassroomMember: (classroomId: string, data: unknown) =>
    api.post(`/api/classrooms/${classroomId}/members`, data),
  removeClassroomMember: (classroomId: string, userId: string) =>
    api.delete(`/api/classrooms/${classroomId}/members/${userId}`),
  getAdmissionPolicy: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/admission-policy`) as Promise<{
      schoolId: string;
      slug: string;
      name: string;
      admissionPolicy: AdmissionPolicyPayload;
    }>,
  updateAdmissionPolicy: (schoolId: string, patch: Partial<AdmissionPolicyPayload>) =>
    api.patch(`/api/schools/${schoolId}/admission-policy`, patch) as Promise<{
      schoolId: string;
      slug: string;
      name: string;
      admissionPolicy: AdmissionPolicyPayload;
    }>,
  presignAdmissionBackground: (schoolId: string, data: { fileName: string; mimeType: string }) =>
    api.post(`/api/schools/${schoolId}/admission-background/presign`, data) as Promise<{
      uploadUrl: string;
      fileUrl: string;
    }>,
};
