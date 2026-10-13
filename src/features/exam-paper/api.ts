import { api } from "../../services/api";
import type { OnlineQuestionInput } from "../online-exam/api";

export const examPaperApi = {
  get: (examId: string) => api.get(`/api/exams/${examId}/paper`),
  update: (examId: string, data: Record<string, unknown>) =>
    api.put(`/api/exams/${examId}/paper`, data),
  submit: (examId: string) => api.post(`/api/exams/${examId}/paper/submit`, {}),
  presignPdf: (examId: string, fileName: string) =>
    api.post(`/api/exams/${examId}/paper/pdf/presign`, {
      fileName,
      mimeType: "application/pdf",
    }),
  confirmPdf: (
    examId: string,
    body: { storageKey: string; fileUrl: string; fileName: string }
  ) => api.post(`/api/exams/${examId}/paper/pdf/confirm`, body),
  clearPdf: (examId: string) => api.delete(`/api/exams/${examId}/paper/pdf`),
  pdfDownload: (examId: string) => api.get(`/api/exams/${examId}/paper/pdf`),
  setRoster: (examId: string, entries: { studentId: string; leg: string }[]) =>
    api.put(`/api/exams/${examId}/paper/roster`, { entries }),
  listPending: (schoolId: string) =>
    api.get(`/api/schools/${schoolId}/exam-papers/pending`),
  review: (
    packageId: string,
    body: { action: "APPROVE" | "RETURN"; feedback?: string; deliveryMode?: string }
  ) => api.post(`/api/exam-papers/${packageId}/review`, body),
  saveQuestions: (examId: string, questions: OnlineQuestionInput[]) =>
    api.put(`/api/exams/${examId}/questions`, { questions }),
  getQuestions: (examId: string) => api.get(`/api/exams/${examId}/questions`),
};
