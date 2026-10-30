/**
 * Shared kiosk chrome for the student online exam and the staff demo preview.
 *
 * Both TakePage and PreviewPage render the exact same one-question-at-a-time
 * experience; every visual affordance (question palette, save state, timer,
 * review sheet, pre-flight facts) lives here so the two stay in lockstep.
 */
import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Clock, Keyboard, Maximize, MonitorUp, ShieldAlert, WifiOff, Loader2, AlertTriangle } from "lucide-react";
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
  return idx === -1 ? questions.length - 1 : idx;
}

export function wordCount(text?: string | null) {
  const trimmed = (text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function chipState(i: number, currentIndex: number, answered: boolean) {
  if (i === currentIndex) return "current";
  return answered ? "answered" : "unanswered";
}

const CHIP_CLASS: Record<string, string> = {
  current: "bg-indigo-600 border-indigo-600 text-white shadow-[0_2px_6px_rgb(79,70,229,0.35)]",
  answered: "bg-emerald-100 border-emerald-300 text-emerald-700 hover:border-emerald-400",
  unanswered: "bg-slate-50 border-slate-300 text-slate-600 hover:border-indigo-300 hover:text-indigo-600",
};

export function QuestionPalette({
  questions,
  answers,
  currentIndex,
  onJump,
  disabled,
}: {
  questions: any[];
  answers: KioskAnswerMap;
  currentIndex: number;
  onJump: (index: number) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation(["pages"]);
  if (!questions.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {t("onlineExams.take.questionNav")}
        </p>
        <p className="text-[11px] text-slate-400">
          {t("onlineExams.take.answeredCount", {
            answered: questions.filter((q) => isQuestionAnswered(q, answers[q.id])).length,
            total: questions.length,
          })}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1" role="group">
        {questions.map((q: any, i: number) => {
          const state = chipState(i, currentIndex, isQuestionAnswered(q, answers[q.id]));
          return (
            <button
              key={q.id ?? i}
              type="button"
              disabled={disabled}
              aria-current={i === currentIndex ? "step" : undefined}
              aria-label={t("onlineExams.take.jumpToQuestion", { n: i + 1 })}
              title={t("onlineExams.take.jumpToQuestion", { n: i + 1 })}
              onClick={() => onJump(i)}
              className={`min-w-8 h-8 px-1.5 rounded-lg border text-xs font-bold tabular-nums transition-colors disabled:opacity-50 ${CHIP_CLASS[state]}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
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
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-mono font-extrabold ${
        remainingMs < 60_000
          ? "bg-rose-50 text-rose-700"
          : remainingMs < 5 * 60_000
            ? "bg-amber-50 text-amber-800"
            : "bg-slate-100 text-slate-800"
      }`}
    >
      <Clock className="w-4 h-4" />
      {formatRemaining(remainingMs)}
    </div>
  );
}

/** Thin elapsed-time bar pinned to the bottom edge of the sticky exam header. */
export function TimeProgress({ remainingMs, totalMs }: { remainingMs: number; totalMs: number }) {
  const pct =
    totalMs > 0 ? Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100)) : 0;
  const tone =
    remainingMs < 60_000 ? "bg-rose-500" : remainingMs < 5 * 60_000 ? "bg-amber-500" : "bg-indigo-500";
  return (
    <div className="h-1 w-full bg-slate-100" aria-hidden>
      <div className={`h-full ${tone} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ReviewSheet({
  open,
  questions,
  answers,
  currentIndex,
  onJump,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  questions: any[];
  answers: KioskAnswerMap;
  currentIndex: number;
  onJump: (index: number) => void;
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
            className="bg-white rounded-[28px] w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                {t("onlineExams.take.reviewTitle")}
              </h2>
              <p className="text-sm text-slate-500">
                {t("onlineExams.take.reviewSubtitle", { answered, total: questions.length })}
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

            <div className="flex flex-wrap gap-1.5">
              {questions.map((q: any, i: number) => {
                const state = chipState(i, currentIndex, isQuestionAnswered(q, answers[q.id]));
                return (
                  <button
                    key={q.id ?? i}
                    type="button"
                    aria-label={t("onlineExams.take.jumpToQuestion", { n: i + 1 })}
                    onClick={() => {
                      onJump(i);
                      onClose();
                    }}
                    className={`min-w-9 h-9 px-2 rounded-lg border text-sm font-bold tabular-nums transition-colors ${CHIP_CLASS[state]}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("onlineExams.take.reviewBack")}
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold px-5 py-2.5"
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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {facts.map((f) => (
        <div key={f.label} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{f.label}</p>
          <p className="text-sm font-extrabold text-slate-100 font-mono truncate">{f.value}</p>
        </div>
      ))}
    </div>
  );
}

export function SystemCheck({
  screenShareRequired,
  screenShareReady,
}: {
  screenShareRequired: boolean;
  screenShareReady: boolean;
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
    chips.push({
      key: "ss",
      ok: screenShareReady,
      icon: <MonitorUp className="w-3.5 h-3.5" />,
      label: screenShareReady
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

export function ShortcutHint() {
  const { t } = useTranslation(["pages"]);
  return (
    <p className="text-[11px] text-slate-500 inline-flex items-center gap-1.5">
      <Keyboard className="w-3.5 h-3.5" />
      {t("onlineExams.take.shortcutHint")}
    </p>
  );
}

export function PrevNextButtons({
  isFirst,
  isLast,
  canAdvance,
  onPrev,
  onNext,
  onFinish,
  submitting,
}: {
  isFirst: boolean;
  isLast: boolean;
  canAdvance: boolean;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
  submitting: boolean;
}) {
  const { t } = useTranslation(["pages", "common"]);
  return (
    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
      <button
        type="button"
        onClick={onPrev}
        disabled={isFirst}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">{t("onlineExams.take.prevQuestion")}</span>
      </button>
      {isLast ? (
        <button
          type="button"
          onClick={onFinish}
          disabled={submitting || !canAdvance}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {t("onlineExams.take.finishExam")}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={!canAdvance}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2"
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
