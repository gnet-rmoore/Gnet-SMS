import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ClipboardList,
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Plus,
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
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { uploadClassroomFile, workspaceApi } from "./api";
import { FileDropzone } from "./FileDropzone";
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

  const applyPostDetail = useCallback((detail: PostDetail) => {
    setPostDetail(detail);
    setTurnInText(detail.mySubmission?.textResponse || "");
    const drafts: Record<string, { grade: string; feedback: string }> = {};
    for (const s of detail.submissions || []) {
      drafts[s.id] = {
        grade: s.grade != null ? String(s.grade) : "",
        feedback: s.feedback || "",
      };
    }
    setGradeDrafts(drafts);
  }, []);

  const refreshActivePost = useCallback(async () => {
    if (!activePostId) return;
    try {
      const detail = await workspaceApi.fetchPost(activePostId, studentId);
      applyPostDetail(detail);
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

  const closePost = () => {
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

  const classworkByTopic = useMemo(() => {
    const groups: Array<{ key: string; title: string; posts: ClassroomPost[] }> = topics
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((t) => ({ key: t.id, title: t.title, posts: [] as ClassroomPost[] }));
    const byId = new Map(groups.map((g) => [g.key, g]));
    const uncategorized: ClassroomPost[] = [];

    for (const p of classwork) {
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
  }, [classwork, topics, t]);

  const teachers = members.filter((m) => ["TEACHER", "CO_TEACHER", "ASSISTANT"].includes(m.role));
  const students = members.filter((m) => m.role === "STUDENT");

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
    try {
      await workspaceApi.returnSubmission(submissionId, {
        grade: draft.grade === "" ? null : Number(draft.grade),
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
        className="rounded-[32px] overflow-hidden border border-slate-100 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] bg-white"
      >
        <ClassroomBannerStrip classroom={classroom} className="h-28">
          <Link
            to={classroomListPath}
            className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 text-slate-800 text-xs font-bold hover:bg-white"
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
              className="absolute top-4 right-4 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 text-slate-800 text-xs font-bold hover:bg-white"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {t("classroomWorkspace.customizeBanner")}
            </button>
          )}
        </ClassroomBannerStrip>
        <div className="px-6 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
              {classroom.name}
            </h1>
            <p className="text-slate-500 font-medium mt-1 text-sm">
              {t("classroomWorkspace.marksHint")}{" "}
              <Link to={`/${slug}/gradebook`} className="text-indigo-600 font-bold hover:underline">
                {t("classroomWorkspace.gradebook")}
              </Link>
              {isStudent ? (
                <>
                  {" "}
                  /{" "}
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              {t("classroomWorkspace.newPost")}
            </button>
          )}
        </div>
        <div className="px-6 sm:px-8 border-t border-slate-100 flex gap-1 overflow-x-auto">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
        </div>
      </motion.div>

      {tab === "STREAM" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6">
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                {t("classroomWorkspace.stream.upcoming")}
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-sm text-slate-500 mt-3">{t("classroomWorkspace.stream.noUpcoming")}</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {upcoming.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => openPost(p.id)}
                        className="text-left w-full"
                      >
                        <p className="text-sm font-bold text-slate-900 line-clamp-1">
                          {p.title || t("classroomWorkspace.assignmentFallback")}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">{formatDue(p.dueAt)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {posts.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="font-extrabold tracking-tight text-slate-900">{t("classroomWorkspace.stream.noPostsTitle")}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {canCompose ? t("classroomWorkspace.stream.noPostsStaff") : t("classroomWorkspace.stream.noPostsStudent")}
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      name={post.author?.name || t("classroomWorkspace.unknownAuthor")}
                      photoUrl={post.author?.photoUrl}
                      userId={post.authorId}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-slate-900">
                          {post.author?.name || t("classroomWorkspace.unknownAuthor")}
                        </p>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {post.type}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {post.title && (
                        <h3 className="text-base font-extrabold tracking-tight text-slate-900 mt-1">
                          {post.title}
                        </h3>
                      )}
                      <div
                        className="prose prose-sm max-w-none text-slate-600 mt-2"
                        dangerouslySetInnerHTML={{ __html: post.body }}
                      />
                      {post.type === "ASSIGNMENT" && (
                        <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                          {formatDue(post.dueAt) && (
                            <span>{t("classroomWorkspace.stream.due", { date: formatDue(post.dueAt) })}</span>
                          )}
                          {post.maxPoints != null && (
                            <span className="font-mono">{t("classroomWorkspace.stream.points", { count: post.maxPoints })}</span>
                          )}
                        </div>
                      )}
                      <AttachmentLinks attachments={post.attachments} fallbackLabel={t("classroomWorkspace.attachment")} />
                      {post._count?.comments != null && post._count.comments > 0 && (
                        <p className="mt-2 text-xs font-bold text-slate-500 inline-flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {post._count.comments}{" "}
                          {t("classroomWorkspace.stream.comment", { count: post._count.comments })}
                        </p>
                      )}
                      {(post.type === "ASSIGNMENT" || post.type === "MATERIAL") && (
                        <button
                          type="button"
                          onClick={() => openPost(post.id)}
                          className="mt-4 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                        >
                          {t("classroomWorkspace.stream.open")}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "CLASSWORK" && (
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{t("classroomWorkspace.classwork.title")}</h2>
            {canCompose && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTopicCreateOpen(true)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  {t("classroomWorkspace.classwork.newTopic")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setComposeType("MATERIAL");
                    setComposeOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  {t("classroomWorkspace.classwork.material")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setComposeType("ASSIGNMENT");
                    setComposeOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                >
                  {t("classroomWorkspace.classwork.assignment")}
                </button>
              </div>
            )}
          </div>
          {classwork.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">{t("classroomWorkspace.classwork.empty")}</p>
          ) : (
            <div className="space-y-8">
              {classworkByTopic.map((group) => (
                <section key={group.key} className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-2">
                    {group.title}
                  </h3>
                  <ul className="divide-y divide-slate-100">
                    {group.posts.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => openPost(p.id)}
                          className="w-full flex items-center gap-3 py-4 text-left hover:bg-slate-50/80 px-2 rounded-2xl"
                        >
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                            <ClipboardList className="w-5 h-5 text-slate-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-slate-900 truncate">
                              {p.title || (p.type === "MATERIAL" ? t("classroomWorkspace.materialFallback") : t("classroomWorkspace.assignmentFallback"))}
                            </p>
                            <p className="text-xs text-slate-500 font-medium">
                              {p.type}
                              {formatDue(p.dueAt) ? ` · ${t("classroomWorkspace.stream.due", { date: formatDue(p.dueAt) })}` : ""}
                              {p.maxPoints != null ? ` · ${t("classroomWorkspace.stream.points", { count: p.maxPoints })}` : ""}
                              {p.attachments?.length
                                ? ` · ${p.attachments.length} ${t("classroomWorkspace.classwork.attachment", { count: p.attachments.length })}`
                                : ""}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
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
                          {m.user?.name || "Unknown"}
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
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] p-6 sm:p-8 overflow-x-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{t("classroomWorkspace.marks.title")}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {t("classroomWorkspace.marks.hint")}
              </p>
            </div>
            {canCompose && (
              <Link
                to={`/${slug}/gradebook`}
                className="text-sm font-bold text-indigo-600 hover:underline"
              >
                {t("classroomWorkspace.marks.openGradebook")}
              </Link>
            )}
          </div>
          {!marks || marks.assignments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">{t("classroomWorkspace.marks.empty")}</p>
          ) : showPersonalMarks ? (
            <ul className="space-y-3">
              {marks.assignments.map((a) => {
                const sub = a.submissions[0];
                return (
                  <li
                    key={a.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">{a.title || "Assignment"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {sub?.status || t("classroomWorkspace.marks.notStarted")}
                        {a.maxPoints != null ? ` · ${t("classroomWorkspace.marks.maxPoints", { count: a.maxPoints })}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg font-extrabold text-slate-900">
                        {sub?.grade != null ? sub.grade : "—"}
                      </p>
                      <button
                        type="button"
                        onClick={() => openPost(a.id)}
                        className="text-xs font-bold text-indigo-600 mt-1"
                      >
                        Open
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="py-3 pr-4">{t("classroomWorkspace.marks.studentCol")}</th>
                  {marks.assignments.map((a) => (
                    <th key={a.id} className="py-3 px-2 font-mono normal-case tracking-normal">
                      <button type="button" onClick={() => openPost(a.id)} className="hover:text-indigo-600 text-left">
                        {(a.title || "A").slice(0, 18)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {marks.students.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-bold text-slate-900">{s.name}</td>
                    {marks.assignments.map((a) => {
                      const sub = a.submissions.find((x) => x.studentId === s.id);
                      return (
                        <td key={a.id} className="py-3 px-2 font-mono text-slate-700">
                          {sub?.grade != null
                            ? sub.grade
                            : sub
                              ? sub.status
                              : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
              >
                {t("common:cancel")}
              </button>
              <button
                type="button"
                disabled={savingPost}
                onClick={submitCompose}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {savingPost ? t("classroomWorkspace.compose.posting") : t("classroomWorkspace.compose.post")}
              </button>
            </div>
          }
        >
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex gap-2">
              {(["ANNOUNCEMENT", "ASSIGNMENT", "MATERIAL"] as const).map((typeKey) => (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setComposeType(typeKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    composeType === typeKey
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600"
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
            <div>
              <label className={fieldLabel}>{t("classroomWorkspace.compose.title")}</label>
              <input
                className={`${fieldInput} mt-1.5`}
                value={composeTitle}
                onChange={(e) => setComposeTitle(e.target.value)}
                placeholder={
                  composeType === "ANNOUNCEMENT"
                    ? t("classroomWorkspace.compose.optionalTitle")
                    : t("classroomWorkspace.compose.requiredTitle")
                }
              />
            </div>
            <div>
              <label className={fieldLabel}>{t("classroomWorkspace.compose.body")}</label>
              <div className="mt-1.5">
                <RichTextEditor value={composeBody} onChange={setComposeBody} minHeight="140px" />
              </div>
            </div>
            {composeType === "ASSIGNMENT" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={fieldLabel}>{t("classroomWorkspace.compose.points")}</label>
                  <input
                    type="number"
                    className={`${fieldInput} mt-1.5 font-mono`}
                    value={composePoints}
                    onChange={(e) => setComposePoints(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className={fieldLabel}>{t("classroomWorkspace.compose.due")}</label>
                  <input
                    type="datetime-local"
                    className={`${fieldInput} mt-1.5`}
                    value={composeDue}
                    onChange={(e) => setComposeDue(e.target.value)}
                  />
                </div>
              </div>
            )}
            {(composeType === "ASSIGNMENT" || composeType === "MATERIAL") && (
              <div>
                <label className={fieldLabel}>{t("classroomWorkspace.compose.topic")}</label>
                <select
                  className={`${fieldInput} mt-1.5`}
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
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                  <option value={CREATE_TOPIC_OPTION}>
                    {t("classroomWorkspace.compose.createNewTopic")}
                  </option>
                </select>
              </div>
            )}
            <div>
              <FileDropzone
                files={composeFiles}
                onChange={setComposeFiles}
                multiple
                label={t("classroomWorkspace.compose.attachments")}
                hint={t("classroomWorkspace.compose.attachmentsHint")}
                disabled={savingPost}
              />
            </div>
            <div>
              <label className={fieldLabel}>{t("classroomWorkspace.compose.linkUrl")}</label>
              <input
                type="url"
                className={`${fieldInput} mt-1.5`}
                value={composeLinkUrl}
                onChange={(e) => setComposeLinkUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
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

      {activePostId && (
        <FeatureModalShell
          title={postDetail?.title || (postDetail?.type === "MATERIAL" ? t("classroomWorkspace.materialFallback") : t("classroomWorkspace.assignmentFallback"))}
          subtitle={
            postDetail
              ? [
                  postDetail.type,
                  formatDue(postDetail.dueAt) ? t("classroomWorkspace.stream.due", { date: formatDue(postDetail.dueAt) }) : null,
                  postDetail.maxPoints != null ? t("classroomWorkspace.stream.points", { count: postDetail.maxPoints }) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : t("classroomWorkspace.postDetail.loading")
          }
          onClose={closePost}
          wide
        >
          <div className="p-6 sm:p-8 space-y-6">
            {detailLoading || !postDetail ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div
                  className="prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{ __html: postDetail.body }}
                />
                <AttachmentLinks attachments={postDetail.attachments} fallbackLabel={t("classroomWorkspace.attachment")} />

                {isStudent && !readOnly && postDetail.type === "ASSIGNMENT" && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-extrabold text-slate-900">{t("classroomWorkspace.postDetail.yourWork")}</p>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {postDetail.mySubmission?.status || t("classroomWorkspace.postDetail.assigned")}
                      </span>
                    </div>
                    {postDetail.mySubmission?.status === "RETURNED" ? (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">
                          {postDetail.mySubmission.textResponse || "—"}
                        </p>
                        <AttachmentLinks attachments={postDetail.mySubmission.attachments} fallbackLabel={t("classroomWorkspace.attachment")} />
                        <p className="font-mono text-lg font-extrabold text-slate-900">
                          {t("classroomWorkspace.postDetail.score")}{" "}
                          {postDetail.mySubmission.grade != null
                            ? postDetail.mySubmission.grade
                            : "—"}
                          {postDetail.maxPoints != null ? ` / ${postDetail.maxPoints}` : ""}
                        </p>
                        {postDetail.mySubmission.feedback && (
                          <p className="text-sm text-slate-600">
                            {t("classroomWorkspace.postDetail.feedback")} {postDetail.mySubmission.feedback}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <textarea
                          className={`${fieldInput} min-h-[120px]`}
                          value={turnInText}
                          onChange={(e) => setTurnInText(e.target.value)}
                          placeholder={t("classroomWorkspace.postDetail.typeResponse")}
                        />
                        <div>
                          <FileDropzone
                            files={turnInFiles}
                            onChange={setTurnInFiles}
                            multiple
                            label="Attachments (optional)"
                            hint="Drag and drop files here, or click to browse"
                          />
                        </div>
                        {postDetail.mySubmission?.attachments?.length ? (
                          <AttachmentLinks attachments={postDetail.mySubmission.attachments} fallbackLabel={t("classroomWorkspace.attachment")} />
                        ) : null}
                        <button
                          type="button"
                          onClick={handleTurnIn}
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold"
                        >
                          {postDetail.mySubmission ? t("classroomWorkspace.postDetail.updateTurnIn") : t("classroomWorkspace.postDetail.turnIn")}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {isParent && postDetail.type === "ASSIGNMENT" && postDetail.mySubmission && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-2">
                      <p className="text-sm font-extrabold text-slate-900">{t("classroomWorkspace.postDetail.submission")}</p>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {postDetail.mySubmission.status}
                      </p>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">
                        {postDetail.mySubmission.textResponse || "—"}
                      </p>
                      <AttachmentLinks attachments={postDetail.mySubmission.attachments} fallbackLabel={t("classroomWorkspace.attachment")} />
                      {postDetail.mySubmission.grade != null && (
                        <p className="font-mono text-lg font-extrabold text-slate-900">
                          {t("classroomWorkspace.postDetail.score")} {postDetail.mySubmission.grade}
                          {postDetail.maxPoints != null ? ` / ${postDetail.maxPoints}` : ""}
                        </p>
                      )}
                      {postDetail.mySubmission.feedback && (
                        <p className="text-sm text-slate-600">
                          Feedback: {postDetail.mySubmission.feedback}
                        </p>
                      )}
                    </div>
                  )}

                {canCompose && postDetail.type === "ASSIGNMENT" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
                      {t("classroomWorkspace.postDetail.studentSubmissions")}
                    </h3>
                    {(postDetail.submissions || []).length === 0 ? (
                      <p className="text-sm text-slate-500">{t("classroomWorkspace.postDetail.noSubmissions")}</p>
                    ) : (
                      <ul className="space-y-4">
                        {(postDetail.submissions || []).map((s) => (
                          <li
                            key={s.id}
                            className="rounded-2xl border border-slate-100 p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <UserAvatar
                                  name={s.student?.name || "Student"}
                                  photoUrl={s.student?.photoUrl}
                                  userId={s.studentId}
                                  size="sm"
                                />
                                <div>
                                  <p className="text-sm font-bold text-slate-900">
                                    {s.student?.name || "Unknown"}
                                  </p>
                                  <p className="text-xs text-slate-500 font-medium">{s.status}</p>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">
                              {s.textResponse || "—"}
                            </p>
                            <AttachmentLinks attachments={s.attachments} fallbackLabel={t("classroomWorkspace.attachment")} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className={fieldLabel}>{t("classroomWorkspace.postDetail.grade")}</label>
                                <input
                                  className={`${fieldInput} mt-1 font-mono`}
                                  value={gradeDrafts[s.id]?.grade ?? ""}
                                  onChange={(e) =>
                                    setGradeDrafts((prev) => ({
                                      ...prev,
                                      [s.id]: {
                                        grade: e.target.value,
                                        feedback: prev[s.id]?.feedback ?? "",
                                      },
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <label className={fieldLabel}>{t("classroomWorkspace.postDetail.feedbackLabel")}</label>
                                <input
                                  className={`${fieldInput} mt-1`}
                                  value={gradeDrafts[s.id]?.feedback ?? ""}
                                  onChange={(e) =>
                                    setGradeDrafts((prev) => ({
                                      ...prev,
                                      [s.id]: {
                                        grade: prev[s.id]?.grade ?? "",
                                        feedback: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleReturn(s.id)}
                                className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                              >
                                {t("classroomWorkspace.postDetail.return")}
                              </button>
                              {s.status === "RETURNED" && (
                                <button
                                  type="button"
                                  onClick={() => handleReopen(s.id)}
                                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
                                >
                                  {t("classroomWorkspace.postDetail.reopen")}
                                </button>
                              )}
                            </div>
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
                                    {c.author?.name || "Unknown"}
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
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50"
                      >
                        {savingComment ? t("classroomWorkspace.postDetail.postingComment") : t("classroomWorkspace.postDetail.postComment")}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </FeatureModalShell>
      )}
    </div>
  );
}
