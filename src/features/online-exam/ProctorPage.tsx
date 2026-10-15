import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Clock,
  UserCheck,
  UserX,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Eye,
  AlertCircle,
  Upload,
  Flag,
  Bell,
  Timer,
  Ban,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { onlineExamApi } from "./api";
import { useExamSocket, type ExamSocketEvent } from "./useExamSocket";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";

type ConnectionState = "CONNECTED" | "DISCONNECTED";

type LiveAttempt = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  startedAt: string;
  endsAt: string;
  violationCount: number;
  answeredCount: number;
  totalQuestions: number;
  lastSeenAt: string | null;
  secondsSinceSeen: number | null;
  connectionState: ConnectionState;
  elapsedMs: number;
  remainingMs: number;
  status?: string;
  autoSubmitted?: boolean;
  flagged?: boolean;
};

type FeedItem = { id: string; at: number; text: string; tone: "info" | "warn" | "danger" };

type FilterKey = "all" | "atRisk" | "violated" | "unsubmitted";

const MAX_FEED = 40;

export default function OnlineExamProctorPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { examId } = useParams();
  const { school, user } = useAuthStore();
  const { toast, showToast } = usePageToast();

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<{ id: string; title: string; duration: number; endDate: string | null } | null>(null);
  const [attempts, setAttempts] = useState<LiveAttempt[]>([]);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [pushingToGradebook, setPushingToGradebook] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pushFeed = (text: string, tone: FeedItem["tone"]) => {
    setFeed((prev) => [{ id: `${Date.now()}-${Math.random()}`, at: Date.now(), text, tone }, ...prev].slice(0, MAX_FEED));
  };

  const handlePushToGradebook = async () => {
    if (!examId) return;
    setPushingToGradebook(true);
    try {
      const result = await onlineExamApi.pushToGradebook(examId, { pushAll: true });
      if (result?.skipped) {
        showToast(
          t("onlineExams.proctor.pushToGradebookSummary", {
            pushed: result.pushed ?? 0,
            skipped: result.skipped ?? 0,
            failed: result.failed ?? 0,
          }),
          "success"
        );
      } else {
        showToast(t("onlineExams.proctor.pushToGradebookSuccess", { count: result.pushed }), "success");
      }
    } catch (err: any) {
      showToast(t("onlineExams.proctor.pushToGradebookFailed", { error: err?.message }), "error");
    } finally {
      setPushingToGradebook(false);
    }
  };

  const refetchLive = async () => {
    if (!examId) return;
    const data = await onlineExamApi.getLiveAttempts(examId);
    setAttempts(data as LiveAttempt[]);
  };

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [examData, liveAttempts] = await Promise.all([
          api.get(`/api/exams/${examId}`),
          onlineExamApi.getLiveAttempts(examId),
        ]);
        if (cancelled) return;

        const userRole = user?.role;
        const isAdmin = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(userRole || "");
        if (!isAdmin && userRole === "TEACHER" && examData.subjectId) {
          const myClassrooms = await api.get(`/api/schools/${school?.id}/classrooms?teacherId=${user.id}`);
          const teachesSubject = Array.isArray(myClassrooms) && myClassrooms.some((c: any) => c.subjectId === examData.subjectId);
          if (!teachesSubject) {
            showToast(t("onlineExams.proctor.accessDenied"), "error");
            setLoading(false);
            return;
          }
        }

        setExam(examData);
        setAttempts(liveAttempts as LiveAttempt[]);
      } catch (err: any) {
        if (cancelled) return;
        showToast(t("onlineExams.proctor.loadFailed", { message: err?.message }), "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId, user?.role, user?.id, school?.id]);

  const applyEvent = (event: ExamSocketEvent) => {
    const p = event.payload || {};
    const attemptId = (p as any).attemptId as string | undefined;
    const update = (patch: Partial<LiveAttempt>) =>
      setAttempts((prev) => prev.map((a) => (a.id === attemptId ? { ...a, ...patch } : a)));

    switch (event.type) {
      case "attempt.started":
        pushFeed(t("onlineExams.proctor.events.started"), "info");
        refetchLive().catch(() => {});
        break;
      case "attempt.answered":
        update({ answeredCount: (p as any).answeredCount });
        pushFeed(t("onlineExams.proctor.events.answered", { count: (p as any).answeredCount }), "info");
        break;
      case "attempt.violation":
        update({ violationCount: (p as any).violationCount });
        pushFeed(t("onlineExams.proctor.events.violation", { count: (p as any).violationCount }), "danger");
        break;
      case "attempt.submitted":
        update({ status: "SUBMITTED", autoSubmitted: (p as any).autoSubmitted });
        pushFeed(t("onlineExams.proctor.events.submitted"), "info");
        break;
      case "attempt.final":
        update({ status: "SUBMITTED" });
        pushFeed(t("onlineExams.proctor.events.final"), "info");
        break;
      case "attempt.disconnected":
        update({ connectionState: "DISCONNECTED" });
        pushFeed(t("onlineExams.proctor.events.disconnected"), "warn");
        break;
      case "attempt.reconnected":
        update({ connectionState: "CONNECTED" });
        pushFeed(t("onlineExams.proctor.events.reconnected"), "info");
        break;
      case "attempt.warning":
        pushFeed(t("onlineExams.proctor.events.warning"), "warn");
        break;
      case "attempt.flagged":
        update({ flagged: (p as any).flagged });
        pushFeed(t("onlineExams.proctor.events.flagged"), "warn");
        break;
      case "attempt.extended":
        update({ endsAt: (p as any).endsAt, remainingMs: new Date((p as any).endsAt).getTime() - Date.now() });
        pushFeed(t("onlineExams.proctor.events.extended", { minutes: (p as any).extraMinutes }), "info");
        break;
      case "attempt.force_submitted":
        update({ status: "AUTO_SUBMITTED" });
        pushFeed(t("onlineExams.proctor.events.forceSubmitted"), "danger");
        break;
      default:
        break;
    }
  };

  useExamSocket(
    {
      examId,
      onStatus: (status) => {
        setConnected(status === "connected");
        setReconnecting(status === "reconnecting");
      },
    },
    applyEvent
  );

  // Periodic live refresh keeps clocks/connection state honest between events.
  useEffect(() => {
    if (!examId) return;
    const id = setInterval(() => {
      refetchLive().catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [examId]);

  const handleRefresh = () => {
    refetchLive().catch(() => {});
  };

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  const handleWarn = (a: LiveAttempt) => {
    const message = window.prompt(t("onlineExams.proctor.warnPrompt"), t("onlineExams.proctor.warnDefault"));
    if (message === null) return;
    withBusy(a.id, async () => {
      try {
        await onlineExamApi.warnStudent(a.id, message || t("onlineExams.proctor.warnDefault"));
        showToast(t("onlineExams.proctor.warnSuccess"), "success");
      } catch (err: any) {
        showToast(t("onlineExams.proctor.warnFailed", { error: err?.message }), "error");
      }
    });
  };

  const handleFlag = (a: LiveAttempt) => {
    withBusy(a.id, async () => {
      try {
        await onlineExamApi.flagAttempt(a.id, !a.flagged);
        setAttempts((prev) => prev.map((x) => (x.id === a.id ? { ...x, flagged: !a.flagged } : x)));
      } catch (err: any) {
        showToast(t("onlineExams.proctor.flagFailed", { error: err?.message }), "error");
      }
    });
  };

  const handleForceSubmit = (a: LiveAttempt) => {
    if (!window.confirm(t("onlineExams.proctor.forceSubmitConfirm"))) return;
    withBusy(a.id, async () => {
      try {
        await onlineExamApi.forceSubmitAttempt(a.id);
        setAttempts((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: "AUTO_SUBMITTED" } : x)));
        showToast(t("onlineExams.proctor.forceSubmitSuccess"), "success");
      } catch (err: any) {
        showToast(t("onlineExams.proctor.forceSubmitFailed", { error: err?.message }), "error");
      }
    });
  };

  const handleExtend = (a: LiveAttempt) => {
    const raw = window.prompt(t("onlineExams.proctor.extendPrompt"), "10");
    if (raw === null) return;
    const minutes = Math.trunc(Number(raw));
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) return;
    withBusy(a.id, async () => {
      try {
        const res = await onlineExamApi.extendAttemptTime(a.id, minutes);
        const endsAt = res?.endsAt ?? a.endsAt;
        setAttempts((prev) => prev.map((x) => (x.id === a.id ? { ...x, endsAt, remainingMs: new Date(endsAt).getTime() - Date.now() } : x)));
        showToast(t("onlineExams.proctor.extendSuccess", { minutes }), "success");
      } catch (err: any) {
        showToast(t("onlineExams.proctor.extendFailed", { error: err?.message }), "error");
      }
    });
  };

  const getTimeRemaining = (endsAt: string) => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { text: t("onlineExams.proctor.expired"), expired: true };
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return { text: `${mins}:${secs.toString().padStart(2, "0")}`, expired: false };
  };

  const isDone = (a: LiveAttempt) => !!a.status && a.status !== "IN_PROGRESS";

  const filtered = useMemo(() => {
    return attempts.filter((a) => {
      if (filter === "atRisk") return !isDone(a) && (a.connectionState === "DISCONNECTED" || a.violationCount > 0);
      if (filter === "violated") return a.violationCount > 0 || a.flagged;
      if (filter === "unsubmitted") return !isDone(a);
      return true;
    });
  }, [attempts, filter]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-16 flex items-center justify-center text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> {t("onlineExams.loadingOnline")}
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-16 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-slate-400 mb-4" />
        <p className="text-slate-500">{t("onlineExams.proctor.notFound")}</p>
      </div>
    );
  }

  const filterTabs: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("onlineExams.proctor.filters.all") },
    { key: "atRisk", label: t("onlineExams.proctor.filters.atRisk") },
    { key: "violated", label: t("onlineExams.proctor.filters.violated") },
    { key: "unsubmitted", label: t("onlineExams.proctor.filters.unsubmitted") },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0 px-6 sm:px-8">
      <PageToast toast={toast} />
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <Link
            to={`/${school?.slug}/exams/${examId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 mb-2"
          >
            <span>←</span> {t("onlineExams.backToExam")}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            {t("onlineExams.proctor.title")}
          </h1>
          <p className="text-slate-500 font-medium">{exam.title}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}>
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connected ? t("onlineExams.proctor.live") : reconnecting ? t("onlineExams.proctor.reconnecting") : t("onlineExams.proctor.disconnected")}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" /> {t("onlineExams.proctor.refresh")}
          </button>
          <button
            type="button"
            onClick={handlePushToGradebook}
            disabled={pushingToGradebook}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 font-bold"
          >
            {pushingToGradebook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {t("onlineExams.proctor.pushToGradebook")}
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                  filter === tab.key
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">{t("onlineExams.proctor.student")}</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">{t("onlineExams.proctor.timeLeft")}</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">{t("onlineExams.proctor.progress")}</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">{t("onlineExams.proctor.violations")}</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">{t("onlineExams.proctor.status")}</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">{t("onlineExams.proctor.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        {t("onlineExams.proctor.noActiveAttempts")}
                      </td>
                    </tr>
                  )}
                  {filtered.map((a) => {
                    const { text: timeLeft, expired } = getTimeRemaining(a.endsAt);
                    const done = isDone(a);
                    const isAutoSubmitted = a.autoSubmitted || a.status === "AUTO_SUBMITTED";
                    const pct = a.totalQuestions > 0 ? Math.min(100, (a.answeredCount / a.totalQuestions) * 100) : 0;
                    const busy = busyId === a.id;
                    return (
                      <tr key={a.id} className={done ? "bg-emerald-50" : expired ? "bg-red-50" : ""}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 flex items-center gap-2">
                            {a.studentName}
                            {a.flagged && <Flag className="w-3 h-3 text-amber-500" />}
                          </div>
                          <div className="text-xs text-slate-500">{a.studentEmail || a.studentId}</div>
                          <div className="text-xs text-slate-400 mt-0.5 inline-flex items-center gap-1">
                            {a.connectionState === "CONNECTED" ? (
                              <><Wifi className="w-3 h-3 text-emerald-500" /> {t("onlineExams.proctor.connected")}</>
                            ) : (
                              <><WifiOff className="w-3 h-3 text-red-500" /> {t("onlineExams.proctor.offline")}
                                {a.secondsSinceSeen != null ? ` · ${t("onlineExams.proctor.lastSeen")} ${t("onlineExams.proctor.secondsAgo", { count: a.secondsSinceSeen })}` : ""}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono ${expired ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                            <Clock className="w-3 h-3" /> {timeLeft}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {a.answeredCount}{a.totalQuestions ? ` / ${a.totalQuestions}` : ""} {t("onlineExams.proctor.answered")}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${a.violationCount > 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                            <AlertTriangle className="w-3 h-3" /> {a.violationCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {done ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              <UserCheck className="w-3 h-3" /> {isAutoSubmitted ? t("onlineExams.proctor.autoSubmitted") : t("onlineExams.proctor.submitted")}
                            </span>
                          ) : expired ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                              <UserX className="w-3 h-3" /> {t("onlineExams.proctor.expired")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                              <Wifi className="w-3 h-3" /> {t("onlineExams.proctor.inProgress")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {!done && (
                              <>
                                <button
                                  type="button"
                                  title={t("onlineExams.proctor.warn")}
                                  disabled={busy}
                                  onClick={() => handleWarn(a)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  <Bell className="w-3 h-3" /> {t("onlineExams.proctor.warn")}
                                </button>
                                <button
                                  type="button"
                                  title={t("onlineExams.proctor.extend")}
                                  disabled={busy}
                                  onClick={() => handleExtend(a)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  <Timer className="w-3 h-3" /> {t("onlineExams.proctor.extend")}
                                </button>
                                <button
                                  type="button"
                                  title={t("onlineExams.proctor.forceSubmit")}
                                  disabled={busy}
                                  onClick={() => handleForceSubmit(a)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                  <Ban className="w-3 h-3" /> {t("onlineExams.proctor.forceSubmit")}
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              title={a.flagged ? t("onlineExams.proctor.unflag") : t("onlineExams.proctor.flag")}
                              disabled={busy}
                              onClick={() => handleFlag(a)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-50 ${
                                a.flagged ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <Flag className="w-3 h-3" />
                            </button>
                            <Link
                              to={`/${school?.slug}/online-exams/${examId}/proctor/${a.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Eye className="w-3 h-3" /> {t("onlineExams.proctor.view")}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-[32px] border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-xs">
              {t("onlineExams.proctor.liveFeed")}
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
              {feed.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-slate-400">{t("onlineExams.proctor.noEvents")}</div>
              )}
              {feed.map((item) => (
                <div key={item.id} className="px-4 py-2.5 text-sm flex items-start gap-2">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      item.tone === "danger" ? "bg-red-500" : item.tone === "warn" ? "bg-amber-500" : "bg-slate-300"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-slate-700">{item.text}</div>
                    <div className="text-xs text-slate-400">{new Date(item.at).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
