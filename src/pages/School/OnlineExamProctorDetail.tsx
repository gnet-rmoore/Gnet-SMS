import React from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock3,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  Wifi,
  UserCheck,
  UserX,
  Eye,
  Download,
  Printer,
  AlertCircle,
  Monitor,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { onlineExamApi } from "../../features/online-exam/api";
import { useExamSocket } from "../../features/online-exam/useExamSocket";
import { PageToast, usePageToast } from "../../features/academics-shared/PageToast";
import { alertError } from "../../lib/swal";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";
import { format } from "date-fns";

export const OnlineExamProctorDetail = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { examId, attemptId } = useParams();
  const { school } = useAuthStore();
  const { toast, showToast } = usePageToast();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);
  const [exam, setExam] = React.useState<any>(null);
  const [savingQ, setSavingQ] = React.useState<string | null>(null);
  const [essayScores, setEssayScores] = React.useState<Record<string, string>>({});
  const [frames, setFrames] = React.useState<
    { id: string; capturedAt: string; byteSize: number | null; url: string }[]
  >([]);
  const [framesLoading, setFramesLoading] = React.useState(false);
  const [framesError, setFramesError] = React.useState<string | null>(null);

  const loadFrames = React.useCallback(async () => {
    if (!attemptId) return;
    try {
      setFramesLoading(true);
      const res = await onlineExamApi.listProctorFrames(attemptId);
      setFrames(Array.isArray(res) ? res : []);
      setFramesError(null);
    } catch (err: any) {
      setFramesError(err?.message || "Failed to load frames");
    } finally {
      setFramesLoading(false);
    }
  }, [attemptId]);

  const loadData = React.useCallback(async () => {
    if (!attemptId || !examId) return;
    setLoading(true);
    try {
      const [attemptRes, examRes] = await Promise.all([
        onlineExamApi.getAttempt(attemptId),
        api.get(`/api/exams/${examId}`),
      ]);
      setData(attemptRes);
      setExam(examRes);
    } catch (err: any) {
      await alertError(t("onlineExams.proctor.detailLoadFailed"), err?.message);
    } finally {
      setLoading(false);
    }
  }, [attemptId, examId, t]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const isLiveScreen =
    data?.attempt?.status === "IN_PROGRESS" && data?.exam?.proctorLevel === "SCREEN_VIEW";

  React.useEffect(() => {
    if (!isLiveScreen) {
      setFrames([]);
      return;
    }
    void loadFrames();
    const id = window.setInterval(() => void loadFrames(), 12000);
    return () => window.clearInterval(id);
  }, [isLiveScreen, loadFrames]);

  useExamSocket(
    { attemptId: isLiveScreen ? attemptId : undefined },
    (event) => {
      if (event.type === "screen.frame") void loadFrames();
    }
  );

  const handleMarkEssay = async (questionId: string) => {
    if (!attemptId) return;
    const raw = essayScores[questionId];
    const value = raw === undefined || raw === "" ? null : Number(raw);
    if (value !== null && (!Number.isFinite(value) || value < 0)) return;
    setSavingQ(questionId);
    try {
      await onlineExamApi.markEssayAnswer(attemptId, questionId, value);
      showToast(t("onlineExams.proctor.markSaved"), "success");
      await loadData();
    } catch (err: any) {
      showToast(t("onlineExams.proctor.markFailed", { error: err?.message }), "error");
    } finally {
      setSavingQ(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-16 flex items-center justify-center text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> {t("onlineExams.loadingOnline")}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-16 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-slate-400 mb-4" />
        <p className="text-slate-500">{t("onlineExams.proctor.notFound")}</p>
        <Link
          to={`/${school?.slug}/online-exams/${examId}/proctor`}
          className="mt-4 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> {t("onlineExams.proctor.backToConsole")}
        </Link>
      </div>
    );
  }

  const attempt = data.attempt;
  const questions = data.questions || [];
  const violations = data.violations || [];

  const getTimeRemaining = (endsAt: string) => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { text: t("onlineExams.proctor.expired"), expired: true };
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return { text: `${mins}:${secs.toString().padStart(2, "0")}`, expired: false };
  };

  const canSeeScore =
    attempt.status !== "IN_PROGRESS" &&
    (attempt.exam?.showResultsImmediately || attempt.exam?.isGradesReleased);

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
            to={`/${school?.slug}/online-exams/${examId}/proctor`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> {t("onlineExams.proctor.backToConsole")}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            {t("onlineExams.proctor.studentView")}
          </h1>
          <p className="text-slate-500 font-medium">
            {attempt.studentName || attempt.studentId} &middot; {exam?.title}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            attempt.status === "IN_PROGRESS" ? "bg-indigo-50 text-indigo-700"
              : attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED" ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}>
            {attempt.status === "IN_PROGRESS" && <Wifi className="w-3 h-3" />}
            {attempt.status === "SUBMITTED" && <UserCheck className="w-3 h-3" />}
            {attempt.status === "AUTO_SUBMITTED" && <ShieldAlert className="w-3 h-3" />}
            {attempt.status === "EXPIRED" && <UserX className="w-3 h-3" />}
            {attempt.status === "IN_PROGRESS" ? t("onlineExams.proctor.inProgress")
              : attempt.status === "SUBMITTED" ? t("onlineExams.proctor.submitted")
              : attempt.status === "AUTO_SUBMITTED" ? t("onlineExams.proctor.autoSubmitted")
              : t("onlineExams.proctor.expired")}
          </div>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("onlineExams.proctor.student")}</p>
          <p className="font-bold text-slate-900">{attempt.studentName || attempt.studentId}</p>
          <p className="text-xs text-slate-500">{attempt.studentEmail || attempt.studentId}</p>
        </div>
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("onlineExams.proctor.started")}</p>
          <p className="font-bold text-slate-900">{format(new Date(attempt.startedAt), "PPpp")}</p>
          <p className="text-xs text-slate-500">{getTimeRemaining(attempt.endsAt).text}</p>
        </div>
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("onlineExams.proctor.violations")}</p>
          <p className="font-bold text-slate-900 flex items-center gap-2">
            {attempt.violationCount}
            {attempt.violationCount > 0 && <AlertTriangle className="w-4 h-4 text-rose-600" />}
          </p>
        </div>
      </div>

      {isLiveScreen && (
        <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-extrabold tracking-tight text-white flex items-center gap-2">
              <Monitor className="w-5 h-5 text-emerald-400" />
              {t("onlineExams.proctor.liveScreen")}
            </h2>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {t("onlineExams.proctor.liveBadge")}
              </span>
              <button
                type="button"
                onClick={() => void loadFrames()}
                disabled={framesLoading}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${framesLoading ? "animate-spin" : ""}`} />
                {t("onlineExams.proctor.refreshFrames")}
              </button>
            </div>
          </div>

          {frames.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              {framesError ? framesError : t("onlineExams.proctor.noFrames")}
            </p>
          ) : (
            <>
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black">
                <img
                  src={frames[0].url}
                  alt={t("onlineExams.proctor.liveScreen")}
                  className="w-full max-h-[420px] object-contain"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {frames.slice(1).map((f) => (
                  <img
                    key={f.id}
                    src={f.url}
                    alt={t("onlineExams.proctor.liveScreen")}
                    loading="lazy"
                    className="h-16 w-28 shrink-0 rounded-lg border border-slate-800 object-cover"
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {t("onlineExams.proctor.lastFrame", {
                  time: format(new Date(frames[0].capturedAt), "PPpp"),
                })}
              </p>
            </>
          )}
        </div>
      )}

      {canSeeScore && attempt.score != null && (
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { label: t("onlineExams.results.score"), value: `${attempt.score}/${attempt.maxScore}`, icon: null },
            { label: t("onlineExams.results.passed"), value: attempt.passedCount ?? 0, icon: CheckCircle2, tone: "emerald" },
            { label: t("onlineExams.results.missed"), value: attempt.missedCount ?? 0, icon: XCircle, tone: "rose" },
            { label: t("onlineExams.results.pendingEssays"), value: attempt.pendingCount ?? 0, icon: Clock3, tone: "slate" },
          ].map((s) => (
            <div key={s.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
              {s.icon && (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  s.tone === "emerald" ? "bg-emerald-50 text-emerald-600"
                    : s.tone === "rose" ? "bg-rose-50 text-rose-600"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  <s.icon className="w-5 h-5" />
                </div>
              )}
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {violations.length > 0 && (
        <div className="rounded-[32px] border border-rose-100 bg-rose-50 p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
          <h2 className="font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            {t("onlineExams.proctor.violationsLog")}
          </h2>
          <div className="space-y-2">
            {violations.map((v: any) => (
              <div key={v.id} className="rounded-xl border border-rose-200 bg-white p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-700 capitalize">{v.type.replace(/_/g, " ").toLowerCase()}</span>
                  <span className="text-xs text-slate-500">{format(new Date(v.createdAt), "PPpp")}</span>
                </div>
                {v.detail && <p className="text-sm text-rose-600">{v.detail}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
        <h2 className="font-extrabold tracking-tight text-slate-900">{t("onlineExams.results.questionReview")}</h2>
        <div className="space-y-4">
          {questions.map((q: any, index: number) => {
            const pending = q.answer?.pending === true;
            const ok = q.answer?.isCorrect === true;
            return (
              <div
                key={q.id}
                className={`rounded-2xl border p-5 ${
                  pending ? "border-slate-100 bg-slate-50"
                    : ok ? "border-emerald-100 bg-emerald-50/40"
                    : "border-rose-100 bg-rose-50/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-900">
                    <span className="font-mono text-slate-400 mr-2">Q{index + 1}</span>
                    {q.prompt}
                  </p>
                  <span className="text-xs font-mono text-slate-500 shrink-0">
                    {pending ? t("common:pending") : ok ? `+${q.answer?.pointsAwarded ?? q.points}` : "0"}
                  </span>
                </div>
                {q.answer?.textAnswer != null && q.answer.textAnswer !== "" && (
                  <p className="mt-2 text-sm text-slate-600">
                    {t("onlineExams.results.yourAnswer", { text: q.answer.textAnswer })}
                  </p>
                )}
                {q.answer?.selectedChoiceId && (
                  <p className="mt-2 text-sm text-slate-600">
                    {t("onlineExams.results.yourChoice")}:{" "}
                    {q.choices?.find((c: any) => c.id === q.answer.selectedChoiceId)?.text || "—"}
                  </p>
                )}
                {!pending && !ok && q.type === "FILL_BLANK" && q.correctAnswer && (
                  <p className="mt-1 text-sm text-emerald-700">
                    {t("onlineExams.results.expected", { text: q.correctAnswer })}
                  </p>
                )}
                {q.type === "ESSAY" && attempt.status !== "IN_PROGRESS" && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {t("onlineExams.proctor.awardedPoints")}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={q.points}
                      value={essayScores[q.id] ?? (q.answer?.pointsAwarded ?? "").toString()}
                      onChange={(e) => setEssayScores((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      className="w-24 rounded-xl border border-slate-200 px-3 py-1.5 text-sm"
                    />
                    <span className="text-xs text-slate-500">{t("onlineExams.proctor.outOf", { max: q.points })}</span>
                    <button
                      type="button"
                      disabled={savingQ === q.id}
                      onClick={() => handleMarkEssay(q.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                    >
                      {savingQ === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      {t("onlineExams.proctor.saveMark")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OnlineExamProctorDetail;