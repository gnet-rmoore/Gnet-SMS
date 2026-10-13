import { api } from "../../services/api";

export const athleticsApi = {
  fetchTeams: (schoolId: string) => api.get(`/api/schools/${schoolId}/athletics/teams`),
  createTeam: (schoolId: string, data: unknown) =>
    api.post(`/api/schools/${schoolId}/athletics/teams`, data),
  addRoster: (teamId: string, data: unknown) =>
    api.post(`/api/athletics/teams/${teamId}/roster`, data),
  removeRoster: (teamId: string, studentId: string) =>
    api.delete(`/api/athletics/teams/${teamId}/roster/${studentId}`),
  createEvent: (teamId: string, data: unknown) =>
    api.post(`/api/athletics/teams/${teamId}/events`, data),
};
