import { api } from "../../services/api";
import { fetchAllItems } from "../../lib/apiEnvelope";
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
  fetchSubjects: (schoolId: string) =>
    fetchAllItems<{ id: string; name: string; code?: string }>((page, pageSize) =>
      api.get(`/api/schools/${schoolId}/subjects?page=${page}&pageSize=${pageSize}`)
    ),
  fetchGradeLevels: (schoolId: string) =>
    fetchAllItems<{ id: string; name: string }>((page, pageSize) =>
      api.get(`/api/schools/${schoolId}/grade-levels?page=${page}&pageSize=${pageSize}`)
    ),
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
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ fileUrl: string; fileType: string }> {
  const mimeType = guessMime(file);
  const presign = await workspaceApi.presignAttachment(classroomId, {
    fileName: file.name,
    mimeType,
  });
  if (
    !presign.uploadUrl ||
    !presign.fileUrl ||
    /^(local|s3):\/\//i.test(presign.uploadUrl) ||
    /^(local|s3):\/\//i.test(presign.fileUrl)
  ) {
    throw new Error("Image storage is not configured with a browser-reachable URL.");
  }
  const uploadUrl = new URL(presign.uploadUrl);
  const fileUrl = new URL(presign.fileUrl);
  if (!["http:", "https:"].includes(uploadUrl.protocol) || !["http:", "https:"].includes(fileUrl.protocol)) {
    throw new Error("Image storage returned an unsupported URL.");
  }
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    uploadUrl.protocol !== "https:"
  ) {
    throw new Error("Image storage must use HTTPS when the school portal uses HTTPS.");
  }

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl.toString());
    request.setRequestHeader("Content-Type", mimeType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onerror = () =>
      reject(new Error("Image storage is unreachable. Ask your admin to check file storage configuration."));
    request.onabort = () => reject(new Error("Image upload was cancelled."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(
        new Error(
          request.responseText?.trim()
            ? `Upload to storage failed (${request.status}): ${request.responseText.slice(0, 160)}`
            : `Upload to storage failed (${request.status})`
        )
      );
    };
    request.send(file);
  });
  return {
    fileUrl: fileUrl.toString(),
    fileType: mimeType,
  };
}
