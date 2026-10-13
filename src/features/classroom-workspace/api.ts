import { api } from "../../services/api";
import type { MarksPayload, PostDetail } from "./types";

function withStudent(url: string, studentId?: string | null) {
  if (!studentId) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}studentId=${encodeURIComponent(studentId)}`;
}

export const workspaceApi = {
  fetchMyClassrooms: (studentId?: string | null) =>
    api.get(withStudent("/api/classrooms", studentId)),
  fetchClassroom: (id: string, studentId?: string | null) =>
    api.get(withStudent(`/api/classrooms/${id}`, studentId)),
  fetchPosts: (classroomId: string, studentId?: string | null) =>
    api.get(withStudent(`/api/classrooms/${classroomId}/posts`, studentId)),
  createPost: (
    classroomId: string,
    data: {
      type: string;
      title?: string;
      body: string;
      maxPoints?: number | string | null;
      dueAt?: string | null;
      topicId?: string | null;
    }
  ) => api.post(`/api/classrooms/${classroomId}/posts`, data),
  fetchPost: (postId: string, studentId?: string | null) =>
    api.get(withStudent(`/api/posts/${postId}`, studentId)) as Promise<PostDetail>,
  deletePost: (postId: string) => api.delete(`/api/posts/${postId}`),
  fetchMembers: (classroomId: string, studentId?: string | null) =>
    api.get(withStudent(`/api/classrooms/${classroomId}/members`, studentId)),
  addMember: (classroomId: string, data: { userId: string; role?: string }) =>
    api.post(`/api/classrooms/${classroomId}/members`, data),
  removeMember: (classroomId: string, userId: string) =>
    api.delete(`/api/classrooms/${classroomId}/members/${userId}`),
  fetchMarks: (classroomId: string, studentId?: string | null) =>
    api.get(withStudent(`/api/classrooms/${classroomId}/grades`, studentId)) as Promise<MarksPayload>,
  submitWork: (postId: string, textResponse: string) =>
    api.post(`/api/posts/${postId}/submissions`, { textResponse }),
  updateSubmission: (
    submissionId: string,
    data: { textResponse?: string; grade?: number | null; feedback?: string | null }
  ) => api.patch(`/api/submissions/${submissionId}`, data),
  returnSubmission: (submissionId: string, data: { grade?: number | null; feedback?: string | null }) =>
    api.post(`/api/submissions/${submissionId}/return`, data),
  reopenSubmission: (submissionId: string) => api.post(`/api/submissions/${submissionId}/reopen`, {}),
  fetchTopics: (classroomId: string, studentId?: string | null) =>
    api.get(withStudent(`/api/classrooms/${classroomId}/topics`, studentId)),
  createTopic: (classroomId: string, title: string) =>
    api.post(`/api/classrooms/${classroomId}/topics`, { title }),
  updateTopic: (topicId: string, data: { title?: string; order?: number }) =>
    api.patch(`/api/topics/${topicId}`, data),
  deleteTopic: (topicId: string) => api.delete(`/api/topics/${topicId}`),
  fetchComments: (postId: string, studentId?: string | null) =>
    api.get(withStudent(`/api/posts/${postId}/comments`, studentId)),
  createComment: (postId: string, body: string, parentCommentId?: string | null) =>
    api.post(`/api/posts/${postId}/comments`, { body, parentCommentId }),
  deleteComment: (commentId: string) => api.delete(`/api/comments/${commentId}`),
  updateClassroom: (
    id: string,
    data: {
      name?: string;
      bannerColor?: string | null;
      bannerImageUrl?: string | null;
      subjectId?: string | null;
      gradeLevelId?: string | null;
      status?: string;
    }
  ) => api.patch(`/api/classrooms/${id}`, data),
  presignAttachment: (classroomId: string, data: { fileName: string; mimeType: string }) =>
    api.post(`/api/classrooms/${classroomId}/attachments/presign`, data),
  addPostAttachment: (postId: string, data: { fileUrl: string; fileType: string }) =>
    api.post(`/api/posts/${postId}/attachments`, data),
  addSubmissionAttachment: (submissionId: string, fileUrl: string) =>
    api.post(`/api/submissions/${submissionId}/attachments`, { fileUrl }),
  fetchChildren: (parentId: string) => api.get(`/api/parents/${parentId}/children`),
  fetchSubjects: (schoolId: string) => api.get(`/api/schools/${schoolId}/subjects`),
  fetchGradeLevels: (schoolId: string) => api.get(`/api/schools/${schoolId}/grade-levels`),
  fetchStaff: (schoolId: string) => api.get(`/api/schools/${schoolId}/staff`),
  fetchStudents: (schoolId: string) => api.get(`/api/schools/${schoolId}/students`),
};

function guessMime(file: File): string {
  const raw = (file.type || "").toLowerCase();
  if (raw === "image/jpg") return "image/jpeg";
  if (raw && raw !== "application/octet-stream") return raw;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const byExt: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    pdf: "application/pdf",
  };
  return (ext && byExt[ext]) || "application/octet-stream";
}

/** Upload file via presign PUT, then return public fileUrl. */
export async function uploadClassroomFile(
  classroomId: string,
  file: File
): Promise<{ fileUrl: string; fileType: string }> {
  const mimeType = guessMime(file);
  const presign = await workspaceApi.presignAttachment(classroomId, {
    fileName: file.name,
    mimeType,
  });
  if (presign.uploadUrl) {
    const put = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: file,
    });
    if (!put.ok) {
      const detail = await put.text().catch(() => "");
      throw new Error(
        detail?.trim()
          ? `Upload to storage failed (${put.status}): ${detail.slice(0, 160)}`
          : `Upload to storage failed (${put.status})`
      );
    }
  } else if (!presign.fileUrl || String(presign.fileUrl).startsWith("local://")) {
    throw new Error("File storage is not configured");
  }
  return {
    fileUrl: presign.fileUrl,
    fileType: mimeType,
  };
}
