import { api } from "../../services/api";

export type SchoolApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  createdBy?: string;
  lastUsedAt?: string | null;
  createdAt?: string;
  secret?: string;
};

/** Thin API wrappers for the settings feature. */
export const settingsApi = {
  fetchSchool: (schoolId: string) => api.get(`/api/schools/${schoolId}`),
  updateSchool: (schoolId: string, data: unknown) => api.patch(`/api/schools/${schoolId}`, data),
  updateReceiptTemplate: (
    schoolId: string,
    payload: { receiptTemplates: Partial<Record<string, string>> }
  ) => api.patch(`/api/schools/${schoolId}/receipt-template`, payload),
  fetchGradeLegends: (schoolId: string) => api.get(`/api/schools/${schoolId}/grade-legends`),
  createGradeLegend: (schoolId: string, data: unknown) => api.post(`/api/schools/${schoolId}/grade-legends`, data),
  updateGradeLegend: (schoolId: string, id: string, data: unknown) => api.patch(`/api/schools/${schoolId}/grade-legends/${id}`, data),
  deleteGradeLegend: (schoolId: string, id: string) => api.delete(`/api/schools/${schoolId}/grade-legends/${id}`),
  fetchNotificationPrefs: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/notification-preferences`),
  updateNotificationPrefs: (
    schoolId: string,
    body: {
      preferences: unknown;
      removeEventKeys?: string[];
    } | unknown
  ) => {
    const payload =
      body && typeof body === "object" && !Array.isArray(body) && "preferences" in (body as object)
        ? body
        : { preferences: body };
    return api.patch(`/api/schools/${schoolId}/notification-preferences`, payload);
  },
  listApiKeys: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/api-keys`) as Promise<SchoolApiKeyRow[]>,
  createApiKey: (schoolId: string, name: string) =>
    api.post(`/api/schools/${schoolId}/api-keys`, { name }) as Promise<SchoolApiKeyRow>,
  revokeApiKey: (schoolId: string, keyId: string) =>
    api.delete(`/api/schools/${schoolId}/api-keys/${keyId}`),
  fetchSubscription: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/subscription`),
  syncGradebookStructureTemplate: (schoolId: string) =>
    api.post(`/api/schools/${schoolId}/gradebook/sync-structure-template`, {}),
};
