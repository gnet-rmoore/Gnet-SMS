import { api } from "../../services/api";

export type AdmissionPolicyPayload = {
  publicApplyEnabled: boolean;
  returningApplyEnabled: boolean;
  requireEntranceFee: boolean;
  requiredDocTypes: string[];
  requireClassroomOnEnroll: boolean;
  entranceFeeAmount: number;
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
};
