import { api } from "../../services/api";

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

export type OnlineExamConfig = {
  isOnline?: boolean;
  maxViolations?: number;
  showResultsImmediately?: boolean;
  instructions?: string | null;
  classId?: string | null;
  subjectId?: string | null;
  retakePolicy?: {
    maxRetakes?: number;
    waitingPeriodHours?: number;
    scoreRetention?: "best" | "last" | "average";
  } | null;
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

export const onlineExamApi = {
  updateConfig: (examId: string, data: OnlineExamConfig) =>
    api.patch(`/api/exams/${examId}/online-config`, data),

  getQuestions: (examId: string) => api.get(`/api/exams/${examId}/questions`),

  saveQuestions: (examId: string, questions: OnlineQuestionInput[]) =>
    api.put(`/api/exams/${examId}/questions`, { questions }),

  listOnlineExams: (schoolId: string, studentId?: string) =>
    api.get(
      `/api/schools/${schoolId}/online-exams${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`
    ),

  listStudentAttempts: (studentId: string) =>
    api.get(`/api/students/${studentId}/exam-attempts`),

  listExamAttempts: (examId: string) => api.get(`/api/exams/${examId}/attempts`),

  startAttempt: (examId: string, accepted: boolean) =>
    api.post(`/api/exams/${examId}/attempts`, { accepted }),

  getAttempt: (attemptId: string) => api.get(`/api/exam-attempts/${attemptId}`),

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

  scoreSamplePreview: (
    answers: { questionId: string; selectedChoiceId?: string | null; textAnswer?: string | null }[]
  ) => api.post(`/api/exams/preview/sample/score`, { answers }),

  getLiveAttempts: (examId: string) => api.get(`/api/exams/${examId}/live-attempts`),

  // Retake
  getRetakeEligibility: (examId: string) =>
    api.get(`/api/exams/${examId}/retake-eligibility`) as Promise<RetakeEligibility>,

  startRetake: (examId: string, accepted: boolean) =>
    api.post(`/api/exams/${examId}/retake`, { accepted }),

  // Gradebook push
  pushToGradebook: (examId: string, data: { attemptId?: string; pushAll?: boolean }) =>
    api.post(`/api/exams/${examId}/push-to-gradebook`, data),

  // Retake policy
  updateRetakePolicy: (examId: string, policy: {
    maxRetakes?: number;
    waitingPeriodHours?: number;
    scoreRetention?: "best" | "last" | "average";
  }) => api.patch(`/api/exams/${examId}/retake-policy`, policy),
};
