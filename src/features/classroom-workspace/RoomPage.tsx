import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  LayoutGrid,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { canManageClassroomMembership } from "../../constants/roles";
import { UserAvatar } from "../../components/UserAvatar";
import { RichTextEditor } from "../../components/RichTextEditor";
import { confirmAction } from "../../lib/swal";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../academics-shared/FeatureModalShell";
import { DetailDrawerShell } from "../../components/ui";
import { buttonClass, typeClass } from "../../components/ui/tokens";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { uploadClassroomFile, workspaceApi } from "./api";
import { FileDropzone } from "./FileDropzone";
import {
  ClassroomEmptyState,
  ClassroomField,
  ClassroomFilterChip,
  ClassroomMetric,
  ClassroomNestedSurface,
  ClassroomPill,
  ClassroomSectionHeader,
  ClassroomSurface,
  SubmissionStatusPill,
} from "./components/ClassroomUi";
import {
  BANNER_SOLID_COLORS,
  ClassroomBannerStrip,
} from "./bannerUtils";
import type {
  ClassroomPost,
  ClassroomSummary,
  ClassroomTopic,
  MarksPayload,
  MemberRow,
  PostAttachment,
  PostComment,
  PostDetail,
  RoomTab,
} from "./types";
import { useClassroomSocket } from "./useClassroomSocket";

const STAFF_ROLES = new Set([
  "TEACHER",
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
  "SUPER_ADMIN",
]);

const CREATE_TOPIC_OPTION = "__create_new_topic__";

function stripHtml(html: string) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return (tmp.textContent || tmp.innerText || "").trim();
}

function formatDue(dueAt?: string | null) {
  if (!dueAt) return null;
  try {
    return new Date(dueAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function attachmentLabel(a: { fileUrl: string; fileType?: string }, fallback: string) {
  if (a.fileType === "link" || a.fileType === "text/uri-list") return a.fileUrl;
  const name = a.fileUrl.split("/").pop();
  return name || fallback;
}

function AttachmentLinks({
  attachments,
  fallbackLabel,
}: {
  attachments?: Array<{ id: string; fileUrl: string; fileType?: string | null }>;
  fallbackLabel: string;
}) {
  if (!attachments?.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {attachments.map((a) => (
        <li key={a.id}>
          <a
            href={a.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1.5"
          >
            <Paperclip className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{attachmentLabel(a, fallbackLabel)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ClassroomRoomPage() {
  const { slug, id } = useParams();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get("studentId");
  const { user, school } = useAuthStore();
  const { t } = useTranslation(["pages", "common", "nav"]);
  const { toast, showToast } = usePageToast();

  const [classroom, setClassroom] = useState<ClassroomSummary | null>(null);
  const [posts, setPosts] = useState<ClassroomPost[]>([]);
  const [topics, setTopics] = useState<ClassroomTopic[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [marks, setMarks] = useState<MarksPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<RoomTab>("STREAM");
  const [classworkFilter, setClassworkFilter] = useState<
    "ALL" | "ASSIGNMENT" | "MATERIAL" | "DUE_SOON" | "OVERDUE"
  >("ALL");

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<"ANNOUNCEMENT" | "ASSIGNMENT" | "MATERIAL">(
    "ANNOUNCEMENT"
  );
  const [composeTitle, setComposeTitle] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composePoints, setComposePoints] = useState("");
  const [composeDue, setComposeDue] = useState("");
  const [composeTopicId, setComposeTopicId] = useState("");
  const [composeFiles, setComposeFiles] = useState<File[]>([]);
  const [composeLinkUrl, setComposeLinkUrl] = useState("");
  const [savingPost, setSavingPost] = useState(false);

  const [bannerOpen, setBannerOpen] = useState(false);
  const [bannerColorDraft, setBannerColorDraft] = useState("#4f46e5");
  const [bannerImageFile, setBannerImageFile] = useState<File[]>([]);
  const [savingBanner, setSavingBanner] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState<number | null>(null);
  const [bannerPreviewError, setBannerPreviewError] = useState(false);
  const [bannerFileError, setBannerFileError] = useState("");
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState("");

  const [topicCreateOpen, setTopicCreateOpen] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [savingTopic, setSavingTopic] = useState(false);

  useEffect(() => {
    const file = bannerImageFile[0];
    if (!file) {
      setBannerPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setBannerPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bannerImageFile]);

  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [postDetail, setPostDetail] = useState<PostDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [turnInText, setTurnInText] = useState("");
  const [turnInFiles, setTurnInFiles] = useState<File[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, { grade: string; feedback: string }>>(
    {}
  );
  const turnInDirtyRef = useRef(false);
  const dirtyGradeIdsRef = useRef<Set<string>>(new Set());

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [schoolUsers, setSchoolUsers] = useState<Array<{ id: string; name: string; role: string }>>(
    []
  );
  const [selectedUserId, setSelectedUserId] = useState("");
  const [memberRole, setMemberRole] = useState("STUDENT");

  const isParent = user?.role === "PARENT";
  const readOnly = isParent;
  const canCompose = STAFF_ROLES.has(user?.role || "") && !readOnly;
  const isStudent = user?.role === "STUDENT";
  const showPersonalMarks = isStudent || isParent;
  // Teachers view People only; school staff add/remove students & co-teachers.
  const canManagePeople = canManageClassroomMembership(user?.role) && !readOnly;
  const canEditBanner =
    !readOnly &&
    Boolean(user && classroom) &&
    (["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR", "VPI", "VPA"].includes(
      user!.role
    ) ||
      user!.id === classroom!.ownerTeacherId ||
      canCompose);

  const classroomListPath = studentId
    ? `/${slug}/classroom?studentId=${encodeURIComponent(studentId)}`
    : `/${slug}/classroom`;

  const postTypeLabel = useCallback(
    (type?: string | null) => {
      if (type === "ASSIGNMENT") return t("classroomWorkspace.assignmentFallback");
      if (type === "MATERIAL") return t("classroomWorkspace.materialFallback");
      return t("classroomWorkspace.compose.announcement");
    },
    [t]
  );

  const submissionStatusLabel = useCallback(
    (status?: string | null) => {
      const value = String(status || "").toUpperCase();
      const key =
        value === "SUBMITTED" || value === "TURNED_IN"
          ? "classroomWorkspace.ui.turnedIn"
          : value === "RETURNED" || value === "ACCEPTED"
            ? "classroomWorkspace.ui.returned"
            : value === "REOPENED"
              ? "classroomWorkspace.ui.reopened"
              : value === "DRAFT"
                ? "classroomWorkspace.ui.draft"
                : value === "GRADED_DRAFT"
                  ? "classroomWorkspace.ui.gradedDraft"
                  : "classroomWorkspace.ui.notGraded";
      return t(key);
    },
    [t]
  );

  const isDueSoon = (post: ClassroomPost) => {
    if (!post.dueAt) return false;
    const diff = new Date(post.dueAt).getTime() - Date.now();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  };

  const isOverdue = (post: ClassroomPost) => {
    if (!post.dueAt) return false;
    return new Date(post.dueAt).getTime() < Date.now();
  };

  const loadCore = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [room, roomPosts, roomTopics] = await Promise.all([
        workspaceApi.fetchClassroom(id, studentId),
        workspaceApi.fetchPosts(id, studentId),
        workspaceApi.fetchTopics(id, studentId).catch(() => []),
      ]);
      setClassroom(room);
      setPosts(Array.isArray(roomPosts) ? roomPosts : []);
      setTopics(Array.isArray(roomTopics) ? roomTopics : []);
    } catch (e: any) {
      showToast(e?.message || t("classroomWorkspace.toast.loadFailed"), "error");
      setClassroom(null);
    } finally {
      setLoading(false);
    }
  }, [id, studentId, showToast]);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (!id || tab !== "PEOPLE") return;
    workspaceApi
      .fetchMembers(id, studentId)
      .then((rows) => setMembers(Array.isArray(rows) ? rows : []))
      .catch((e: any) => showToast(e?.message || t("classroomWorkspace.toast.loadPeopleFailed"), "error"));
  }, [id, tab, studentId, showToast]);

  useEffect(() => {
    if (!id || tab !== "MARKS") return;
    workspaceApi
      .fetchMarks(id, studentId)
      .then(setMarks)
      .catch((e: any) => showToast(e?.message || t("classroomWorkspace.toast.loadMarksFailed"), "error"));
  }, [id, tab, studentId, showToast]);

  const applyPostDetail = useCallback((detail: PostDetail, preserveDirty = false) => {
    setPostDetail(detail);
    if (!preserveDirty || !turnInDirtyRef.current) {
      setTurnInText(detail.mySubmission?.textResponse || "");
    }
    const drafts: Record<string, { grade: string; feedback: string }> = {};
    for (const submission of detail.submissions || []) {
      drafts[submission.id] = {
        grade: submission.grade != null ? String(submission.grade) : "",
        feedback: submission.feedback || "",
      };
    }
    setGradeDrafts((previous) => {
      if (!preserveDirty || dirtyGradeIdsRef.current.size === 0) return drafts;
      const merged = { ...drafts };
      for (const [submissionId, draft] of Object.entries(previous)) {
        if (dirtyGradeIdsRef.current.has(submissionId)) {
          merged[submissionId] = draft;
        }
      }
      return merged;
    });
  }, []);

  const refreshActivePost = useCallback(async () => {
    if (!activePostId) return;
    try {
      const detail = await workspaceApi.fetchPost(activePostId, studentId);
      applyPostDetail(detail, true);
    } catch {
      /* ignore background refresh errors */
    }
  }, [activePostId, studentId, applyPostDetail]);

  const handleSocketEvent = useCallback(
    (event: string) => {
      if (
        ![
          "post.created",
          "post.updated",
          "submission.updated",
          "comment.created",
          "comment.deleted",
        ].includes(event)
      ) {
        return;
      }
      void loadCore();
      void refreshActivePost();
      if (tab === "MARKS" && id) {
        workspaceApi.fetchMarks(id, studentId).then(setMarks).catch(() => {});
      }
    },
    [loadCore, refreshActivePost, tab, id, studentId]
  );

  useClassroomSocket(id, handleSocketEvent);

  const openPost = async (postId: string) => {
    setActivePostId(postId);
    setDetailLoading(true);
    setCommentBody("");
    setTurnInFiles([]);
    turnInDirtyRef.current = false;
    dirtyGradeIdsRef.current.clear();
    try {
      const detail = await workspaceApi.fetchPost(postId, studentId);
      applyPostDetail(detail);
    } catch (e: any) {
      showToast(e?.message || t("classroomWorkspace.toast.openPostFailed"), "error");
      setActivePostId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closePost = async () => {
    if (turnInDirtyRef.current || dirtyGradeIdsRef.current.size > 0) {
      const confirmed = await confirmAction({
        title: t("classroomWorkspace.ui.discardTitle"),
        text: t("classroomWorkspace.ui.discardText"),
        confirmText: t("classroomWorkspace.ui.discardButton"),
        danger: true,
      });
      if (!confirmed) return;
    }
    turnInDirtyRef.current = false;
    dirtyGradeIdsRef.current.clear();
    setActivePostId(null);
    setPostDetail(null);
    setTurnInFiles([]);
  };

  const upcoming = useMemo(
    () =>
      posts
        .filter((p) => p.type === "ASSIGNMENT" && p.dueAt)
        .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
        .slice(0, 5),
    [posts]
  );

  const classwork = useMemo(
    () => posts.filter((p) => p.type === "ASSIGNMENT" || p.type === "MATERIAL"),
    [posts]
  );

  const filteredClasswork = useMemo(() => {
    if (classworkFilter === "ASSIGNMENT") {
      return classwork.filter((p) => p.type === "ASSIGNMENT");
    }
    if (classworkFilter === "MATERIAL") {
      return classwork.filter((p) => p.type === "MATERIAL");
    }
    if (classworkFilter === "DUE_SOON" || classworkFilter === "OVERDUE") {
      return classwork.filter((p) => {
        if (!p.dueAt) return false;
        const diff = new Date(p.dueAt).getTime() - Date.now();
        return classworkFilter === "DUE_SOON"
          ? diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
          : diff < 0;
      });
    }
    return classwork;
  }, [classwork, classworkFilter]);

  const classworkByTopic = useMemo(() => {
    const groups: Array<{ key: string; title: string; posts: ClassroomPost[] }> = topics
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((t) => ({ key: t.id, title: t.title, posts: [] as ClassroomPost[] }));
    const byId = new Map(groups.map((g) => [g.key, g]));
    const uncategorized: ClassroomPost[] = [];

    for (const p of filteredClasswork) {
      if (p.topicId && byId.has(p.topicId)) {
        byId.get(p.topicId)!.posts.push(p);
      } else {
        uncategorized.push(p);
      }
    }

    const result = [...groups.filter((g) => g.posts.length > 0)];
    if (uncategorized.length > 0) {
      result.push({ key: "__none__", title: t("classroomWorkspace.classwork.uncategorized"), posts: uncategorized });
    }
    return result;
  }, [filteredClasswork, topics, t]);

  const teachers = members.filter((m) => ["TEACHER", "CO_TEACHER", "ASSISTANT"].includes(m.role));
  const students = members.filter((m) => m.role === "STUDENT");

  const marksSummary = useMemo(() => {
    const grades = (marks?.assignments || []).flatMap((assignment) =>
      assignment.submissions
        .map((submission) => submission.grade)
        .filter((grade): grade is number => typeof grade === "number")
    );
    return {
      assignments: marks?.assignments.length || 0,
      graded: grades.length,
      average: grades.length
        ? (grades.reduce((sum, grade) => sum + grade, 0) / grades.length).toFixed(1)
        : null,
    };
  }, [marks]);

  const resetCompose = () => {
    setComposeTitle("");
    setComposeBody("");
    setComposePoints("");
    setComposeDue("");
    setComposeTopicId("");
    setComposeFiles([]);
    setComposeLinkUrl("");
  };

  const submitCompose = async () => {
    if (!id) return;
    if (!stripHtml(composeBody) && !composeTitle.trim()) {
      showToast(t("classroomWorkspace.toast.titleOrBodyRequired"), "error");
      return;
    }
    setSavingPost(true);
    try {
      const created = (await workspaceApi.createPost(id, {
        type: composeType,
        title: composeTitle.trim() || undefined,
        body: composeBody || "<p></p>",
        maxPoints: composeType === "ASSIGNMENT" && composePoints ? composePoints : null,
        dueAt: composeType === "ASSIGNMENT" && composeDue ? new Date(composeDue).toISOString() : null,
        topicId:
          (composeType === "ASSIGNMENT" || composeType === "MATERIAL") && composeTopicId
            ? composeTopicId
            : null,
      })) as { id: string };
      const postId = created.id;

      for (const file of composeFiles) {
        const { fileUrl, fileType } = await uploadClassroomFile(id, file);
        await workspaceApi.addPostAttachment(postId, { fileUrl, fileType });
      }
      if (composeLinkUrl.trim()) {
        await workspaceApi.addPostAttachment(postId, {
          fileUrl: composeLinkUrl.trim(),
          fileType: "link",
        });
      }

      showToast(
        composeType === "ASSIGNMENT"
          ? t("classroomWorkspace.toast.assignmentPosted")
          : composeType === "MATERIAL"
            ? t("classroomWorkspace.toast.materialPosted")
            : t("classroomWorkspace.toast.announcementPosted")
      );
      setComposeOpen(false);
      resetCompose();
      await loadCore();
      if (composeType !== "ANNOUNCEMENT") setTab("CLASSWORK");
    } catch (e: any) {
      showToast(e?.message || t("classroomWorkspace.toast.createPostFailed"), "error");
    } finally {
      setSavingPost(false);
    }
  };

  const createTopic = async () => {
    if (!id || !newTopicTitle.trim()) return;
    setSavingTopic(true);
    try {
      const created = await workspaceApi.createTopic(id, newTopicTitle.trim());
      showToast(t("classroomWorkspace.toast.topicCreated"));
      setTopicCreateOpen(false);
      setNewTopicTitle("");
      const roomTopics = await workspaceApi.fetchTopics(id);
      setTopics(Array.isArray(roomTopics) ? roomTopics : []);
      if (created?.id) setComposeTopicId(created.id);
    } catch (e: any) {
      showToast(e?.message || t("classroomWorkspace.toast.createTopicFailed"), "error");
    } finally {
      setSavingTopic(false);
    }
  };

  const handleTurnIn = async () => {
    if (!postDetail || !id) return;
    const confirmed = await confirmAction({
      title: t("classroomWorkspace.ui.turnInConfirmTitle"),
      text: t("classroomWorkspace.ui.turnInConfirmText"),
      confirmText: t("classroomWorkspace.ui.turnInConfirmButton"),
    });
    if (!confirmed) return;
    try {
      let submissionId = postDetail.mySubmission?.id;
      if (postDetail.mySubmission?.id && postDetail.mySubmission.status !== "RETURNED") {
        await workspaceApi.updateSubmission(postDetail.mySubmission.id, {
          textResponse: turnInText,
        });
        submissionId = postDetail.mySubmission.id;
      } else {
        const created = (await workspaceApi.submitWork(postDetail.id, turnInText)) as {
          id?: string;
        };
        submissionId = created?.id;
      }

      if (turnInFiles.length && submissionId) {
        for (const file of turnInFiles) {
          const { fileUrl } = await uploadClassroomFile(id, file);
          await workspaceApi.addSubmissionAttachment(submissionId, fileUrl);
        }
        setTurnInFiles([]);
      }

      showToast(t("classroomWorkspace.toast.workTurnedIn"));
      await openPost(postDetail.id);
      if (tab === "MARKS") {
        const m = await workspaceApi.fetchMarks(id, studentId);
        setMarks(m);
      }
    } catch (e: any) {
      showToast(e?.message || t("classroomWorkspace.toast.turnInFailed"), "error");
    }
  };

  const saveBanner = async (opts: {
    color?: string | null;
    clearImage?: boolean;
    useUploadedImage?: boolean;
  }) => {
    if (!id || !classroom) return;
    if (opts.useUploadedImage && bannerImageFile[0]) {
      const file = bannerImageFile[0];
      const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
      if (!allowedTypes.has(file.type.toLowerCase())) {
        setBannerFileError(t("classroomWorkspace.banner.invalidType", {
          defaultValue: "Choose a JPG, PNG, WebP, or GIF image.",
        }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setBannerFileError(t("classroomWorkspace.banner.fileTooLarge", {
          defaultValue: "Banner images must be 5 MB or smaller.",
        }));
        return;
      }
    }
    setSavingBanner(true);
    setBannerFileError("");
    setBannerPreviewError(false);
    setBannerUploadProgress(opts.useUploadedImage ? 0 : null);
    try {
      let bannerImageUrl: string | null | undefined = undefined;
      if (opts.clearImage) {
        bannerImageUrl = null;
      } else if (opts.useUploadedImage && bannerImageFile[0]) {
        const uploaded = await uploadClassroomFile(
          id,
          bannerImageFile[0],
          setBannerUploadProgress
        );
        bannerImageUrl = uploaded.fileUrl;
      }

      const patch: {
        bannerColor?: string | null;
        bannerImageUrl?: string | null;
      } = {};
      if (opts.color !== undefined) patch.bannerColor = opts.color;
      if (bannerImageUrl !== undefined) patch.bannerImageUrl = bannerImageUrl;

      const updated = await workspaceApi.updateClassroom(id, patch);
      setClassroom({ ...classroom, ...updated });
      setBannerImageFile([]);
      setBannerOpen(false);
      showToast(t("classroomWorkspace.toast.bannerUpdated"));
    } catch (e: any) {
      setBannerFileError(e?.message || t("classroomWorkspace.toast.bannerUpdateFailed"));
      showToast(e?.message || t("classroomWorkspace.toast.bannerUpdateFailed"), "error");
    } finally {
      setSavingBanner(false);
      setBannerUploadProgress(null);
    }
  };

  const handlePostComment = async () => {
    if (!postDetail || !commentBody.trim()) return;
    setSavingComment(true);
    try {
      await workspaceApi.createComment(postDetail.id, commentBody.trim());
      setCommentBody("");
      await openPost(postDetail.id);
    } catch (e: any) {
      showToast(e?.message || t("classroomWorkspace.toast.commentFailed"), "error");
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteComment = async (comment: PostComment) => {
    const isAuthor = comment.authorId === user?.id;
    if (!isAuthor && !canCompose) return;
    const ok = await confirmAction({
      title: t("classroomWorkspace.confirm.deleteCommentTitle"),
      text: t("classroomWorkspace.confirm.deleteCommentText"),
      confirmText: t("common:delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await workspaceApi.deleteComment(comment.id);
      if (postDetail) await openPost(postDetail.id);
    } catch (e: any) {
      showToast(e?.message || t("classroomWorkspace.toast.deleteCommentFailed"), "error");
    }
  };

  const handleReturn = async (submissionId: string) => {
    const draft = gradeDrafts[submissionId] || { grade: "", feedback: "" };
    const grade = draft.grade.trim() === "" ? null : Number(draft.grade);
    if (grade != null && !Number.isFinite(grade)) {
      showToast(t("classroomWorkspace.ui.invalidGrade"), "error");
      return;
    }
    try {
      await workspaceApi.returnSubmission(submissionId, {
        grade,
        feedback: draft.feedback || null,
      });
      showToast(t("classroomWorkspace.toast.returnedToStudent"));
      if (postDetail) await openPost(postDetail.id);
    } catch (e: any) {
      showToast(e?.message || t("classroomWorkspace.toast.returnFailed"), "error");
    }
  };

  const handleReopen = async (submissionId: string) => {
    try {
      await workspaceApi.reopenSubmission(submissionId);
      showToast(t("classroomWorkspace.toast.reopened"));
      if (postDetail) await openPost(postDetail.id);
    } catch (e: any) {
      showToast(e?.message || t("classroomWorkspace.toast.reopenFailed"), "error");
    }
  };

  const openAddMember = async () => {
    if (!canManagePeople || !school?.id) return;
    setAddMemberOpen(true);
    try {
      const [staff, studs] = await Promise.all([
        workspaceApi.fetchStaff(school.id).catch(() => []),
        workspaceApi.fetchStudents(school.id).catch(() => []),
      ]);
      const combined = [
        ...(Array.isArray(staff) ? staff : []),
        ...(Array.isArray(studs) ? studs : []),
      ].map((u: any) => ({ id: u.id, name: u.name, role: u.role }));
      setSchoolUsers(combined);
    } catch {
      setSchoolUsers([]);
    }
  };

  const addMember = async () => {
    if (!canManagePeople || !id || !selectedUserId) return;
    try {
      await workspaceApi.addMember(id, { userId: selectedUserId, role: memberRole });
      showToast(t("classroomWorkspace.toast.memberAdded"));
      setAddMemberOpen(false);
      setSelectedUserId("");
      const rows = await workspaceApi.fetchMembers(id, studentId);
      setMembers(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      showToast(e?.message || t("classroomWorkspace.toast.addMemberFailed"), "error");
    }
  };

  const removeMember = async (userId: string, name: string) => {
    if (!canManagePeople || !id) return;
    const ok = await confirmAction({
      title: t("classroomWorkspace.confirm.removeMemberTitle"),
      text: t("classroomWorkspace.confirm.removeMemberText", { name }),
      confirmText: t("classroomWorkspace.confirm.removeMemberConfirm"),
      danger: true,
    });
    if (!ok) return;
    try {
      await workspaceApi.removeMember(id, userId);
      showToast(t("classroomWorkspace.toast.memberRemoved"));
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (e: any) {
      showToast(e?.message || t("classroomWorkspace.toast.removeMemberFailed"), "error");
    }
  };

  const tabs: { id: RoomTab; label: string; show: boolean }[] = [
    { id: "STREAM", label: t("classroomWorkspace.tabs.stream"), show: true },
    { id: "CLASSWORK", label: t("classroomWorkspace.tabs.classwork"), show: true },
    { id: "PEOPLE", label: t("classroomWorkspace.tabs.people"), show: true },
    { id: "MARKS", label: t("classroomWorkspace.tabs.marks"), show: true },
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-16 flex justify-center">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-16 text-center space-y-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-dashboard">{t("classroomWorkspace.notFoundTitle")}</h1>
        <Link to={classroomListPath} className="text-indigo-600 font-bold text-sm hover:underline">
          {t("classroomWorkspace.backToClasses")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 pb-16">
      <PageToast toast={toast} />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-[32px] overflow-hidden border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] bg-white"
      >
        <ClassroomBannerStrip classroom={classroom} className="h-32">
          <Link
            to={classroomListPath}
            className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 text-slate-800 text-xs font-bold backdrop-blur hover:bg-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("classroomWorkspace.myClasses")}
          </Link>
          {canEditBanner && (
            <button
              type="button"
              onClick={() => {
                const c = classroom.bannerColor;
                setBannerColorDraft(
                  c?.startsWith("#") ? c : BANNER_SOLID_COLORS[0]
                );
                setBannerImageFile([]);
                setBannerOpen(true);
              }}
              className="absolute top-4 right-4 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 text-slate-800 text-xs font-bold backdrop-blur hover:bg-white"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {t("classroomWorkspace.customizeBanner")}
            </button>
          )}
        </ClassroomBannerStrip>
        <div className="px-6 sm:px-8 py-7 bg-gradient-to-b from-white to-slate-50/70 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="min-w-0 space-y-2">
            <ClassroomPill tone="indigo" icon={<LayoutGrid className="h-3.5 w-3.5" />}>
              {t("classroomWorkspace.myClasses")}
            </ClassroomPill>
            <h1 className={`${typeClass.pageTitle} font-dashboard`}>
              {classroom.name}
            </h1>
            <p className={`${typeClass.helper} max-w-2xl`}>
              {t("classroomWorkspace.marksHint")}{" "}
              <Link to={`/${slug}/gradebook`} className="text-indigo-600 font-bold hover:underline">
                {t("classroomWorkspace.gradebook")}
              </Link>
              {isStudent ? (
                <>
                  {" / "}
                  <Link to={`/${slug}/grades`} className="text-indigo-600 font-bold hover:underline">
                    {t("classroomWorkspace.myGrades")}
                  </Link>
                </>
              ) : null}
              .
            </p>
          </div>
          {canCompose && (
            <button
              type="button"
              onClick={() => {
                setComposeType("ANNOUNCEMENT");
                setComposeOpen(true);
              }}
              className={`${buttonClass.base} ${buttonClass.primary} ${buttonClass.sizeDefault} shrink-0`}
            >
              <Plus className="w-4 h-4" />
              {t("classroomWorkspace.newPost")}
            </button>
          )}
        </div>
        <div className="px-6 sm:px-8 py-2 bg-slate-50/60 border-t border-slate-100 flex gap-2 overflow-x-auto">
          {tabs
            .filter((item) => item.show)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors whitespace-nowrap ${
                  tab === item.id
                    ? "bg-slate-950 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {item.id === "STREAM" ? (
                  <MessageSquare className="h-4 w-4" />
                ) : item.id === "CLASSWORK" ? (
                  <BookOpen className="h-4 w-4" />
                ) : item.id === "PEOPLE" ? (
                  <Users className="h-4 w-4" />
                ) : (
                  <GraduationCap className="h-4 w-4" />
                )}
                {item.label}
              </button>
            ))}
        </div>
      </motion.div>

      {tab === "STREAM" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <ClassroomSurface className="p-6">
              <ClassroomSectionHeader
                title={t("classroomWorkspace.stream.upcoming")}
                action={
                  <ClassroomPill tone="sky" icon={<Clock3 className="h-3.5 w-3.5" />}>
                    {upcoming.length}
                  </ClassroomPill>
                }
              />
              {upcoming.length === 0 ? (
                <p className="text-sm font-medium text-slate-500 mt-4">
                  {t("classroomWorkspace.stream.noUpcoming")}
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {upcoming.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => openPost(p.id)}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition-colors hover:border-indigo-100 hover:bg-indigo-50/60"
                      >
                        <p className="text-sm font-bold text-slate-900 line-clamp-1">
                          {p.title || t("classroomWorkspace.assignmentFallback")}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {formatDue(p.dueAt)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ClassroomSurface>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {posts.length === 0 ? (
              <ClassroomEmptyState
                icon={<BookOpen className="h-6 w-6" />}
                title={t("classroomWorkspace.stream.noPostsTitle")}
                description={
                  canCompose
                    ? t("classroomWorkspace.stream.noPostsStaff")
                    : t("classroomWorkspace.stream.noPostsStudent")
                }
              />
            ) : (
              posts.map((post) => (
                <ClassroomSurface key={post.id} className="p-6">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      name={post.author?.name || t("classroomWorkspace.unknownAuthor")}
                      photoUrl={post.author?.photoUrl}
                      userId={post.authorId}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-slate-900">
                          {post.author?.name || t("classroomWorkspace.unknownAuthor")}
                        </p>
                        <ClassroomPill
                          tone={post.type === "ASSIGNMENT" ? "indigo" : post.type === "MATERIAL" ? "sky" : "slate"}
                          icon={<FileText className="h-3.5 w-3.5" />}
                        >
                          {postTypeLabel(post.type)}
                        </ClassroomPill>
                        <span className="text-xs font-medium text-slate-500">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {post.title && (
                        <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                          {post.title}
                        </h3>
                      )}
                      <div
                        className="prose prose-sm max-w-none text-slate-600"
                        dangerouslySetInnerHTML={{ __html: post.body }}
                      />
                      {post.type === "ASSIGNMENT" ? (
                        <div className="flex flex-wrap gap-2">
                          {formatDue(post.dueAt) ? (
                            <ClassroomPill tone="amber" icon={<Calendar className="h-3.5 w-3.5" />}>
                              {t("classroomWorkspace.stream.due", { date: formatDue(post.dueAt) })}
                            </ClassroomPill>
                          ) : null}
                          {post.maxPoints != null ? (
                            <ClassroomPill tone="slate">
                              <span className="font-mono">
                                {t("classroomWorkspace.stream.points", { count: post.maxPoints })}
                              </span>
                            </ClassroomPill>
                          ) : null}
                        </div>
                      ) : null}
                      <AttachmentLinks
                        attachments={post.attachments}
                        fallbackLabel={t("classroomWorkspace.attachment")}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                        {post._count?.comments != null && post._count.comments > 0 ? (
                          <p className="text-xs font-bold text-slate-500 inline-flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {post._count.comments}{" "}
                            {t("classroomWorkspace.stream.comment", { count: post._count.comments })}
                          </p>
                        ) : (
                          <span />
                        )}
                        {(post.type === "ASSIGNMENT" || post.type === "MATERIAL") ? (
                          <button
                            type="button"
                            onClick={() => openPost(post.id)}
                            className={`${buttonClass.base} ${buttonClass.ghost} ${buttonClass.sizeCompact} text-indigo-600`}
                          >
                            {t("classroomWorkspace.stream.open")}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </ClassroomSurface>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "CLASSWORK" && (
        <ClassroomSurface className="p-6 sm:p-8 space-y-6">
          <ClassroomSectionHeader
            eyebrow={t("classroomWorkspace.myClasses")}
            title={t("classroomWorkspace.classwork.title")}
            action={
              canCompose ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTopicCreateOpen(true)}
                    className={`${buttonClass.base} ${buttonClass.secondary} ${buttonClass.sizeCompact}`}
                  >
                    {t("classroomWorkspace.classwork.newTopic")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setComposeType("MATERIAL");
                      setComposeOpen(true);
                    }}
                    className={`${buttonClass.base} ${buttonClass.secondary} ${buttonClass.sizeCompact}`}
                  >
                    {t("classroomWorkspace.classwork.material")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setComposeType("ASSIGNMENT");
                      setComposeOpen(true);
                    }}
                    className={`${buttonClass.base} ${buttonClass.primary} ${buttonClass.sizeCompact}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("classroomWorkspace.classwork.assignment")}
                  </button>
                </div>
              ) : null
            }
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ClassroomMetric
              label={t("classroomWorkspace.ui.all")}
              value={classwork.length}
              tone="indigo"
            />
            <ClassroomMetric
              label={t("classroomWorkspace.ui.assignments")}
              value={classwork.filter((p) => p.type === "ASSIGNMENT").length}
              tone="sky"
            />
            <ClassroomMetric
              label={t("classroomWorkspace.ui.dueSoon")}
              value={classwork.filter(isDueSoon).length}
              tone="amber"
            />
            <ClassroomMetric
              label={t("classroomWorkspace.ui.overdue")}
              value={classwork.filter(isOverdue).length}
              tone="rose"
            />
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
            <ClassroomFilterChip
              active={classworkFilter === "ALL"}
              onClick={() => setClassworkFilter("ALL")}
            >
              {t("classroomWorkspace.ui.all")}
            </ClassroomFilterChip>
            <ClassroomFilterChip
              active={classworkFilter === "ASSIGNMENT"}
              onClick={() => setClassworkFilter("ASSIGNMENT")}
            >
              {t("classroomWorkspace.ui.assignments")}
            </ClassroomFilterChip>
            <ClassroomFilterChip
              active={classworkFilter === "MATERIAL"}
              onClick={() => setClassworkFilter("MATERIAL")}
            >
              {t("classroomWorkspace.ui.materials")}
            </ClassroomFilterChip>
            <ClassroomFilterChip
              active={classworkFilter === "DUE_SOON"}
              onClick={() => setClassworkFilter("DUE_SOON")}
            >
              <Clock3 className="mr-1 inline h-3.5 w-3.5" />
              {t("classroomWorkspace.ui.dueSoon")}
            </ClassroomFilterChip>
            <ClassroomFilterChip
              active={classworkFilter === "OVERDUE"}
              onClick={() => setClassworkFilter("OVERDUE")}
            >
              {t("classroomWorkspace.ui.overdue")}
            </ClassroomFilterChip>
          </div>

          {filteredClasswork.length === 0 ? (
            <ClassroomEmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title={t("classroomWorkspace.classwork.empty")}
            />
          ) : (
            <div className="space-y-8">
              {classworkByTopic.map((group) => (
                <section key={group.key} className="space-y-3">
                  <div className="flex items-center gap-3 px-1">
                    <span className="h-px flex-1 bg-slate-200" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {group.title}
                    </h3>
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>
                  <ul className="space-y-2">
                    {group.posts.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => openPost(p.id)}
                          className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-left transition-colors hover:border-indigo-100 hover:bg-indigo-50/50"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                              p.type === "ASSIGNMENT"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-sky-100 text-sky-700"
                            }`}
                          >
                            {p.type === "ASSIGNMENT" ? (
                              <ClipboardList className="h-5 w-5" />
                            ) : (
                              <BookOpen className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-extrabold text-slate-900">
                              {p.title || postTypeLabel(p.type)}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                              <ClassroomPill
                                tone={p.type === "ASSIGNMENT" ? "indigo" : "sky"}
                              >
                                {postTypeLabel(p.type)}
                              </ClassroomPill>
                              {formatDue(p.dueAt) ? (
                                <span>
                                  {t("classroomWorkspace.stream.due", {
                                    date: formatDue(p.dueAt),
                                  })}
                                </span>
                              ) : null}
                              {p.maxPoints != null ? (
                                <span className="font-mono">
                                  {t("classroomWorkspace.stream.points", {
                                    count: p.maxPoints,
                                  })}
                                </span>
                              ) : null}
                              {p.attachments?.length ? (
                                <span>
                                  {p.attachments.length}{" "}
                                  {t("classroomWorkspace.classwork.attachment", {
                                    count: p.attachments.length,
                                  })}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </ClassroomSurface>
      )}

      {tab === "PEOPLE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" />
                {t("classroomWorkspace.people.teachers")}
              </h2>
            </div>
            {teachers.length === 0 ? (
              <p className="text-sm text-slate-500">{t("classroomWorkspace.people.noTeachers")}</p>
            ) : (
              <ul className="space-y-3">
                {teachers.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <UserAvatar
                      name={m.user?.name || t("classroomWorkspace.teacherFallback")}
                      photoUrl={m.user?.photoUrl}
                      userId={m.userId}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{m.user?.name || t("classroomWorkspace.unknownAuthor")}</p>
                      <p className="text-xs text-slate-500">{m.role.replace("_", " ")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{t("classroomWorkspace.people.students")}</h2>
              {canManagePeople && (
                <button
                  type="button"
                  onClick={openAddMember}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  {t("classroomWorkspace.people.add")}
                </button>
              )}
            </div>
            {students.length === 0 ? (
              <p className="text-sm text-slate-500">
                {canManagePeople
                  ? t("classroomWorkspace.people.noStudentsStaff")
                  : t("classroomWorkspace.people.noStudentsOther")}
              </p>
            ) : (
              <ul className="space-y-3">
                {students.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        name={m.user?.name || t("classroomWorkspace.studentFallback")}
                        photoUrl={m.user?.photoUrl}
                        userId={m.userId}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {m.user?.name || t("classroomWorkspace.userFallback")}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{m.user?.email}</p>
                      </div>
                    </div>
                    {canManagePeople && (
                      <button
                        type="button"
                        onClick={() => removeMember(m.userId, m.user?.name || t("classroomWorkspace.studentFallback"))}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 shrink-0"
                      >
                        {t("classroomWorkspace.people.remove")}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "MARKS" && (
        <ClassroomSurface className="p-6 sm:p-8 space-y-6">
          <ClassroomSectionHeader
            eyebrow={t("classroomWorkspace.myClasses")}
            title={t("classroomWorkspace.marks.title")}
            description={t("classroomWorkspace.marks.hint")}
            action={
              canCompose ? (
                <Link
                  to={`/${slug}/gradebook`}
                  className={`${buttonClass.base} ${buttonClass.secondary} ${buttonClass.sizeCompact}`}
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  {t("classroomWorkspace.marks.openGradebook")}
                </Link>
              ) : null
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ClassroomMetric
              label={t("classroomWorkspace.ui.assignments")}
              value={marksSummary.assignments}
              tone="indigo"
            />
            <ClassroomMetric
              label={t("classroomWorkspace.ui.graded")}
              value={marksSummary.graded}
              tone="emerald"
            />
            <ClassroomMetric
              label={t("classroomWorkspace.ui.classAverage")}
              value={marksSummary.average ?? "—"}
              tone="amber"
            />
          </div>

          {!marks || marks.assignments.length === 0 ? (
            <ClassroomEmptyState
              icon={<GraduationCap className="h-6 w-6" />}
              title={t("classroomWorkspace.marks.empty")}
            />
          ) : showPersonalMarks ? (
            <ul className="space-y-3">
              {marks.assignments.map((assignment) => {
                const submission = assignment.submissions[0];
                return (
                  <li key={assignment.id}>
                    <ClassroomNestedSurface className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900">
                          {assignment.title || t("classroomWorkspace.assignmentFallback")}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <SubmissionStatusPill
                            status={submission?.status}
                            label={
                              submission
                                ? submissionStatusLabel(submission.status)
                                : t("classroomWorkspace.marks.notStarted")
                            }
                          />
                          {assignment.maxPoints != null ? (
                            <span className="text-xs font-medium text-slate-500">
                              {t("classroomWorkspace.marks.maxPoints", {
                                count: assignment.maxPoints,
                              })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <p className="font-mono text-lg font-extrabold text-slate-900">
                          {submission?.grade != null
                            ? assignment.maxPoints != null
                              ? t("classroomWorkspace.ui.scoreOutOf", {
                                  score: submission.grade,
                                  max: assignment.maxPoints,
                                })
                              : submission.grade
                            : "—"}
                        </p>
                        <button
                          type="button"
                          onClick={() => openPost(assignment.id)}
                          className={`${buttonClass.base} ${buttonClass.ghost} ${buttonClass.sizeCompact} text-indigo-600`}
                        >
                          {t("classroomWorkspace.ui.openAssignment")}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </ClassroomNestedSurface>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ClassroomNestedSurface className="overflow-x-auto p-2 sm:p-4">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 pr-4">{t("classroomWorkspace.marks.studentCol")}</th>
                    {marks.assignments.map((assignment) => (
                      <th
                        key={assignment.id}
                        className="px-2 py-3 font-mono normal-case tracking-normal"
                      >
                        <button
                          type="button"
                          onClick={() => openPost(assignment.id)}
                          className="text-left hover:text-indigo-600"
                        >
                          {(assignment.title || t("classroomWorkspace.assignmentFallback")).slice(0, 18)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {marks.students.map((student) => (
                    <tr key={student.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-bold text-slate-900">{student.name}</td>
                      {marks.assignments.map((assignment) => {
                        const submission = assignment.submissions.find(
                          (item) => item.studentId === student.id
                        );
                        return (
                          <td key={assignment.id} className="px-2 py-3 font-mono text-slate-700">
                            {submission?.grade != null ? (
                              assignment.maxPoints != null ? (
                                t("classroomWorkspace.ui.scoreOutOf", {
                                  score: submission.grade,
                                  max: assignment.maxPoints,
                                })
                              ) : (
                                submission.grade
                              )
                            ) : submission ? (
                              submissionStatusLabel(submission.status)
                            ) : (
                              "—"
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ClassroomNestedSurface>
          )}
        </ClassroomSurface>
      )}

      {composeOpen && (
        <FeatureModalShell
          wide
          title={
            composeType === "ASSIGNMENT"
              ? t("classroomWorkspace.compose.newAssignment")
              : composeType === "MATERIAL"
                ? t("classroomWorkspace.compose.newMaterial")
                : t("classroomWorkspace.compose.newAnnouncement")
          }
          subtitle={t("classroomWorkspace.compose.subtitle")}
          onClose={() => setComposeOpen(false)}
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className={`${buttonClass.base} ${buttonClass.secondary} ${buttonClass.sizeDefault}`}
              >
                {t("common:cancel")}
              </button>
              <button
                type="button"
                disabled={savingPost}
                onClick={submitCompose}
                className={`${buttonClass.base} ${buttonClass.primary} ${buttonClass.sizeDefault}`}
              >
                <Send className="h-4 w-4" />
                {savingPost ? t("classroomWorkspace.compose.posting") : t("classroomWorkspace.compose.post")}
              </button>
            </div>
          }
        >
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-2">
              {(["ANNOUNCEMENT", "ASSIGNMENT", "MATERIAL"] as const).map((typeKey) => (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setComposeType(typeKey)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                    composeType === typeKey
                      ? "bg-slate-950 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {typeKey === "ANNOUNCEMENT"
                    ? t("classroomWorkspace.compose.announcement")
                    : typeKey === "ASSIGNMENT"
                      ? t("classroomWorkspace.compose.assignment")
                      : t("classroomWorkspace.compose.material")}
                </button>
              ))}
            </div>

            <ClassroomField label={t("classroomWorkspace.compose.title")}>
              <input
                className={fieldInput}
                value={composeTitle}
                onChange={(e) => setComposeTitle(e.target.value)}
                placeholder={
                  composeType === "ANNOUNCEMENT"
                    ? t("classroomWorkspace.compose.optionalTitle")
                    : t("classroomWorkspace.compose.requiredTitle")
                }
              />
            </ClassroomField>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {t("classroomWorkspace.compose.body")}
              </p>
              <div className="mt-1.5">
                <RichTextEditor value={composeBody} onChange={setComposeBody} minHeight="140px" />
              </div>
            </div>

            {composeType === "ASSIGNMENT" ? (
              <ClassroomNestedSurface className="p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                  {t("classroomWorkspace.compose.assignment")}
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ClassroomField label={t("classroomWorkspace.compose.points")}>
                    <input
                      type="number"
                      className={`${fieldInput} font-mono`}
                      value={composePoints}
                      onChange={(e) => setComposePoints(e.target.value)}
                      placeholder="100"
                    />
                  </ClassroomField>
                  <ClassroomField label={t("classroomWorkspace.compose.due")}>
                    <input
                      type="datetime-local"
                      className={fieldInput}
                      value={composeDue}
                      onChange={(e) => setComposeDue(e.target.value)}
                    />
                  </ClassroomField>
                </div>
              </ClassroomNestedSurface>
            ) : null}

            {(composeType === "ASSIGNMENT" || composeType === "MATERIAL") ? (
              <ClassroomField label={t("classroomWorkspace.compose.topic")}>
                <select
                  className={fieldInput}
                  value={composeTopicId}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === CREATE_TOPIC_OPTION) {
                      e.target.value = "";
                      setComposeTopicId("");
                      setTopicCreateOpen(true);
                      return;
                    }
                    setComposeTopicId(next);
                  }}
                >
                  <option value="">{t("classroomWorkspace.compose.noTopic")}</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title}
                    </option>
                  ))}
                  <option value={CREATE_TOPIC_OPTION}>
                    {t("classroomWorkspace.compose.createNewTopic")}
                  </option>
                </select>
              </ClassroomField>
            ) : null}

            <ClassroomNestedSurface className="p-4">
              <FileDropzone
                files={composeFiles}
                onChange={setComposeFiles}
                multiple
                label={t("classroomWorkspace.compose.attachments")}
                hint={t("classroomWorkspace.compose.attachmentsHint")}
                disabled={savingPost}
              />
            </ClassroomNestedSurface>

            <ClassroomField label={t("classroomWorkspace.compose.linkUrl")}>
              <input
                type="url"
                className={fieldInput}
                value={composeLinkUrl}
                onChange={(e) => setComposeLinkUrl(e.target.value)}
                placeholder="https://…"
              />
            </ClassroomField>
          </div>
        </FeatureModalShell>
      )}

      {topicCreateOpen && (
        <FeatureModalShell
          title={t("classroomWorkspace.topic.title")}
          subtitle={t("classroomWorkspace.topic.subtitle")}
          onClose={() => {
            setTopicCreateOpen(false);
            setNewTopicTitle("");
          }}
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setTopicCreateOpen(false);
                  setNewTopicTitle("");
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
              >
                {t("common:cancel")}
              </button>
              <button
                type="button"
                disabled={savingTopic || !newTopicTitle.trim()}
                onClick={createTopic}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {savingTopic ? t("classroomWorkspace.topic.creating") : t("classroomWorkspace.topic.create")}
              </button>
            </div>
          }
        >
          <div className="p-6 sm:p-8">
            <label className={fieldLabel}>{t("classroomWorkspace.compose.title")}</label>
            <input
              className={`${fieldInput} mt-1.5`}
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              placeholder={t("classroomWorkspace.topic.placeholder")}
            />
          </div>
        </FeatureModalShell>
      )}

      {bannerOpen && classroom && (
        <FeatureModalShell
          title={t("classroomWorkspace.banner.title")}
          subtitle={t("classroomWorkspace.banner.subtitle")}
          onClose={() => {
            if (savingBanner) return;
            setBannerOpen(false);
            setBannerImageFile([]);
          }}
          footer={
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={savingBanner}
                onClick={() => {
                  setBannerOpen(false);
                  setBannerImageFile([]);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
              >
                {t("common:cancel")}
              </button>
              {classroom.bannerImageUrl ? (
                <button
                  type="button"
                  disabled={savingBanner}
                  onClick={() => saveBanner({ clearImage: true, color: bannerColorDraft })}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold disabled:opacity-50"
                >
                  {t("classroomWorkspace.banner.useSolidOnly")}
                </button>
              ) : null}
              <button
                type="button"
                disabled={savingBanner}
                onClick={() =>
                  saveBanner({
                    color: bannerColorDraft,
                    useUploadedImage: bannerImageFile.length > 0,
                  })
                }
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {savingBanner ? t("classroomWorkspace.banner.saving") : t("classroomWorkspace.banner.save")}
              </button>
            </div>
          }
        >
          <div className="p-6 sm:p-8 space-y-6">
            <ClassroomBannerStrip
              classroom={{
                bannerColor: bannerColorDraft,
                bannerImageUrl:
                  bannerPreviewUrl || classroom.bannerImageUrl,
              }}
              className="h-24 rounded-2xl overflow-hidden"
              dimImage={false}
              onImageError={() => setBannerPreviewError(true)}
            />
            {bannerPreviewError ? (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {t("classroomWorkspace.banner.previewFailed", {
                  defaultValue: "The image preview could not be loaded. Try another image or remove it.",
                })}
                {bannerImageFile.length ? (
                  <button
                    type="button"
                    onClick={() => {
                      setBannerImageFile([]);
                      setBannerPreviewError(false);
                    }}
                    className="ml-2 min-h-11 font-bold underline"
                  >
                    {t("classroomWorkspace.banner.removeImage", { defaultValue: "Remove image" })}
                  </button>
                ) : null}
              </div>
            ) : null}
            <div>
              <p className={fieldLabel}>{t("classroomWorkspace.banner.solidColor")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {BANNER_SOLID_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    title={hex}
                    onClick={() => setBannerColorDraft(hex)}
                    className={`w-9 h-9 rounded-xl border-2 transition-transform hover:scale-105 ${
                      bannerColorDraft === hex
                        ? "border-slate-900 ring-2 ring-indigo-300"
                        : "border-white"
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <label className={`${fieldLabel} shrink-0`}>{t("classroomWorkspace.banner.custom")}</label>
                <input
                  type="color"
                  value={bannerColorDraft.startsWith("#") ? bannerColorDraft : "#4f46e5"}
                  onChange={(e) => setBannerColorDraft(e.target.value)}
                  className="h-10 w-14 rounded-xl border border-slate-200 cursor-pointer bg-white"
                />
                <span className="font-mono text-xs text-slate-500">{bannerColorDraft}</span>
              </div>
            </div>
            <FileDropzone
              files={bannerImageFile}
              onChange={(files) => {
                setBannerFileError("");
                setBannerPreviewError(false);
                setBannerImageFile(files);
              }}
              multiple={false}
              accept="image/*"
              label={t("classroomWorkspace.banner.imageLabel")}
              hint={t("classroomWorkspace.banner.imageHint")}
              disabled={savingBanner}
            />
            {bannerUploadProgress !== null ? (
              <div role="status" aria-live="polite">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>{t("classroomWorkspace.banner.uploading", { defaultValue: "Uploading image…" })}</span>
                  <span>{bannerUploadProgress}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-indigo-600 transition-[width]" style={{ width: `${bannerUploadProgress}%` }} />
                </div>
              </div>
            ) : null}
            {bannerFileError ? (
              <p role="alert" className="text-sm font-medium text-rose-700">{bannerFileError}</p>
            ) : null}
            {classroom.bannerImageUrl && !bannerImageFile.length ? (
              <p className="text-xs text-slate-500">{t("classroomWorkspace.banner.currentImageHint")}</p>
            ) : null}
          </div>
        </FeatureModalShell>
      )}

      {addMemberOpen && (
        <FeatureModalShell
          title={t("classroomWorkspace.addMember.title")}
          subtitle={t("classroomWorkspace.addMember.subtitle")}
          onClose={() => setAddMemberOpen(false)}
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAddMemberOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
              >
                {t("common:cancel")}
              </button>
              <button
                type="button"
                onClick={addMember}
                disabled={!selectedUserId}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {t("classroomWorkspace.people.add")}
              </button>
            </div>
          }
        >
          <div className="p-6 sm:p-8 space-y-4">
            <div>
              <label className={fieldLabel}>{t("classroomWorkspace.addMember.role")}</label>
              <select
                className={`${fieldInput} mt-1.5`}
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
              >
                <option value="STUDENT">{t("classroomWorkspace.addMember.student")}</option>
                <option value="CO_TEACHER">{t("classroomWorkspace.addMember.coTeacher")}</option>
                <option value="ASSISTANT">{t("classroomWorkspace.addMember.assistant")}</option>
              </select>
            </div>
            <div>
              <label className={fieldLabel}>{t("classroomWorkspace.addMember.person")}</label>
              <select
                className={`${fieldInput} mt-1.5`}
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">{t("classroomWorkspace.addMember.select")}</option>
                {schoolUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FeatureModalShell>
      )}

      <DetailDrawerShell
          open={Boolean(activePostId)}
          title={postDetail?.title || (postDetail?.type === "MATERIAL" ? t("classroomWorkspace.materialFallback") : t("classroomWorkspace.assignmentFallback"))}
          subtitle={
            postDetail
              ? [
                  formatDue(postDetail.dueAt) ? t("classroomWorkspace.stream.due", { date: formatDue(postDetail.dueAt) }) : null,
                  postDetail.maxPoints != null ? t("classroomWorkspace.stream.points", { count: postDetail.maxPoints }) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : t("classroomWorkspace.postDetail.loading")
          }
          eyebrow={postDetail ? t(postDetail.type === "MATERIAL" ? "classroomWorkspace.materialFallback" : "classroomWorkspace.assignmentFallback") : ""}
          onClose={closePost}
          bodyClassName=""
        >
          <div className="p-6 sm:p-8 space-y-6">
            {detailLoading || !postDetail ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <ClassroomPill
                    tone={
                      postDetail.type === "ASSIGNMENT"
                        ? "indigo"
                        : postDetail.type === "MATERIAL"
                          ? "sky"
                          : "slate"
                    }
                    icon={<FileText className="h-3.5 w-3.5" />}
                  >
                    {postTypeLabel(postDetail.type)}
                  </ClassroomPill>
                  {formatDue(postDetail.dueAt) ? (
                    <ClassroomPill tone="amber" icon={<Calendar className="h-3.5 w-3.5" />}>
                      {t("classroomWorkspace.stream.due", { date: formatDue(postDetail.dueAt) })}
                    </ClassroomPill>
                  ) : null}
                  {postDetail.maxPoints != null ? (
                    <ClassroomPill tone="slate">
                      <span className="font-mono">
                        {t("classroomWorkspace.stream.points", {
                          count: postDetail.maxPoints,
                        })}
                      </span>
                    </ClassroomPill>
                  ) : null}
                </div>
                <div
                  className="prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{ __html: postDetail.body }}
                />
                <AttachmentLinks attachments={postDetail.attachments} fallbackLabel={t("classroomWorkspace.attachment")} />

                {isStudent && !readOnly && postDetail.type === "ASSIGNMENT" && (
                  <ClassroomNestedSurface className="p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                          <CheckCircle2 className="h-4 w-4" />
                        </span>
                        <p className="text-sm font-extrabold text-slate-900">
                          {t("classroomWorkspace.postDetail.yourWork")}
                        </p>
                      </div>
                      <SubmissionStatusPill
                        status={postDetail.mySubmission?.status}
                        label={
                          postDetail.mySubmission
                            ? submissionStatusLabel(postDetail.mySubmission.status)
                            : t("classroomWorkspace.postDetail.assigned")
                        }
                      />
                    </div>

                    {postDetail.mySubmission?.status === "RETURNED" ? (
                      <div className="space-y-4">
                        <ClassroomNestedSurface className="bg-white p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            {t("classroomWorkspace.ui.response")}
                          </p>
                          <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                            {postDetail.mySubmission.textResponse || "—"}
                          </p>
                          <AttachmentLinks
                            attachments={postDetail.mySubmission.attachments}
                            fallbackLabel={t("classroomWorkspace.attachment")}
                          />
                        </ClassroomNestedSurface>
                        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                          <span className="font-mono text-2xl font-extrabold text-emerald-800">
                            {t("classroomWorkspace.ui.scoreOutOf", {
                              score: postDetail.mySubmission.grade ?? "—",
                              max: postDetail.maxPoints ?? "—",
                            })}
                          </span>
                          <ClassroomPill tone="emerald">
                            {t("classroomWorkspace.ui.returned")}
                          </ClassroomPill>
                        </div>
                        {postDetail.mySubmission.feedback ? (
                          <p className="text-sm text-slate-600">
                            {t("classroomWorkspace.postDetail.feedback")}{" "}
                            {postDetail.mySubmission.feedback}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <ClassroomField
                          label={t("classroomWorkspace.ui.response")}
                          hint={
                            postDetail.mySubmission
                              ? t("classroomWorkspace.ui.updateHint")
                              : t("classroomWorkspace.ui.turnInHint")
                          }
                        >
                          <textarea
                            className={`${fieldInput} min-h-[120px]`}
                            value={turnInText}
                            onChange={(e) => {
                              turnInDirtyRef.current = true;
                              setTurnInText(e.target.value);
                            }}
                            placeholder={t("classroomWorkspace.postDetail.typeResponse")}
                          />
                        </ClassroomField>
                        <FileDropzone
                          files={turnInFiles}
                          onChange={(files) => {
                            turnInDirtyRef.current = true;
                            setTurnInFiles(files);
                          }}
                          multiple
                          label={t("classroomWorkspace.compose.attachments")}
                          hint={t("classroomWorkspace.compose.attachmentsHint")}
                        />
                        {postDetail.mySubmission?.attachments?.length ? (
                          <AttachmentLinks
                            attachments={postDetail.mySubmission.attachments}
                            fallbackLabel={t("classroomWorkspace.attachment")}
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={handleTurnIn}
                          className={`${buttonClass.base} ${buttonClass.primary} ${buttonClass.sizeDefault}`}
                        >
                          <Send className="h-4 w-4" />
                          {postDetail.mySubmission
                            ? t("classroomWorkspace.postDetail.updateTurnIn")
                            : t("classroomWorkspace.postDetail.turnIn")}
                        </button>
                      </div>
                    )}
                  </ClassroomNestedSurface>
                )}

                {isParent && postDetail.type === "ASSIGNMENT" && postDetail.mySubmission && (
                  <ClassroomNestedSurface className="p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-extrabold text-slate-900">
                        {t("classroomWorkspace.postDetail.submission")}
                      </p>
                      <SubmissionStatusPill
                        status={postDetail.mySubmission.status}
                        label={submissionStatusLabel(postDetail.mySubmission.status)}
                      />
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t("classroomWorkspace.ui.response")}
                      </p>
                      <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                        {postDetail.mySubmission.textResponse || "—"}
                      </p>
                      <AttachmentLinks
                        attachments={postDetail.mySubmission.attachments}
                        fallbackLabel={t("classroomWorkspace.attachment")}
                      />
                    </div>
                    {postDetail.mySubmission.grade != null ? (
                      <p className="font-mono text-lg font-extrabold text-slate-900">
                        {t("classroomWorkspace.ui.scoreOutOf", {
                          score: postDetail.mySubmission.grade,
                          max: postDetail.maxPoints ?? "—",
                        })}
                      </p>
                    ) : null}
                    {postDetail.mySubmission.feedback ? (
                      <p className="text-sm text-slate-600">
                        {t("classroomWorkspace.postDetail.feedback")}{" "}
                        {postDetail.mySubmission.feedback}
                      </p>
                    ) : null}
                  </ClassroomNestedSurface>
                )}

                {canCompose && postDetail.type === "ASSIGNMENT" && (
                  <div className="space-y-4 border-t border-slate-100 pt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <ClipboardList className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">
                            {t("classroomWorkspace.postDetail.studentSubmissions")}
                          </p>
                          <p className="text-xs font-medium text-slate-500">
                            {t("classroomWorkspace.ui.teacherReview")}
                          </p>
                        </div>
                      </div>
                      <ClassroomPill tone="indigo">
                        {(postDetail.submissions || []).length}
                      </ClassroomPill>
                    </div>

                    {(postDetail.submissions || []).length === 0 ? (
                      <ClassroomEmptyState
                        icon={<ClipboardList className="h-6 w-6" />}
                        title={t("classroomWorkspace.postDetail.noSubmissions")}
                      />
                    ) : (
                      <ul className="space-y-4">
                        {(postDetail.submissions || []).map((submission) => (
                          <li key={submission.id}>
                            <ClassroomNestedSurface className="space-y-4 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <UserAvatar
                                    name={
                                      submission.student?.name ||
                                      t("classroomWorkspace.studentFallback")
                                    }
                                    photoUrl={submission.student?.photoUrl}
                                    userId={submission.studentId}
                                    size="sm"
                                  />
                                  <div>
                                    <p className="text-sm font-bold text-slate-900">
                                      {submission.student?.name ||
                                        t("classroomWorkspace.userFallback")}
                                    </p>
                                    <p className="text-xs font-medium text-slate-500">
                                      {t("classroomWorkspace.ui.response")}
                                    </p>
                                  </div>
                                </div>
                                <SubmissionStatusPill
                                  status={submission.status}
                                  label={submissionStatusLabel(submission.status)}
                                />
                              </div>

                              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                  {t("classroomWorkspace.ui.response")}
                                </p>
                                <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                                  {submission.textResponse || "—"}
                                </p>
                                <AttachmentLinks
                                  attachments={submission.attachments}
                                  fallbackLabel={t("classroomWorkspace.attachment")}
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <ClassroomField label={t("classroomWorkspace.postDetail.grade")}>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    className={`${fieldInput} font-mono`}
                                    value={gradeDrafts[submission.id]?.grade ?? ""}
                                    onChange={(e) => {
                                      dirtyGradeIdsRef.current.add(submission.id);
                                      setGradeDrafts((previous) => ({
                                        ...previous,
                                        [submission.id]: {
                                          grade: e.target.value,
                                          feedback: previous[submission.id]?.feedback ?? "",
                                        },
                                      }));
                                    }}
                                  />
                                </ClassroomField>
                                <ClassroomField
                                  label={t("classroomWorkspace.postDetail.feedbackLabel")}
                                  hint={t("classroomWorkspace.ui.gradeHint")}
                                >
                                  <input
                                    className={fieldInput}
                                    value={gradeDrafts[submission.id]?.feedback ?? ""}
                                    onChange={(e) => {
                                      dirtyGradeIdsRef.current.add(submission.id);
                                      setGradeDrafts((previous) => ({
                                        ...previous,
                                        [submission.id]: {
                                          grade: previous[submission.id]?.grade ?? "",
                                          feedback: e.target.value,
                                        },
                                      }));
                                    }}
                                  />
                                </ClassroomField>
                              </div>

                              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                                <button
                                  type="button"
                                  onClick={() => handleReturn(submission.id)}
                                  className={`${buttonClass.base} ${buttonClass.primary} ${buttonClass.sizeCompact}`}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {t("classroomWorkspace.postDetail.return")}
                                </button>
                                {submission.status === "RETURNED" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleReopen(submission.id)}
                                    className={`${buttonClass.base} ${buttonClass.secondary} ${buttonClass.sizeCompact}`}
                                  >
                                    {t("classroomWorkspace.postDetail.reopen")}
                                  </button>
                                ) : null}
                              </div>
                            </ClassroomNestedSurface>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="space-y-4 border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    {t("classroomWorkspace.postDetail.comments")}
                    {postDetail.comments?.length != null && postDetail.comments.length > 0 && (
                      <span className="text-xs font-mono font-bold text-slate-400">
                        ({postDetail.comments.length})
                      </span>
                    )}
                  </h3>
                  {(postDetail.comments || []).length === 0 ? (
                    <p className="text-sm text-slate-500">{t("classroomWorkspace.postDetail.noComments")}</p>
                  ) : (
                    <ul className="space-y-3">
                      {(postDetail.comments || []).map((c) => {
                        const canDelete = c.authorId === user?.id || canCompose;
                        return (
                          <li
                            key={c.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <UserAvatar
                                  name={c.author?.name || t("classroomWorkspace.userFallback")}
                                  photoUrl={c.author?.photoUrl}
                                  userId={c.authorId}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900">
                                    {c.author?.name || t("classroomWorkspace.unknownAuthor")}
                                  </p>
                                  <p className="text-xs text-slate-500 font-medium">
                                    {new Date(c.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              {canDelete && !readOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(c)}
                                  className="text-xs font-bold text-rose-600 hover:text-rose-700 shrink-0"
                                >
                                  {t("common:delete")}
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{c.body}</p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {!readOnly && (
                    <div className="space-y-2">
                      <textarea
                        className={`${fieldInput} min-h-[80px]`}
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        placeholder={t("classroomWorkspace.postDetail.commentPlaceholder")}
                      />
                      <button
                        type="button"
                        disabled={savingComment || !commentBody.trim()}
                        onClick={handlePostComment}
                        className={`${buttonClass.base} ${buttonClass.primary} ${buttonClass.sizeDefault}`}
                      >
                        <Send className="h-4 w-4" />
                        {savingComment ? t("classroomWorkspace.postDetail.postingComment") : t("classroomWorkspace.postDetail.postComment")}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
      </DetailDrawerShell>
    </div>
  );
}
