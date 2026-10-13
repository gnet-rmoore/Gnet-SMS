import { api } from "../../services/api";

export const ptaApi = {
  getHome: (schoolId: string) => api.get(`/api/schools/${schoolId}/pta`),
  upsert: (
    schoolId: string,
    data: { name?: string; description?: string | null; enabled?: boolean }
  ) => api.put(`/api/schools/${schoolId}/pta`, data),
  appointOfficer: (schoolId: string, userId: string) =>
    api.post(`/api/schools/${schoolId}/pta/officers`, { userId }),
  removeOfficer: (schoolId: string, userId: string) =>
    api.delete(`/api/schools/${schoolId}/pta/officers/${userId}`),
  createMeeting: (schoolId: string, data: Record<string, unknown>) =>
    api.post(`/api/schools/${schoolId}/pta/meetings`, data),
  updateMeeting: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/pta/meetings/${id}`, data),
  rsvp: (id: string, status: "GOING" | "MAYBE" | "DECLINED") =>
    api.post(`/api/pta/meetings/${id}/rsvp`, { status }),
  createVolunteer: (schoolId: string, data: Record<string, unknown>) =>
    api.post(`/api/schools/${schoolId}/pta/volunteers`, data),
  signupVolunteer: (id: string, notes?: string) =>
    api.post(`/api/pta/volunteers/${id}/signup`, { notes: notes || "" }),
  createCampaign: (schoolId: string, data: Record<string, unknown>) =>
    api.post(`/api/schools/${schoolId}/pta/campaigns`, data),
  updateCampaign: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/pta/campaigns/${id}`, data),
};
