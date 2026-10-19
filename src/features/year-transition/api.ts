import { api } from "../../services/api";

export type PromotionOutcome =
  | "PROMOTED"
  | "REPEAT"
  | "GRADUATED"
  | "DROPPED_OUT"
  | "DO_NOT_RETURN";

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
  droppedOut: number;
  suspended: number;
  passed: number;
  failed: number;
};

export type PromotionStatement = {
  schoolYearKey: string;
  scope: "YEAR" | "TERM";
  draft: boolean;
  run: { id: string; status: string; committedAt?: string | null } | null;
  period: {
    id: string;
    label: string;
    shortCode: string;
    startDate: string;
    endDate: string;
  } | null;
  window: { from: string | null; to: string | null };
  schoolInfo: { id: string; name: string; logoUrl?: string | null } | null;
  census: { id: string; capturedAt: string; lockedAt?: string | null; rowCount: number };
  totals: StatementCell & {
    totalStudentsBeginning: number;
    maleStudents: number;
    femaleStudents: number;
    otherStudents: number;
    unknownGender: number;
  };
  academic: {
    passThreshold: number;
    averageScore: number;
    studentsWithResults: number;
  };
  attendance: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    records: number;
    averageRate: number;
  };
  discipline: {
    suspendedCount: number;
    totalSuspensionDays: number;
    students: Array<{ studentUserId: string; count: number; days: number }>;
  };
  bestAcademicPerformers: Array<{
    studentUserId: string;
    name: string;
    gradeName: string;
    overallAverage: number;
    position: number;
  }>;
  bestAttendance: Array<{
    studentUserId: string;
    name: string;
    gradeName: string;
    attendanceRate: number;
    present: number;
    total: number;
  }>;
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

export type YearTransitionResult = {
  fromYearKey: string;
  toYearKey: string;
  targetYear: { id: string; yearKey: string; status: string };
  run: { id: string; status: string; decisions: number };
  counts: {
    promoted: number;
    repeat: number;
    graduated: number;
    dropped_out: number;
    do_not_return: number;
  };
  homerooms: { created: number; existing: number; total: number };
  assignedStudents: number;
  unassignedStudentIds: string[];
  staff: { note: string };
  committed: {
    id: string;
    status: string;
    financeHandoff?: { promotedCount: number; feeCohort: string; feesPath: string };
  } | null;
};

export const yearTransitionApi = {
  captureCensus: (schoolId: string, schoolYearKey: string) =>
    api.post(`/api/schools/${schoolId}/promotion/census`, { schoolYearKey }),

  getCensus: (schoolId: string, schoolYearKey: string) =>
    api.get(`/api/schools/${schoolId}/promotion/census`, { params: { schoolYearKey } }),

  createRun: (schoolId: string, schoolYearKey: string, autoOutcome = true) =>
    api.post(`/api/schools/${schoolId}/promotion/runs`, { schoolYearKey, autoOutcome }),

  listRuns: (schoolId: string, schoolYearKey?: string) =>
    api.get(`/api/schools/${schoolId}/promotion/runs`, {
      params: schoolYearKey ? { schoolYearKey } : undefined,
    }),

  getRun: (schoolId: string, runId: string) =>
    api.get(`/api/schools/${schoolId}/promotion/runs/${runId}`),

  saveDecisions: (schoolId: string, runId: string, decisions: PromotionDecision[]) =>
    api.put(`/api/schools/${schoolId}/promotion/runs/${runId}/decisions`, { decisions }),

  commitRun: (schoolId: string, runId: string) =>
    api.post(`/api/schools/${schoolId}/promotion/runs/${runId}/commit`, {}),

  getStatement: (
    schoolId: string,
    schoolYearKey: string,
    opts: { runId?: string; scope?: "YEAR" | "TERM"; periodId?: string } = {}
  ) =>
    api.get(`/api/schools/${schoolId}/promotion/statement`, {
      params: {
        schoolYearKey,
        ...(opts.runId ? { runId: opts.runId } : {}),
        ...(opts.scope ? { scope: opts.scope } : {}),
        ...(opts.periodId ? { periodId: opts.periodId } : {}),
      },
    }),

  transitionYear: (schoolId: string, targetYearKey: string, opts: { commit?: boolean } = {}) =>
    api.post(`/api/schools/${schoolId}/promotion/transition`, {
      targetYearKey,
      commit: opts.commit !== false,
    }),
};