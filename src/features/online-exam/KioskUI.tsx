/**
 * Shared kiosk chrome for the student online exam and the staff demo preview.
 *
 * Forward-only, single-question-at-a-time experience with exam-paper styling
 * cues (navy/white hierarchy) and no backtrack/jump navigation.
 */
import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Clock, Maximize, MonitorUp, ShieldAlert, WifiOff, Loader2, AlertTriangle, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatRemaining } from "./types";

export type KioskAnswer = { selectedChoiceId?: string | null; textAnswer?: string | null };
export type KioskAnswerMap = Record<string, KioskAnswer>;
export type SaveState = "idle" | "saving" | "saved" | "error";

export function isQuestionAnswered(question: any, answer?: KioskAnswer | null) {
  if (!answer) return false;
  if (question?.type === "MULTIPLE_CHOICE" || question?.type === "TRUE_FALSE") {
    return Boolean(answer.selectedChoiceId);
  }
  return Boolean(answer.textAnswer && answer.textAnswer.trim().length > 0);
}

export function firstUnansweredIndex(questions: any[], answers: KioskAnswerMap) {
  if (!questions.length) return 0;
  const idx = questions.findIndex((q) => !isQuestionAnswered(q, answers[q.id]));
  return idx === -1 ? Math.max(0, questions.length - 1) : idx;
}

export function wordCount(text?: string | null) {
  const trimmed = (text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Read-only progress: shows reached/total and answered count, no navigation. */
export function QuestionProgress({
  questions,
  answers,
  currentIndex,
  maxReachedIndex,
}: {
  questions: any[];
  answers: KioskAnswerMap;
  currentIndex: number;
  maxReachedIndex: number;
}) {
  const { t } = useTranslation(["pages"]);
  if (!questions.length) return null;
  const answered = questions.filter((q) => isQuestionAnswered(q, answers[q.id])).length;
  const reached = Math.min(Math.max(maxReachedIndex + 1, 1), questions.length);
  const pct = questions.length ? Math.round((reached / questions.length) * 100) : 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 space-y-2 shadow-[0_1px_2px_rgb(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#1e3a5f]">
          {t("onlineExams.take.progressTitle", "Exam progress")}
        </p>
        <p className="text-xs font-semibold text-slate-600">
          {t("onlineExams.take.questionProgress", {
            current: questions.length ? currentIndex + 1 : 0,
            total: questions.length,
          })}
        </p>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
        <div
          className="h-full rounded-full bg-[#1e3a5f] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="font-semibold">
          {t("onlineExams.take.answeredCount", { answered, total: questions.length })}
        </span>
        <span>{t("onlineExams.take.reachedCount", "{{reached}} of {{total}} reached", { reached, total: questions.length })}</span>
      </div>
      <p className="text-[11px] text-slate-500 inline-flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 mt-0.5 text-[#1e3a5f] shrink-0" />
        {t("onlineExams.take.forwardOnlyHint", "You can move forward only. Once you continue, you cannot return to previous questions.")}
      </p>
    </div>
  );
}

export function SaveIndicator({
  state,
  savedAt,
  offline,
}: {
  state: SaveState;
  savedAt?: number | null;
  offline?: boolean;
}) {
  const { t } = useTranslation(["pages"]);
  if (offline) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 text-[11px] font-bold">
        <WifiOff className="w-3.5 h-3.5" />
        {t("onlineExams.take.reconnecting")}
      </span>
    );
  }
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 text-slate-600 px-2.5 py-1 text-[11px] font-bold">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {t("onlineExams.take.saving")}
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 text-[11px] font-bold">
        <AlertTriangle className="w-3.5 h-3.5" />
        {t("onlineExams.take.saveFailed")}
      </span>
    );
  }
  if (state === "saved" && savedAt) {
    const time = new Date(savedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 text-[11px] font-bold"
        title={t("onlineExams.take.savedAt", { time })}
      >
        <Check className="w-3.5 h-3.5" />
        {t("onlineExams.take.saved")}
      </span>
    );
  }
  return null;
}

export function ViolationShield({ count, max }: { count: number; max: number }) {
  const { t } = useTranslation(["pages"]);
  const showDots = max > 0 && max <= 6;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`${t("onlineExams.take.violations")}: ${count}${max > 0 ? ` / ${max}` : ""}`}
    >
      <ShieldAlert className={`w-4 h-4 ${count > 0 ? "text-rose-500" : "text-slate-400"}`} />
      {showDots && (
        <span className="flex items-center gap-1" aria-hidden>
          {Array.from({ length: max }).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${i < count ? "bg-rose-500" : "bg-slate-300"}`}
            />
          ))}
        </span>
      )}
      <span className="font-mono text-xs font-bold text-slate-500">
        {count}
        {max > 0 ? `/${max}` : ""}
      </span>
    </span>
  );
}

export function TimerPill({ remainingMs }: { remainingMs: number }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-mono font-extrabold border ${
        remainingMs < 60_000
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : remainingMs < 5 * 60_000
            ? "bg-amber-50 text-amber-800 border-amber-200"
            : "bg-slate-50 text-slate-800 border-slate-200"
      }`}
    >
      <Clock className="w-4 h-4" />
      {formatRemaining(remainingMs)}
    </div>
  );
}

export function TimeProgress({ remainingMs, totalMs }: { remainingMs: number; totalMs: number }) {
  const pct =
    totalMs > 0 ? Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100)) : 0;
  const tone =
    remainingMs < 60_000 ? "bg-rose-500" : remainingMs < 5 * 60_000 ? "bg-amber-500" : "bg-[#1e3a5f]";
  return (
    <div className="h-1.5 w-full bg-slate-100" aria-hidden>
      <div className={`h-full ${tone} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Read-only pre-submit summary sheet (no question jumping/back navigation). */
export function SubmitSummarySheet({
  open,
  questions,
  answers,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  questions: any[];
  answers: KioskAnswerMap;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const { t } = useTranslation(["pages", "common"]);
  const answered = questions.filter((q) => isQuestionAnswered(q, answers[q.id])).length;
  const unanswered = questions.length - answered;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[28px] w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto border border-slate-200"
          >
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold tracking-tight text-[#1e3a5f]">
                {t("onlineExams.take.reviewTitle", "Submit exam")}
              </h2>
              <p className="text-sm text-slate-600">
                {t("onlineExams.take.reviewSubtitle", { answered, total: questions.length })}
              </p>
              <p className="text-xs text-slate-500">
                {t("onlineExams.take.forwardOnlySubmitNote", "Review your progress below, then submit. You cannot go back to earlier questions.")}
              </p>
            </div>

            {unanswered > 0 ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm font-medium text-amber-800 inline-flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {t("onlineExams.take.reviewUnanswered", { count: unanswered })}
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-800 inline-flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                {t("onlineExams.take.reviewAllAnswered")}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700">{t("onlineExams.take.summaryHeading", "Submission summary")}</p>
              <p>{t("onlineExams.take.summaryAnswered", "Answered: {{answered}} of {{total}}", { answered, total: questions.length })}</p>
              {unanswered > 0 && <p>{t("onlineExams.take.summaryUnanswered", "Unanswered: {{count}}", { count: unanswered })}</p>}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                {t("onlineExams.take.summaryClose", "Close")}
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] hover:bg-[#172e4a] disabled:opacity-60 text-white font-bold px-5 py-2.5"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t("onlineExams.take.reviewSubmit")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function IntroFacts({
  duration,
  questionCount,
  totalPoints,
  maxViolations,
  proctorLevel,
  windowStart,
  windowEnd,
}: {
  duration?: number | null;
  questionCount: number;
  totalPoints?: number | null;
  maxViolations: number;
  proctorLevel: string;
  windowStart?: string | null;
  windowEnd?: string | null;
}) {
  const { t } = useTranslation(["pages"]);
  const proctorKey =
    proctorLevel === "SCREEN_VIEW"
      ? "screenView"
      : proctorLevel === "MONITOR"
        ? "monitor"
        : "off";
  const facts: { label: string; value: string }[] = [
    { label: t("onlineExams.take.factsQuestions"), value: String(questionCount) },
    {
      label: t("onlineExams.take.factsDuration"),
      value: t("onlineExams.take.factsMinutes", { count: duration ?? 0 }),
    },
    { label: t("onlineExams.take.factsPoints"), value: String(totalPoints ?? 0) },
    {
      label: t("onlineExams.take.factsIntegrity"),
      value: maxViolations > 0 ? String(maxViolations) : t("onlineExams.take.factsUnlimited"),
    },
    {
      label: t("onlineExams.take.factsProctoring"),
      value: t(`onlineExams.author.proctorLevelOptions.${proctorKey}`),
    },
  ];
  if (windowStart && windowEnd) {
    facts.push({
      label: t("onlineExams.take.factsWindow"),
      value: `${new Date(windowStart).toLocaleDateString()} – ${new Date(windowEnd).toLocaleDateString()}`,
    });
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
      {facts.map((f) => (
        <div key={f.label} className="rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-2 sm:px-3 sm:py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{f.label}</p>
          <p className="text-sm font-extrabold text-slate-100 font-mono truncate">{f.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ExamRules({
  requireFullscreen,
  needsScreenConsent,
  maxViolations,
}: {
  requireFullscreen: boolean;
  needsScreenConsent: boolean;
  maxViolations: number;
}) {
  const { t } = useTranslation(["pages"]);
  return (
    <div className="space-y-3">
      <ul className="text-xs sm:text-sm text-slate-300 space-y-1.5 list-disc pl-5">
        {requireFullscreen && <li>{t("onlineExams.take.secureBullets.fullscreen")}</li>}
        {needsScreenConsent && <li>{t("onlineExams.take.secureBullets.screenShare", "You must share this exam tab/window for the whole sitting when required.")}</li>}
        <li>{t("onlineExams.take.secureBullets.forwardOnly", "Questions are shown one at a time and you can move forward only.")}</li>
        <li>
          {t("onlineExams.take.secureBullets.violations", {
            suffix:
              maxViolations > 0
                ? t("onlineExams.take.secureBullets.violationsSuffix", {
                    max: maxViolations,
                  })
                : "",
          })}
        </li>
        <li>{t("onlineExams.take.secureBullets.timer")}</li>
      </ul>
      <p className="text-xs text-slate-500 border border-slate-800 rounded-2xl p-3 sm:p-4 leading-relaxed">
        {t("onlineExams.take.lockdownLimitations")}
      </p>
      {needsScreenConsent && (
        <p className="text-xs text-slate-400 border border-slate-800 rounded-2xl p-3 sm:p-4 leading-relaxed">
          {t("onlineExams.take.screenShareBrowserNote", "Your browser controls the screen-share picker and may show a sharing indicator. This app cannot hide or suppress it. If you stop sharing or share the wrong screen, the exam will be ended according to policy.")}
        </p>
      )}
    </div>
  );
}

export function ExamRulesBlock(props: {
  requireFullscreen: boolean;
  needsScreenConsent: boolean;
  maxViolations: number;
}) {
  const { t } = useTranslation(["pages"]);
  return (
    <>
      <div className="hidden sm:block">
        <ExamRules {...props} />
      </div>
      <details className="sm:hidden rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-300">
          {t("onlineExams.take.rulesTitle")}
        </summary>
        <div className="pt-3">
          <ExamRules {...props} />
        </div>
      </details>
    </>
  );
}

export function SystemCheck({
  screenShareRequired,
  screenShareReady,
  screenShareSupported,
}: {
  screenShareRequired: boolean;
  screenShareReady: boolean;
  screenShareSupported?: boolean;
}) {
  const { t } = useTranslation(["pages"]);
  const fsSupported =
    typeof document !== "undefined" && typeof document.documentElement.requestFullscreen === "function";
  const chips: { key: string; ok: boolean; icon: React.ReactNode; label: string }[] = [
    {
      key: "fs",
      ok: fsSupported,
      icon: <Maximize className="w-3.5 h-3.5" />,
      label: fsSupported ? t("onlineExams.take.fsReady") : t("onlineExams.take.fsUnavailable"),
    },
  ];
  if (screenShareRequired) {
    const supported = screenShareSupported !== false;
    const ok = supported && screenShareReady;
    chips.push({
      key: "ss",
      ok,
      icon: <MonitorUp className="w-3.5 h-3.5" />,
      label: !supported
        ? t("onlineExams.take.screenShareUnavailable", "Screen sharing unavailable")
        : screenShareReady
          ? t("onlineExams.take.screenShareReady")
          : t("onlineExams.take.screenShareRequiredChip"),
    });
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {t("onlineExams.take.systemCheck")}
      </span>
      {chips.map((c) => (
        <span
          key={c.key}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
            c.ok
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}
        >
          {c.icon}
          {c.label}
        </span>
      ))}
    </div>
  );
}

export function ForwardNavButton({
  isLast,
  canAdvance,
  onNext,
  onFinish,
  submitting,
}: {
  isLast: boolean;
  canAdvance: boolean;
  onNext: () => void;
  onFinish: () => void;
  submitting: boolean;
}) {
  const { t } = useTranslation(["pages", "common"]);
  return (
    <div className="flex items-center justify-end w-full">
      {isLast ? (
        <button
          type="button"
          onClick={onFinish}
          disabled={submitting || !canAdvance}
          className="bg-[#1e3a5f] hover:bg-[#172e4a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2 shadow-sm"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {t("onlineExams.take.finishExam")}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={!canAdvance}
          className="bg-[#1e3a5f] hover:bg-[#172e4a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2 shadow-sm"
        >
          {t("onlineExams.take.nextQuestion")}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function WordCountBadge({ text }: { text?: string | null }) {
  const { t } = useTranslation(["pages"]);
  return (
    <p className="text-[11px] text-slate-400 font-mono text-right">
      {t("onlineExams.take.wordCount", { count: wordCount(text) })}
    </p>
  );
}
