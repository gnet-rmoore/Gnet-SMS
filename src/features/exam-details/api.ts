import { api } from "../../services/api";

/** Thin API wrappers for the exam-details feature. */
export const examDetailsApi = {
  fetchExam: (examId: string) => api.get(`/api/exams/${examId}`),
  fetchGrades: (examId: string) => api.get(`/api/exams/${examId}/grades`),
  fetchSubmissionsSummary: (examId: string) => api.get(`/api/exams/${examId}/submissions-summary`),
  fetchTeacherClassrooms: (examId: string) => api.get(`/api/exams/${examId}/teacher-classrooms`),
  processResults: (examId: string, data: unknown) => api.post(`/api/exams/${examId}/process-results`, data),
  releaseGrades: (examId: string, data: unknown) => api.patch(`/api/exams/${examId}/release-grades`, data),
  updateGradeEntry: (id: string, data: unknown) => api.patch(`/api/grade-entries/${id}`, data),
};
