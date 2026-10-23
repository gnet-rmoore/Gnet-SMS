import React from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock3,
  Loader2,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { onlineExamApi } from "./api";
import { RichContent } from "./RichContent";
import { alertError } from "../../lib/swal";
import { useTranslation } from "react-i18next";

export default function OnlineExamResultsPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { examId, attemptId } = useParams();
  const { school } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await onlineExamApi.getResults(attemptId);
        if (!cancelled) setData(res);
      } catch (err: any) {
        await alertError(t("onlineExams.results.loadFailed"), err?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 flex items-center justify-center gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" /> {t("onlineExams.loadingResults")}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 text-center text-slate-500">
        {t("onlineExams.results.unavailable")}
      </div>
    );
  }

  if (data.attempt?.resultsPending) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0">
        <Link
          to={`/${school?.slug}/online-exams`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600"
        >
          <ArrowLeft className="w-4 h-4" /> {t("onlineExams.title")}
        </Link>
        <div className="rounded-[32px] border border-slate-200 bg-white p-12 text-center space-y-3 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]">
          <Clock3 className="w-10 h-10 text-slate-400 mx-auto" />
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-dashboard">
            {data.exam?.title}
          </h1>
          <p className="text-slate-500">{t("onlineExams.results.pendingRelease")}</p>
        </div>
      </div>
    );
  }

  const attempt = data.attempt;

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full min-w-0">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Link
          to={`/${school?.slug}/online-exams`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> {t("onlineExams.title")}
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
          {data.exam?.title}
        </h1>
        <p className="text-slate-500 font-medium">
          {t("onlineExams.results.statusLabel")}{" "}
          <span className="font-mono">{attempt.status}</span>
          {attempt.submitReason ? ` · ${attempt.submitReason}` : ""}
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: t("onlineExams.results.score"), value: `${attempt.score ?? 0}/${attempt.maxScore ?? 0}`, icon: null },
          { label: t("onlineExams.results.passed"), value: attempt.passedCount ?? 0, icon: CheckCircle2, tone: "emerald" },
          { label: t("onlineExams.results.missed"), value: attempt.missedCount ?? 0, icon: XCircle, tone: "rose" },
          { label: t("onlineExams.results.pendingEssays"), value: attempt.pendingCount ?? 0, icon: Clock3, tone: "slate" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3"
          >
            {s.icon && (
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  s.tone === "emerald"
                    ? "bg-emerald-50 text-emerald-600"
                    : s.tone === "rose"
                      ? "bg-rose-50 text-rose-600"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                <s.icon className="w-5 h-5" />
              </div>
            )}
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {attempt.violationCount > 0 && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-rose-800 text-sm inline-flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          {t("onlineExams.results.violationsRecorded")}{" "}
          <span className="font-mono">{attempt.violationCount}</span>
        </div>
      )}

      {/* Retake eligibility */}
      {data.retakeEligibility?.eligible && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-amber-800 text-sm inline-flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          {t("onlineExams.results.retakeAvailable", { attempt: data.retakeEligibility.nextAttemptNumber })}
          <Link
            to={`/${school?.slug}/online-exams/${data.exam?.id}/take`}
            className="ml-4 font-bold underline hover:text-amber-700"
          >
            {t("onlineExams.results.retakeNow")}
          </Link>
        </div>
      )}

      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
        <h2 className="font-extrabold tracking-tight text-slate-900">{t("onlineExams.results.questionReview")}</h2>
        <div className="space-y-4">
          {(data.questions || []).map((q: any, index: number) => {
            const pending = q.answer?.pending === true;
            const ok = q.answer?.isCorrect === true;
            return (
              <div
                key={q.id}
                className={`rounded-2xl border p-5 ${
                  pending
                    ? "border-slate-100 bg-slate-50"
                    : ok
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : "border-rose-100 bg-rose-50 text-rose-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-900">
                    <span className="font-mono text-slate-400 mr-2">Q{index + 1}</span>
                    <RichContent content={q.prompt} className="inline" />
                  </p>
                  <span className="text-xs font-mono text-slate-500 shrink-0">
                    {pending
                      ? t("common:pending")
                      : ok
                        ? `+${q.answer?.pointsAwarded ?? q.points}`
                        : "0"}
                  </span>
                </div>
                {q.answer?.textAnswer != null && q.answer.textAnswer !== "" && (
                  <p className="mt-2 text-sm text-slate-600">
                    <span>{t("onlineExams.results.yourAnswer", { text: "" }).trim()}{" "}</span>
                    <RichContent content={q.answer.textAnswer} className="text-slate-800" />
                  </p>
                )}
                {q.answer?.selectedChoiceId && (
                  <p className="mt-2 text-sm text-slate-600">
                    <span>{t("onlineExams.results.yourChoice")}:{" "}</span>
                    <RichContent
                      content={
                        q.choices?.find((c: any) => c.id === q.answer.selectedChoiceId)?.text || "—"
                      }
                      className="text-slate-800"
                    />
                  </p>
                )}
                {!pending && !ok && q.type === "FILL_BLANK" && q.correctAnswer && (
                  <p className="mt-1 text-sm text-emerald-700">
                    <RichContent content={q.correctAnswer} className="text-emerald-800" />
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* keep examId referenced for deep links */}
      <span className="sr-only">{examId}</span>
    </div>
  );
}
