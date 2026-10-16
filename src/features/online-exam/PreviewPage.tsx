import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ClipboardCheck,
  Eye,
  Loader2,
  Send,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock3,
  RotateCcw,
} from "lucide-react";
import { onlineExamApi } from "./api";
import { RichContent } from "./RichContent";
import { confirmAction, alertError } from "../../lib/swal";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "react-i18next";

type AnswerMap = Record<
  string,
  { selectedChoiceId?: string | null; textAnswer?: string | null }
>;

type Phase = "loading" | "intro" | "exam" | "result" | "unavailable";

export default function OnlineExamPreviewPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { examId } = useParams();
  const { school } = useAuthStore();
  const isSample = !examId;

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [submitting, setSubmitting] = React.useState(false);
  const [exam, setExam] = React.useState<any>(null);
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [answers, setAnswers] = React.useState<AnswerMap>({});
  const [result, setResult] = React.useState<any>(null);

  const backTo = isSample
    ? `/${school?.slug}/online-exams`
    : `/${school?.slug}/exams/${examId}/online`;

  const navigate = useNavigate();

  const handleExit = async () => {
    const hasAnswers = Object.keys(answers).length > 0;
    if (hasAnswers) {
      const ok = await confirmAction({
        title: t("onlineExams.preview.exitConfirm"),
        text: t("onlineExams.preview.exitConfirmText"),
        confirmText: t("onlineExams.preview.exit"),
      });
      if (!ok) return;
    }
    navigate(backTo);
  };

  const loadPreview = React.useCallback(async () => {
    setPhase("loading");
    setResult(null);
    setAnswers({});
    try {
      const data = isSample
        ? await onlineExamApi.getSamplePreview()
        : await onlineExamApi.getExamPreview(examId as string);
      const list = Array.isArray(data?.questions) ? data.questions : [];
      setExam(data?.exam || null);
      setQuestions(list);
      setPhase(list.length ? "intro" : "unavailable");
    } catch (err: any) {
      await alertError(t("onlineExams.preview.loadFailed"), err?.message);
      setPhase("unavailable");
    }
  }, [examId, isSample, t]);

  React.useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const setAnswer = (questionId: string, value: AnswerMap[string]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    const ok = await confirmAction({
      title: t("onlineExams.preview.submitConfirm"),
      text: t("onlineExams.preview.submitConfirmText"),
      confirmText: t("onlineExams.preview.submit"),
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        selectedChoiceId: answers[q.id]?.selectedChoiceId ?? null,
        textAnswer: answers[q.id]?.textAnswer ?? null,
      }));
      const data = isSample
        ? await onlineExamApi.scoreSamplePreview(payload)
        : await onlineExamApi.scoreExamPreview(examId as string, payload);
      setResult(data);
      setPhase("result");
    } catch (err: any) {
      await alertError(t("onlineExams.preview.scoreFailed"), err?.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> {t("onlineExams.loading")}
      </div>
    );
  }

  if (phase === "unavailable") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-lg w-full rounded-[32px] border border-slate-800 bg-slate-900 p-8 space-y-4 text-center">
          <Eye className="w-10 h-10 text-slate-500 mx-auto" />
          <p className="text-slate-300">{t("onlineExams.preview.noQuestions")}</p>
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200"
          >
            <ArrowLeft className="w-4 h-4" /> {t("onlineExams.preview.backToAuthoring")}
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="max-w-lg w-full rounded-[32px] border border-slate-800 bg-slate-900 p-8 space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight font-dashboard">
                {exam?.title || t("onlineExams.preview.sampleTitle")}
              </h1>
              <p className="text-slate-400 text-sm">
                {t("onlineExams.questionsMin", {
                  count: questions.length,
                  minutes: exam?.duration ?? 0,
                })}
              </p>
            </div>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300 inline-flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> {t("onlineExams.preview.badge")}
          </p>
          <p className="text-sm text-slate-300">
            {isSample
              ? t("onlineExams.preview.introSample")
              : t("onlineExams.preview.introExam")}
          </p>
          {exam?.instructions && (
            <p className="text-sm text-slate-400 border border-slate-800 rounded-2xl p-4">
              {exam.instructions}
            </p>
          )}
          <button
            type="button"
            onClick={() => setPhase("exam")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl"
          >
            {t("onlineExams.preview.start")}
          </button>
          <Link
            to={backTo}
            className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4" /> {t("onlineExams.preview.exit")}
          </Link>
        </motion.div>
      </div>
    );
  }

  if (phase === "result" && result) {
    const attempt = result.attempt || {};
    const rQuestions = Array.isArray(result.questions) ? result.questions : questions;
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm inline-flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            {t("onlineExams.preview.resultNote")}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">
              {t("onlineExams.preview.resultTitle")}
            </h1>
            <p className="text-slate-500 font-medium">{result.exam?.title || exam?.title}</p>
          </div>

          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { label: t("onlineExams.results.score"), value: `${attempt.score ?? 0}/${attempt.maxScore ?? 0}` },
              { label: t("onlineExams.results.passed"), value: attempt.passedCount ?? 0, icon: CheckCircle2, tone: "emerald" },
              { label: t("onlineExams.results.missed"), value: attempt.missedCount ?? 0, icon: XCircle, tone: "rose" },
              { label: t("onlineExams.results.pendingEssays"), value: attempt.pendingCount ?? 0, icon: Clock3, tone: "slate" },
            ].map((s: any) => (
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
                <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
            <h2 className="font-extrabold tracking-tight text-slate-900">
              {t("onlineExams.results.questionReview")}
            </h2>
            <div className="space-y-4">
              {rQuestions.map((q: any, index: number) => {
                const pending = q.answer?.pending === true;
                const ok = q.answer?.isCorrect === true;
                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border p-5 ${
                      pending
                        ? "border-slate-100 bg-slate-50"
                        : ok
                          ? "border-emerald-100 bg-emerald-50/40"
                          : "border-rose-100 bg-rose-50/40"
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

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void loadPreview()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="w-4 h-4" /> {t("onlineExams.preview.tryAgain")}
            </button>
            <Link
              to={backTo}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3"
            >
              {t("onlineExams.preview.exit")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 select-none">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-extrabold tracking-tight text-slate-900">
              {exam?.title || t("onlineExams.preview.sampleTitle")}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                {t("onlineExams.preview.badge")}
              </p>
              {!!exam?.duration && (
                <span className="text-xs font-medium text-slate-500 inline-flex items-center gap-1">
                  <Clock3 className="w-3.5 h-3.5" />
                  {t("onlineExams.preview.timerNote")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleExit()}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("onlineExams.preview.exit")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t("onlineExams.preview.submit")}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {questions.map((q, index) => {
          const ans = answers[q.id] || {};
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-extrabold tracking-tight text-slate-900">
                  <span className="font-mono text-slate-400 mr-2">Q{index + 1}</span>
                  <RichContent content={q.prompt} className="inline" />
                </h2>
                <span className="text-xs font-mono text-slate-400 shrink-0">
                  {t("onlineExams.take.pointsShort", { count: q.points })}
                </span>
              </div>

              {(q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") && (
                <div className="space-y-2">
                  {(q.choices || []).map((c: any) => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer ${
                        ans.selectedChoiceId === c.id
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`preview-q-${q.id}`}
                        checked={ans.selectedChoiceId === c.id}
                        onChange={() => setAnswer(q.id, { selectedChoiceId: c.id })}
                      />
                      <span className="font-mono text-slate-400 text-sm w-6">{c.label}</span>
                      <RichContent content={c.text} className="text-slate-800" />
                    </label>
                  ))}
                </div>
              )}

              {q.type === "FILL_BLANK" && (
                <input
                  value={ans.textAnswer || ""}
                  onChange={(e) => setAnswer(q.id, { textAnswer: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  placeholder={t("onlineExams.take.yourAnswer")}
                  autoComplete="off"
                />
              )}

              {q.type === "ESSAY" && (
                <textarea
                  value={ans.textAnswer || ""}
                  onChange={(e) => setAnswer(q.id, { textAnswer: e.target.value })}
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  placeholder={t("onlineExams.take.writeAnswer")}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
