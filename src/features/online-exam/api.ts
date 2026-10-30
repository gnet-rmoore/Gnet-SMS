import { api } from "../../services/api";
import { fetchAllItems } from "../../lib/apiEnvelope";

export type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "ESSAY";

export type OnlineChoiceInput = {
  label?: string;
  text: string;
  isCorrect: boolean;
};

export type OnlineQuestionInput = {
  type: QuestionType;
  prompt: string;
  points: number;
  correctAnswer?: string | null;
  correctBoolean?: boolean;
  caseSensitive?: boolean;
  choices?: OnlineChoiceInput[];
};

export type ViolationType =
  | "EXIT_FULLSCREEN"
  | "TAB_BLUR"
  | "VISIBILITY_HIDDEN"
  | "CONTEXT_MENU"
  | "COPY_ATTEMPT"
  | "PASTE_ATTEMPT"
  | "DEVTOOLS"
  | "MULTI_MONITOR"
  | "SCREEN_SHARE_STOPPED";

export type ProctorLevel = "OFF" | "MONITOR" | "SCREEN_VIEW";

export type KioskConfig = {
  requireFullscreen: boolean;
  requireScreenShare: boolean;
  maxViolations: number;
  warnAt: number;
  blockedEvents: ViolationType[];
  allowReconnect: boolean;
};

export type OnlineExamConfig = {
  isOnline?: boolean;
  maxViolations?: number;
  showResultsImmediately?: boolean;
  instructions?: string | null;
  classId?: string | null;
  subjectId?: string | null;
  proctorLevel?: ProctorLevel;
  autoPostGrades?: boolean;
  kioskConfig?: Partial<KioskConfig> | null;
  retakePolicy?: {
    maxRetakes?: number;
    waitingPeriodHours?: number;
    scoreRetention?: "best" | "last" | "average";
  } | null;
};

export type QuestionImportRowResult = {
  index: number;
  rowNumber: number;
  ok: boolean;
  errors: string[];
  preview: string;
};

export type QuestionImportPreview = {
  ok: boolean;
  canImport: boolean;
  rowCount: number;
  validCount: number;
  errorCount: number;
  rows: QuestionImportRowResult[];
  blockers: string[];
  code: string | null;
};

export type RetakeEligibility = {
  eligible: boolean;
  reason: string;
  nextAttemptNumber?: number;
  attemptsUsed?: number;
  maxRetakes?: number;
  waitUntil?: string;
  attemptId?: string;
};

export type BankVisibility = "PRIVATE" | "SHARED";

export type BankChoice = {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
};

export type BankItem = {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  correctAnswer: string | null;
  caseSensitive: boolean;
  subjectId: string | null;
  gradeLevelId: string | null;
  topic: string | null;
  tags: string[];
  visibility: BankVisibility;
  createdBy: string;
  updatedBy: string | null;
  sourceExamId: string | null;
  sourceQuestionId: string | null;
  createdAt: string;
  updatedAt: string;
  choices: BankChoice[];
};

export type BankTaxonomy = {
  subjectId?: string | null;
  gradeLevelId?: string | null;
  topic?: string | null;
  tags?: string[] | string;
  visibility?: BankVisibility;
};

export type BankListFilters = {
  type?: string;
  subjectId?: string;
  gradeLevelId?: string;
  visibility?: BankVisibility;
  mine?: boolean;
  search?: string;
};

export const onlineExamApi = {
  updateConfig: (examId: string, data: OnlineExamConfig) =>
    api.patch(`/api/exams/${examId}/online-config`, data),

  getQuestions: (examId: string) => api.get(`/api/exams/${examId}/questions`),

  saveQuestions: (examId: string, questions: OnlineQuestionInput[]) =>
    api.put(`/api/exams/${examId}/questions`, { questions }),

  previewQuestionImport: (
    examId: string,
    rows: Record<string, unknown>[],
    sourceFileName: string
  ) =>
    api.post(`/api/exams/${examId}/questions/import/preview`, {
      rows,
      sourceFileName,
    }) as Promise<QuestionImportPreview>,

  importQuestions: (
    examId: string,
    rows: Record<string, unknown>[],
    sourceFileName: string
  ) =>
    api.post(`/api/exams/${examId}/questions/import`, {
      rows,
      sourceFileName,
    }) as Promise<{ questions: unknown[] }>,

  listOnlineExams: (schoolId: string, studentId?: string) =>
    api.get(
      `/api/schools/${schoolId}/online-exams${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`
    ),

  listStudentAttempts: (studentId: string) =>
    api.get(`/api/students/${studentId}/exam-attempts`),

  listExamAttempts: (examId: string) => api.get(`/api/exams/${examId}/attempts`),

  startAttempt: (examId: string, accepted: boolean, screenShareConsented = false) =>
    api.post(`/api/exams/${examId}/attempts`, { accepted, screenShareConsented }),

  resumeAttempt: (examId: string) => api.get(`/api/exams/${examId}/attempt`),

  getAttempt: (attemptId: string) => api.get(`/api/exam-attempts/${attemptId}`),

  heartbeat: (attemptId: string) =>
    api.post(`/api/exam-attempts/${attemptId}/heartbeat`, {}),

  saveAnswers: (
    attemptId: string,
    answers: { questionId: string; selectedChoiceId?: string | null; textAnswer?: string | null }[]
  ) => api.patch(`/api/exam-attempts/${attemptId}/answers`, { answers }),

  reportViolation: (attemptId: string, type: string, detail?: string) =>
    api.post(`/api/exam-attempts/${attemptId}/violations`, { type, detail }),

  submit: (attemptId: string) => api.post(`/api/exam-attempts/${attemptId}/submit`, {}),

  getResults: (attemptId: string) => api.get(`/api/exam-attempts/${attemptId}/results`),

  getExamPreview: (examId: string) => api.get(`/api/exams/${examId}/online-preview`),

  scoreExamPreview: (
    examId: string,
    answers: { questionId: string; selectedChoiceId?: string | null; textAnswer?: string | null }[]
  ) => api.post(`/api/exams/${examId}/online-preview/score`, { answers }),

  getSamplePreview: () => api.get(`/api/exams/preview/sample`),

  // Shareable demo links: staff issue one, any student in the school can open it.
  createDemoLink: (examId: string) =>
    api.post(`/api/exams/${examId}/demo-link`) as Promise<{
      success: boolean;
      demoToken: string;
      expiresAt: string;
      examId: string;
      examTitle: string;
      durationMinutes: number | null;
    }>,

  getDemoPreview: (demoToken: string) =>
    api.get(`/api/exams/demo/${encodeURIComponent(demoToken)}`),

  scoreDemoPreview: (
    demoToken: string,
    answers: { questionId: string; selectedChoiceId?: string | null; textAnswer?: string | null }[]
  ) => api.post(`/api/exams/demo/${encodeURIComponent(demoToken)}/score`, { answers }),

  scoreSamplePreview: (
    answers: { questionId: string; selectedChoiceId?: string | null; textAnswer?: string | null }[]
  ) => api.post(`/api/exams/preview/sample/score`, { answers }),

  getLiveAttempts: (examId: string) => api.get(`/api/exams/${examId}/live-attempts`),

  // Live Proctor actions
  warnStudent: (attemptId: string, message: string) =>
    api.post(`/api/exam-attempts/${attemptId}/warn`, { message }),

  flagAttempt: (attemptId: string, flagged: boolean, note?: string) =>
    api.post(`/api/exam-attempts/${attemptId}/flag`, { flagged, note }),

  forceSubmitAttempt: (attemptId: string) =>
    api.post(`/api/exam-attempts/${attemptId}/force-submit`, {}),

  extendAttemptTime: (attemptId: string, extraMinutes: number) =>
    api.post(`/api/exam-attempts/${attemptId}/extend`, { extraMinutes }),

  // Live screen view (SCREEN_VIEW)
  getScreenConfig: (attemptId: string) =>
    api.get(`/api/exam-attempts/${attemptId}/screen-config`) as Promise<{
      proctorLevel: ProctorLevel;
      consented: boolean;
      storageEnabled: boolean;
      intervalMs: number;
      enabled: boolean;
    }>,

  createScreenFrameUpload: (attemptId: string, mimeType: string) =>
    api.post(`/api/exam-attempts/${attemptId}/screen-frame`, { mimeType }) as Promise<
      | { enabled: false }
      | { enabled: true; frameId: string; uploadUrl: string; contentType: string; expiresIn: number }
    >,

  markScreenFrameUploaded: (attemptId: string, frameId: string, byteSize: number) =>
    api.post(`/api/exam-attempts/${attemptId}/screen-frame/${frameId}/uploaded`, { byteSize }),

  listProctorFrames: (attemptId: string) =>
    api.get(`/api/exam-attempts/${attemptId}/frames`) as Promise<
      { id: string; capturedAt: string; byteSize: number | null; url: string }[]
    >,

  // Retake
  getRetakeEligibility: (examId: string) =>
    api.get(`/api/exams/${examId}/retake-eligibility`) as Promise<RetakeEligibility>,

  startRetake: (examId: string, accepted: boolean, screenShareConsented = false) =>
    api.post(`/api/exams/${examId}/retake`, { accepted, screenShareConsented }),

  // Gradebook push
  pushToGradebook: (examId: string, data: { attemptId?: string; pushAll?: boolean; dryRun?: boolean; force?: boolean }) =>
    api.post(`/api/exams/${examId}/push-to-gradebook`, data),

  // Manual essay marking (null resets to pending)
  markEssayAnswer: (attemptId: string, questionId: string, pointsAwarded: number | null) =>
    api.patch(`/api/exam-attempts/${attemptId}/answers/${questionId}/grade`, { pointsAwarded }),

  // Retake policy
  updateRetakePolicy: (examId: string, policy: {
    maxRetakes?: number;
    waitingPeriodHours?: number;
    scoreRetention?: "best" | "last" | "average";
  }) => api.patch(`/api/exams/${examId}/retake-policy`, policy),
};

/** School question bank (reusable authored questions). */
export const questionBankApi = {
  fetchSubjects: (schoolId: string) =>
    fetchAllItems<{ id: string; name: string; code?: string }>((page, pageSize) =>
      api.get(`/api/schools/${schoolId}/subjects?page=${page}&pageSize=${pageSize}`)
    ),

  fetchGradeLevels: (schoolId: string) =>
    fetchAllItems<{ id: string; name: string }>((page, pageSize) =>
      api.get(`/api/schools/${schoolId}/grade-levels?page=${page}&pageSize=${pageSize}`)
    ),

  list: (schoolId: string, filters: BankListFilters = {}) =>
    api.get(`/api/schools/${schoolId}/question-bank`, {
      params: {
        type: filters.type,
        subjectId: filters.subjectId,
        gradeLevelId: filters.gradeLevelId,
        visibility: filters.visibility,
        mine: filters.mine ? "true" : undefined,
        search: filters.search,
      },
    }) as Promise<{ items: BankItem[]; total: number }>,

  get: (schoolId: string, itemId: string) =>
    api.get(`/api/schools/${schoolId}/question-bank/${itemId}`) as Promise<{ item: BankItem }>,

  create: (schoolId: string, questions: OnlineQuestionInput[], taxonomy: BankTaxonomy = {}) =>
    api.post(`/api/schools/${schoolId}/question-bank`, { questions, ...taxonomy }) as Promise<{
      items: BankItem[];
      created: number;
    }>,

  update: (schoolId: string, itemId: string, question: OnlineQuestionInput, taxonomy: BankTaxonomy = {}) =>
    api.put(`/api/schools/${schoolId}/question-bank/${itemId}`, { question, ...taxonomy }) as Promise<{
      item: BankItem;
    }>,

  remove: (schoolId: string, itemId: string) =>
    api.delete(`/api/schools/${schoolId}/question-bank/${itemId}`) as Promise<{ deleted: boolean }>,

  saveFromExam: (
    examId: string,
    options: BankTaxonomy & { questionIds?: string[] } = {}
  ) =>
    api.post(`/api/exams/${examId}/questions/save-to-bank`, options) as Promise<{
      items: BankItem[];
      created: number;
    }>,
};
