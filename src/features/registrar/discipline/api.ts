import { api } from "../../../services/api";

export type DisciplineType =
  | "SUSPENSION"
  | "EXPULSION"
  | "WARNING"
  | "DETENTION"
  | "OTHER";

export type DisciplineRecord = {
  id: string;
  schoolId: string;
  studentUserId: string;
  studentName?: string;
  type: DisciplineType | string;
  startDate: string;
  endDate?: string | null;
  days: number;
  reason: string;
  actionTaken?: string | null;
  schoolYearKey?: string | null;
  recordedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DisciplineInput = {
  type: DisciplineType | string;
  startDate: string;
  endDate?: string | null;
  days?: number;
  reason: string;
  actionTaken?: string | null;
  schoolYearKey?: string | null;
};

export const disciplineApi = {
  list: (schoolId: string, params?: { studentId?: string; type?: string; from?: string; to?: string }) =>
    api.get(`/api/schools/${schoolId}/discipline`, { params }),

  create: (schoolId: string, data: DisciplineInput & { studentUserId: string }) =>
    api.post(`/api/schools/${schoolId}/discipline`, data),

  update: (id: string, data: Partial<DisciplineInput>) =>
    api.patch(`/api/discipline/${id}`, data),

  remove: (id: string) => api.delete(`/api/discipline/${id}`),
};
