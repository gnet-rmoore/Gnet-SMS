import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

export type TranscriptStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export type TranscriptCourseRow = {
  subjectName: string;
  subjectCode?: string | null;
  term: string;
  score: number | null;
  letter: string;
  points: number;
  credits: number;
  remark?: string | null;
};

export type TranscriptSnapshot = {
  records: TranscriptCourseRow[];
  summary: {
    gpa: number;
    average: number;
    honors: string;
    credits: number;
    courseCount: number;
  };
  computedAt: string;
};

export type TranscriptRecord = {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string | null;
  gradeLevel?: string | null;
  academicYear?: string | null;
  templateKey: string;
  status: TranscriptStatus;
  snapshot: TranscriptSnapshot | null;
  gpa?: number | null;
  average?: number | null;
  honors?: string | null;
  credits?: number | null;
  courseCount?: number | null;
  preparedBy: string;
  preparedByName?: string | null;
  submittedAt?: string | null;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedByRole?: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudentOption = {
  id: string;
  name: string;
  email?: string | null;
  photoUrl?: string | null;
  gradeLevelId?: string | null;
  gradeLevel?: { id?: string; name?: string } | null;
  createdAt?: string | null;
};

export type GradeLevelOption = {
  id: string;
  name: string;
};

export const TRANSCRIPT_TEMPLATE_OPTIONS = [
  { key: "classic", nameKey: "tplClassic", descKey: "tplClassicDesc" },
  { key: "modern", nameKey: "tplModern", descKey: "tplModernDesc" },
  { key: "executive", nameKey: "tplExecutive", descKey: "tplExecutiveDesc" },
] as const;

export const transcriptsApi = {
  listStudents: (schoolId: string) =>
    api.get(`/api/schools/${encodeURIComponent(schoolId)}/students`) as Promise<StudentOption[]>,

  listGradeLevels: (schoolId: string) =>
    api.get(`/api/schools/${encodeURIComponent(schoolId)}/grade-levels`) as Promise<
      GradeLevelOption[]
    >,

  list: (schoolId: string, params?: { status?: string | null; studentId?: string | null }) =>
    api.get(`/api/schools/${encodeURIComponent(schoolId)}/transcripts`, {
      params: {
        status: params?.status || undefined,
        studentId: params?.studentId || undefined,
      },
    }) as Promise<TranscriptRecord[]>,

  prepare: (
    schoolId: string,
    input: {
      studentId: string;
      templateKey: string;
      academicYear?: string | null;
      gradeLevel?: string | null;
    }
  ) =>
    api.post(
      `/api/schools/${encodeURIComponent(schoolId)}/transcripts/prepare`,
      input
    ) as Promise<TranscriptRecord>,

  submit: (id: string) =>
    api.post(`/api/transcripts/${encodeURIComponent(id)}/submit`) as Promise<TranscriptRecord>,

  approve: (id: string, comment?: string) =>
    api.post(`/api/transcripts/${encodeURIComponent(id)}/approve`, {
      comment: comment || null,
    }) as Promise<TranscriptRecord>,

  reject: (id: string, comment: string) =>
    api.post(`/api/transcripts/${encodeURIComponent(id)}/reject`, {
      comment,
    }) as Promise<TranscriptRecord>,
};

export async function fetchTranscriptPdf(id: string): Promise<Blob> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`/api/transcripts/${encodeURIComponent(id)}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = "Failed to generate transcript PDF";
    try {
      const data = await res.json();
      if (data?.error) message = String(data.error);
    } catch {
      /* ignore non-JSON error bodies */
    }
    const err: any = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.blob();
}

export function transcriptPdfFilename(record: TranscriptRecord): string {
  const safe = (record.studentName || "Student").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${safe || "Student"}_Official_Transcript.pdf`;
}
