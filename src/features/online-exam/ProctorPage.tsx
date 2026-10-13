import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { onlineExamApi } from "./api";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";

type LiveAttempt = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  startedAt: string;
  endsAt: string;
  violationCount: number;
  answeredCount: number;
};

type LiveEvent =
  | { type: "attempt.started"; payload: { examId: string; attemptId: string; studentId: string; startedAt: string } }
  | { type: "attempt.answered"; payload: { examId: string; attemptId: string; answeredCount: number } }
  | { type: "attempt.violation"; payload: { examId: string; attemptId: string; violationCount: number; detail?: string } }
  | { type: "attempt.submitted"; payload: { examId: string; attemptId: string; studentId: string; submittedAt: string; autoSubmitted: boolean } }
  | { type: "connected"; payload: { examId: string } };

export default function OnlineExamProctorPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { examId } = useParams();
  const { school, user } = useAuthStore();
  const navigate = useNavigate();
  const { toast, showToast } = usePageToast();

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<{ id: string; title: string; duration: number; endDate: string | null } | null>(null);
  const [attempts, setAttempts] = useState<LiveAttempt[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [pushingToGradebook, setPushingToGradebook] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePushToGradebook = async () => {
    if (!examId) return;
    setPushingToGradebook(true);
    try {
      const result = await onlineExamApi.pushToGradebook(examId, { pushAll: true });
      showToast(t("onlineExams.proctor.pushToGradebookSuccess", { count: result.pushed }), "success");
    } catch (err: any) {
      showToast(t("onlineExams.proctor.pushToGradebookFailed", { error: err?.message }), "error");
    } finally {
      setPushingToGradebook(false);
    }
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

        // Teacher-subject restriction: only allow proctoring if user teaches the exam's subject
        // or is an admin (SCHOOL_ADMIN, PRINCIPAL, VPI)
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
        setAttempts(liveAttempts);
        connectSSE();
      } catch (err: any) {
        if (cancelled) return;
        showToast(t("onlineExams.proctor.loadFailed", { message: err?.message }), "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (eventSource) eventSource.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [examId, user?.role, user?.id, school?.id]);

  const connectSSE = () => {
    if (!examId || eventSource) return;
    const token = localStorage.getItem("token");
    const url = `/api/exams/${examId}/live-stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const es = new EventSource(url);
    setEventSource(es);

    es.onopen = () => {
      setConnected(true);
      setReconnecting(false);
    };

    es.addEventListener("attempt.started", (e) => {
      const data = JSON.parse(e.data);
      setAttempts((prev) => {
        if (prev.some((a) => a.id === data.attemptId)) return prev;
        return [...prev, { id: data.attemptId, studentId: data.studentId, studentName: data.studentId, startedAt: data.startedAt, endsAt: "", violationCount: 0, answeredCount: 0 }];
      });
    });

    es.addEventListener("attempt.answered", (e) => {
      const data = JSON.parse(e.data);
      setAttempts((prev) =>
        prev.map((a) => (a.id === data.attemptId ? { ...a, answeredCount: data.answeredCount } : a))
      );
    });

    es.addEventListener("attempt.violation", (e) => {
      const data = JSON.parse(e.data);
      setAttempts((prev) =>
        prev.map((a) => (a.id === data.attemptId ? { ...a, violationCount: data.violationCount } : a))
      );
    });

    es.addEventListener("attempt.submitted", (e) => {
      const data = JSON.parse(e.data);
      setAttempts((prev) =>
        prev.map((a) =>
          a.id === data.attemptId ? { ...a, status: "SUBMITTED" as any, submittedAt: data.submittedAt, autoSubmitted: data.autoSubmitted } : a
        )
      );
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      setEventSource(null);
      scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    setReconnecting(true);
    reconnectTimeoutRef.current = setTimeout(() => {
      connectSSE();
    }, 3000);
  };

  const handleRefresh = () => {
    if (!examId) return;
    onlineExamApi.getLiveAttempts(examId).then((data) => setAttempts(data));
  };

  const getTimeRemaining = (endsAt: string) => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { text: t("onlineExams.proctor.expired"), expired: true };
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return { text: `${mins}:${secs.toString().padStart(2, "0")}`, expired: false };
  };

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

      <div className="rounded-[32px] border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">{t("onlineExams.proctor.student")}</th>
                <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">{t("onlineExams.proctor.started")}</th>
                <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">{t("onlineExams.proctor.timeLeft")}</th>
                <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">{t("onlineExams.proctor.progress")}</th>
                <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">{t("onlineExams.proctor.violations")}</th>
                <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">{t("onlineExams.proctor.status")}</th>
                <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">{t("onlineExams.proctor.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    {t("onlineExams.proctor.noActiveAttempts")}
                  </td>
                </tr>
              )}
              {attempts.map((a) => {
                const { text: timeLeft, expired } = getTimeRemaining(a.endsAt);
                const isSubmitted = (a as any).status === "SUBMITTED";
                const isAutoSubmitted = (a as any).autoSubmitted;
                return (
                  <tr key={a.id} className={isSubmitted ? "bg-emerald-50" : expired ? "bg-red-50" : ""}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{a.studentName}</div>
                      <div className="text-xs text-slate-500">{a.studentEmail || a.studentId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      <Clock className="w-3 h-3 inline mr-1" /> {new Date(a.startedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono ${expired ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                        {timeLeft}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-300"
                          style={{ width: exam && exam.duration > 0 ? `${Math.min(100, (a.answeredCount / (exam.duration * 2)) * 100)}%` : "0%" }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{a.answeredCount} {t("onlineExams.proctor.answered")}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${a.violationCount > 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                        <AlertTriangle className="w-3 h-3" /> {a.violationCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isSubmitted ? (
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
                      {!isSubmitted && (
                        <Link
                          to={`/${school?.slug}/online-exams/${examId}/proctor/${a.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="w-3 h-3" /> {t("onlineExams.proctor.view")}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}