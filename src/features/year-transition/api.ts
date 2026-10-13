import { api } from "../../services/api";

export type PromotionOutcome = "PROMOTED" | "REPEAT" | "GRADUATED" | "DO_NOT_RETURN";

export type PromotionDecision = {
  id?: string;
  studentUserId: string;
  outcome: PromotionOutcome | string;
  fromGradeLevelId?: string | null;
  toGradeLevelId?: string | null;
  fromClassroomId?: string | null;
  toClassroomId?: string | null;
};

export type PromotionRun = {
  id: string;
  schoolId: string;
  schoolYearKey: string;
  status: string;
  decisions?: PromotionDecision[];
  censusSnapshot?: { id: string; lockedAt?: string | null; _count?: { rows: number } };
  committedAt?: string | null;
  _count?: { decisions: number };
};

export type StatementCell = {
  opening: number;
  male: number;
  female: number;
  other: number;
  unknown: number;
  promoted: number;
  repeat: number;
  graduated: number;
  doNotReturn: number;
};

export type PromotionStatement = {
  schoolYearKey: string;
  draft: boolean;
  run: { id: string; status: string; committedAt?: string | null } | null;
  census: { id: string; capturedAt: string; lockedAt?: string | null; rowCount: number };
  school: StatementCell;
  divisions: Array<{
    divisionId: string | null;
    divisionName: string;
    totals: StatementCell;
    classes: Array<
      StatementCell & {
        key: string;
        gradeLevelId: string | null;
        gradeName: string;
        classroomId: string | null;
        classroomName: string;
      }
    >;
  }>;
  promotedUserIds: string[];
};

export const yearTransitionApi = {
  captureCensus: (schoolId: string, schoolYearKey: string) =>
    api.post(`/schools/${schoolId}/promotion/census`, { schoolYearKey }),

  getCensus: (schoolId: string, schoolYearKey: string) =>
    api.get(`/schools/${schoolId}/promotion/census`, { params: { schoolYearKey } }),

  createRun: (schoolId: string, schoolYearKey: string) =>
    api.post(`/schools/${schoolId}/promotion/runs`, { schoolYearKey }),

  listRuns: (schoolId: string, schoolYearKey?: string) =>
    api.get(`/schools/${schoolId}/promotion/runs`, {
      params: schoolYearKey ? { schoolYearKey } : undefined,
    }),

  getRun: (schoolId: string, runId: string) =>
    api.get(`/schools/${schoolId}/promotion/runs/${runId}`),

  saveDecisions: (schoolId: string, runId: string, decisions: PromotionDecision[]) =>
    api.put(`/schools/${schoolId}/promotion/runs/${runId}/decisions`, { decisions }),

  commitRun: (schoolId: string, runId: string) =>
    api.post(`/schools/${schoolId}/promotion/runs/${runId}/commit`, {}),

  getStatement: (schoolId: string, schoolYearKey: string, runId?: string) =>
    api.get(`/schools/${schoolId}/promotion/statement`, {
      params: { schoolYearKey, ...(runId ? { runId } : {}) },
    }),
};
