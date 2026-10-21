import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  MonitorUp,
  Pencil,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { onlineExamApi, type KioskConfig, type ProctorLevel } from "./api";
import {
  IntroFacts,
  PrevNextButtons,
  QuestionPalette,
  ReviewSheet,
  ShortcutHint,
  SystemCheck,
  TimeProgress,
  TimerPill,
  ViolationShield,
  WordCountBadge,
  firstUnansweredIndex,
  isQuestionAnswered,
  type KioskAnswerMap,
} from "./KioskUI";
import { RichContent } from "./RichContent";
import { SketchPad } from "./SketchPad";
import { SchoolLogo } from "../report-cards/components/pages/BifoldChrome";
import { confirmAction, alertError } from "../../lib/swal";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "react-i18next";

type AnswerMap = KioskAnswerMap;

type Phase = "loading" | "intro" | "exam" | "result" | "unavailable";
type FinishReason = "MANUAL" | "TIME_EXPIRED" | "MAX_VIOLATIONS";

const DEFAULT_KIOSK: KioskConfig = {
  requireFullscreen: true,
  requireScreenShare: false,
  maxViolations: 3,
  warnAt: 1,
  blockedEvents: ["EXIT_FULLSCREEN", "TAB_BLUR", "VISIBILITY_HIDDEN", "COPY_ATTEMPT"],
  allowReconnect: true,
};

function sumPoints(list: any[]) {
  return list.reduce((acc, q) => acc + (Number(q?.points) || 0), 0);
}

/**
 * Staff demo of the student online-exam experience.
 *
 * Renders the exact same kiosk flow as TakePage (pre-flight consent, fullscreen,
 * live timer, one question at a time, violation counting with warn/auto-submit,
 * screen-share consent) but scores through the preview APIs, so no attempt,
 * answer, violation, notification, or grade row is ever created.
 */
export default function OnlineExamPreviewPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { examId } = useParams();
  const { school } = useAuthStore();
  const isSample = !examId;
  const navigate = useNavigate();

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [submitting, setSubmitting] = React.useState(false);
  const [exam, setExam] = React.useState<any>(null);
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [answers, setAnswers] = React.useState<AnswerMap>({});
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [result, setResult] = React.useState<any>(null);

  const [kioskConfig, setKioskConfig] = React.useState<KioskConfig>(DEFAULT_KIOSK);
  const [proctorLevel, setProctorLevel] = React.useState<ProctorLevel>("MONITOR");
  const [consentChecked, setConsentChecked] = React.useState(false);
  const [screenShareConsented, setScreenShareConsented] = React.useState(false);

  const [endsAtMs, setEndsAtMs] = React.useState(0);
  const [remainingMs, setRemainingMs] = React.useState(0);
  const [totalMs, setTotalMs] = React.useState(0);
  const [violationCount, setViolationCount] = React.useState(0);
  const [warning, setWarning] = React.useState<string | null>(null);
  const [warnLevel, setWarnLevel] = React.useState<"info" | "danger">("info");
  const [screenSharing, setScreenSharing] = React.useState(false);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [sketchOpen, setSketchOpen] = React.useState(false);

  const answersRef = React.useRef(answers);
  answersRef.current = answers;
  const violationRef = React.useRef(0);
  const finishingRef = React.useRef(false);
  const expiryRef = React.useRef(false);
  const countViolationRef = React.useRef<(type: string) => void>(() => undefined);
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const captureVideoRef = React.useRef<HTMLVideoElement | null>(null);
  /** Arrow-key navigation without re-binding the kiosk listener on every render. */
  const navRef = React.useRef<(direction: 1 | -1) => void>(() => undefined);

  const capturesScreen = proctorLevel === "SCREEN_VIEW";
  const needsScreenConsent = kioskConfig.requireScreenShare || capturesScreen;

  const backTo = isSample
    ? `/${school?.slug}/online-exams`
    : `/${school?.slug}/exams/${examId}/online`;

  const examTitle = exam?.title || t("onlineExams.preview.sampleTitle");

  const enterFullscreen = React.useCallback(async () => {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch {
      /* browser may block; preview continues like the real kiosk */
    }
  }, []);

  const attachCaptureVideo = React.useCallback((stream: MediaStream) => {
    let el = captureVideoRef.current;
    if (!el) {
      el = document.createElement("video");
      el.muted = true;
      el.playsInline = true;
      captureVideoRef.current = el;
    }
    if (el.srcObject !== stream) {
      el.srcObject = stream;
      void el.play().catch(() => undefined);
    }
  }, []);

  const stopScreenShare = React.useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    if (captureVideoRef.current) {
      captureVideoRef.current.srcObject = null;
      captureVideoRef.current = null;
    }
    setScreenSharing(false);
  }, []);

  React.useEffect(() => () => stopScreenShare(), [stopScreenShare]);

  const beginScreenShare = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      attachCaptureVideo(stream);
      setScreenSharing(true);
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setScreenSharing(false);
        screenStreamRef.current = null;
        captureVideoRef.current = null;
        countViolationRef.current("SCREEN_SHARE_STOPPED");
      });
      return true;
    } catch {
      return false;
    }
  }, [attachCaptureVideo]);

  const loadPreview = React.useCallback(async () => {
    setPhase("loading");
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
    setViolationCount(0);
    violationRef.current = 0;
    setWarning(null);
    setWarnLevel("info");
    setRemainingMs(0);
    setEndsAtMs(0);
    setTotalMs(0);
    setReviewOpen(false);
    setSketchOpen(false);
    finishingRef.current = false;
    expiryRef.current = false;
    setConsentChecked(false);
    setScreenShareConsented(false);
    try {
      const data = isSample
        ? await onlineExamApi.getSamplePreview()
        : await onlineExamApi.getExamPreview(examId as string);
      const list = Array.isArray(data?.questions) ? data.questions : [];
      setExam(data?.exam || null);
      setQuestions(list);
      if (data?.exam?.kioskConfig) {
        setKioskConfig({ ...DEFAULT_KIOSK, ...data.exam.kioskConfig });
      } else {
        setKioskConfig({ ...DEFAULT_KIOSK, maxViolations: data?.exam?.maxViolations ?? 3 });
      }
      if (data?.exam?.proctorLevel) setProctorLevel(data.exam.proctorLevel);
      setCurrentIndex(firstUnansweredIndex(list, {}));
      setPhase(list.length ? "intro" : "unavailable");
    } catch (err: any) {
      await alertError(t("onlineExams.preview.loadFailed"), err?.message);
      setPhase("unavailable");
    }
  }, [examId, isSample, t]);

  React.useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  /** Score the preview answers — the only server call during the exam phase. */
  const scoreAndFinish = React.useCallback(
    async (reason: FinishReason) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setSubmitting(true);
      try {
        const payload = questions.map((q) => ({
          questionId: q.id,
          selectedChoiceId: answersRef.current[q.id]?.selectedChoiceId ?? null,
          textAnswer: answersRef.current[q.id]?.textAnswer ?? null,
        }));
        const data = isSample
          ? await onlineExamApi.scoreSamplePreview(payload)
          : await onlineExamApi.scoreExamPreview(examId as string, payload);
        data.attempt = {
          ...data.attempt,
          violationCount: violationRef.current,
          submitReason: reason === "MANUAL" ? "PREVIEW" : reason,
        };
        setResult(data);
        setPhase("result");
        stopScreenShare();
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => undefined);
        }
      } catch (err: any) {
        finishingRef.current = false;
        await alertError(t("onlineExams.preview.scoreFailed"), err?.message);
      } finally {
        setSubmitting(false);
      }
    },
    [questions, isSample, examId, stopScreenShare, t]
  );

  const countViolation = React.useCallback(
    (type: string) => {
      if (phase !== "exam") return;
      if (!(kioskConfig.blockedEvents as string[]).includes(type)) return;
      const next = violationRef.current + 1;
      violationRef.current = next;
      setViolationCount(next);
      const max = kioskConfig.maxViolations;
      if (max > 0 && next >= max) {
        setWarnLevel("danger");
        setWarning(t("onlineExams.take.maxViolationsReached"));
        void scoreAndFinish("MAX_VIOLATIONS");
        return;
      }
      const warnAt = kioskConfig.warnAt > 0 ? kioskConfig.warnAt : 1;
      setWarnLevel(next >= warnAt ? "danger" : "info");
      setWarning(
        t("onlineExams.take.violationWarning", { count: next, max: max || next })
      );
      void enterFullscreen();
    },
    [phase, kioskConfig, scoreAndFinish, enterFullscreen, t]
  );

  countViolationRef.current = countViolation;

  // Live countdown; expiry auto-submits like the real server-side timer.
  React.useEffect(() => {
    if (phase !== "exam" || !endsAtMs) return;
    const tick = () => {
      const left = endsAtMs - Date.now();
      setRemainingMs(left);
      if (left <= 0 && !expiryRef.current) {
        expiryRef.current = true;
        void scoreAndFinish("TIME_EXPIRED");
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phase, endsAtMs, scoreAndFinish]);

  // Kiosk listeners — identical event set to TakePage, counted locally.
  React.useEffect(() => {
    if (phase !== "exam") return;

    const onFs = () => {
      if (!document.fullscreenElement) countViolationRef.current("EXIT_FULLSCREEN");
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") countViolationRef.current("VISIBILITY_HIDDEN");
    };
    const onBlur = () => countViolationRef.current("TAB_BLUR");
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      countViolationRef.current("CONTEXT_MENU");
    };
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      countViolationRef.current("COPY_ATTEMPT");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        void enterFullscreen();
      }
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || !!target.isContentEditable);
      if (!typing && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        navRef.current(e.key === "ArrowRight" ? 1 : -1);
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "x", "p", "s"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        countViolationRef.current("COPY_ATTEMPT");
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [phase, enterFullscreen]);

  const beginPreview = async () => {
    if (!consentChecked || submitting) return;
    if (needsScreenConsent && !screenShareConsented) return;
    setSubmitting(true);
    try {
      await enterFullscreen();
      if (needsScreenConsent && !screenSharing) {
        const ok = await beginScreenShare();
        if (!ok) {
          await alertError(
            t("onlineExams.take.startFailed"),
            t("onlineExams.take.screenShareRequired")
          );
          return;
        }
      }
      const minutes = Number(exam?.duration) || 0;
      if (minutes > 0) {
        let ends = Date.now() + minutes * 60_000;
        const examEnd = exam?.endDate ? new Date(exam.endDate).getTime() : 0;
        if (examEnd > Date.now()) ends = Math.min(ends, examEnd);
        setEndsAtMs(ends);
        setRemainingMs(ends - Date.now());
        setTotalMs(ends - Date.now());
      } else {
        setEndsAtMs(0);
        setTotalMs(0);
      }
      violationRef.current = 0;
      setViolationCount(0);
      setWarning(null);
      setWarnLevel("info");
      finishingRef.current = false;
      expiryRef.current = false;
      setCurrentIndex(firstUnansweredIndex(questions, answersRef.current));
      setPhase("exam");
    } finally {
      setSubmitting(false);
    }
  };

  /** Runs from the review sheet — the sheet itself is the confirm step. */
  const handleSubmit = async () => {
    setReviewOpen(false);
    await scoreAndFinish("MANUAL");
  };

  const handleExit = async () => {
    if (phase === "exam" && Object.keys(answersRef.current).length > 0) {
      const ok = await confirmAction({
        title: t("onlineExams.preview.exitConfirm"),
        text: t("onlineExams.preview.exitConfirmText"),
        confirmText: t("onlineExams.preview.exit"),
      });
      if (!ok) return;
    }
    stopScreenShare();
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }
    navigate(backTo);
  };

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] || {} : {};
  const currentAnswered = currentQuestion
    ? isQuestionAnswered(currentQuestion, currentAnswer)
    : false;
  const isLastQuestion = questions.length === 0 || currentIndex >= questions.length - 1;

  const goNextQuestion = () => {
    if (!currentAnswered) return;
    setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
  };

  const goPrevQuestion = () => setCurrentIndex((i) => Math.max(0, i - 1));

  navRef.current = (direction: 1 | -1) => {
    if (direction === 1) goNextQuestion();
    else goPrevQuestion();
  };

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> {t("onlineExams.take.preparing")}
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
            <div className="shrink-0 rounded-2xl overflow-hidden bg-white p-1.5 border border-slate-800">
              <SchoolLogo url={school?.logoUrl} size="md" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 truncate">
                {school?.name}
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight font-dashboard truncate">
                {examTitle}
              </h1>
              <p className="text-slate-400 text-sm">{t("onlineExams.take.secureIntro")}</p>
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

          <IntroFacts
            duration={Number(exam?.duration) || 0}
            questionCount={questions.length}
            totalPoints={sumPoints(questions)}
            maxViolations={kioskConfig.maxViolations}
            proctorLevel={proctorLevel}
            windowStart={exam?.startDate || null}
            windowEnd={exam?.endDate || null}
          />

          <SystemCheck
            screenShareRequired={needsScreenConsent}
            screenShareReady={screenSharing}
          />

          <ul className="text-sm text-slate-300 space-y-2 list-disc pl-5">
            {kioskConfig.requireFullscreen && <li>{t("onlineExams.take.secureBullets.fullscreen")}</li>}
            {needsScreenConsent && (
              <li className="flex items-start gap-2">
                <MonitorUp className="w-4 h-4 mt-0.5 shrink-0 text-indigo-300" />
                {t("onlineExams.take.secureBullets.screenShare")}
              </li>
            )}
            <li>
              {t("onlineExams.take.secureBullets.violations", {
                suffix:
                  kioskConfig.maxViolations > 0
                    ? t("onlineExams.take.secureBullets.violationsSuffix", {
                        max: kioskConfig.maxViolations,
                      })
                    : "",
              })}
            </li>
            <li>{t("onlineExams.take.secureBullets.timer")}</li>
          </ul>

          <p className="text-xs text-slate-500 border border-slate-800 rounded-2xl p-4 leading-relaxed">
            {t("onlineExams.take.lockdownLimitations")}
          </p>

          {exam?.instructions && (
            <p className="text-sm text-slate-400 border border-slate-800 rounded-2xl p-4">
              {exam.instructions}
            </p>
          )}

          <label className="flex items-start gap-3 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-500"
            />
            <span>{t("onlineExams.take.consentLabel")}</span>
          </label>

          {needsScreenConsent && (
            <label className="flex items-start gap-3 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={screenShareConsented}
                onChange={(e) => setScreenShareConsented(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-indigo-500"
              />
              <span>{t("onlineExams.take.screenShareConsentLabel")}</span>
            </label>
          )}

          <button
            type="button"
            onClick={() => void beginPreview()}
            disabled={
              !consentChecked || submitting || (needsScreenConsent && !screenShareConsented)
            }
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl inline-flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <Play className="w-4 h-4" />
            {t("onlineExams.take.agreeAndBegin")}
          </button>

          <button
            type="button"
            onClick={() => void handleExit()}
            className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4" /> {t("onlineExams.preview.exit")}
          </button>
        </motion.div>
      </div>
    );
  }

  if (phase === "result" && result) {
    const attempt = result.attempt || {};
    const rQuestions = Array.isArray(result.questions) ? result.questions : questions;
    const previewViolations = attempt.violationCount ?? 0;
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

          {previewViolations > 0 && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-rose-800 text-sm inline-flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              {t("onlineExams.results.violationsRecorded")}{" "}
              <span className="font-mono">{previewViolations}</span>
            </div>
          )}

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
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-extrabold tracking-tight text-slate-900 truncate">{examTitle}</p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                {t("onlineExams.preview.badge")}
              </span>
            </div>
            <ViolationShield count={violationCount} max={kioskConfig.maxViolations} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {endsAtMs > 0 && <TimerPill remainingMs={remainingMs} />}
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
              onClick={() => setReviewOpen(true)}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t("common:submit")}
            </button>
          </div>
        </div>
        {warning && (
          <div
            className={`${
              warnLevel === "danger" ? "bg-rose-600" : "bg-amber-500"
            } text-white text-center text-sm font-medium py-2`}
          >
            {warning}
          </div>
        )}
        {needsScreenConsent && screenSharing && (
          <div className="bg-slate-900 text-emerald-300 text-center text-xs font-mono py-1">
            ● {t("onlineExams.take.screenSharingActive")}
          </div>
        )}
        <TimeProgress remainingMs={remainingMs} totalMs={totalMs} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-600">
            {t("onlineExams.take.questionProgress", {
              current: questions.length ? currentIndex + 1 : 0,
              total: questions.length,
            })}
          </p>
          <ShortcutHint />
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{
              width: questions.length
                ? `${((currentIndex + 1) / questions.length) * 100}%`
                : "0%",
            }}
          />
        </div>

        <QuestionPalette
          questions={questions}
          answers={answers}
          currentIndex={currentIndex}
          onJump={(i) => setCurrentIndex(i)}
        />

        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-extrabold tracking-tight text-slate-900">
                  <span className="font-mono text-slate-400 mr-2">
                    Q{currentIndex + 1}
                  </span>
                  <RichContent content={currentQuestion.prompt} className="inline" />
                </h2>
                <span className="text-xs font-mono text-slate-400 shrink-0">
                  {t("onlineExams.take.pointsShort", { count: currentQuestion.points })}
                </span>
              </div>

              {(currentQuestion.type === "MULTIPLE_CHOICE" ||
                currentQuestion.type === "TRUE_FALSE") && (
                <div className="space-y-2">
                  {(currentQuestion.choices || []).map((c: any) => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer ${
                        currentAnswer.selectedChoiceId === c.id
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`preview-q-${currentQuestion.id}`}
                        checked={currentAnswer.selectedChoiceId === c.id}
                        onChange={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestion.id]: { selectedChoiceId: c.id },
                          }))
                        }
                      />
                      <span className="font-mono text-slate-400 text-sm w-6">{c.label}</span>
                      <RichContent content={c.text} className="text-slate-800" />
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === "FILL_BLANK" && (
                <input
                  value={currentAnswer.textAnswer || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: { textAnswer: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  placeholder={t("onlineExams.take.yourAnswer")}
                  autoComplete="off"
                />
              )}

              {currentQuestion.type === "ESSAY" && (
                <div className="space-y-1">
                  <textarea
                    value={currentAnswer.textAnswer || ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQuestion.id]: { textAnswer: e.target.value },
                      }))
                    }
                    rows={6}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                    placeholder={t("onlineExams.take.writeAnswer")}
                  />
                  <WordCountBadge text={currentAnswer.textAnswer} />
                  <button
                    type="button"
                    onClick={() => setSketchOpen(true)}
                    title={t("onlineExams.take.roughWorkHint")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {t("onlineExams.take.roughWork")}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-sm text-slate-500">
            {currentAnswered
              ? t("onlineExams.take.answerRecorded")
              : t("onlineExams.take.answerToContinue")}
          </p>
          <PrevNextButtons
            isFirst={currentIndex <= 0}
            isLast={isLastQuestion}
            canAdvance={currentAnswered}
            onPrev={goPrevQuestion}
            onNext={goNextQuestion}
            onFinish={() => setReviewOpen(true)}
            submitting={submitting}
          />
        </div>
      </div>

      <ReviewSheet
        open={reviewOpen}
        questions={questions}
        answers={answers}
        currentIndex={currentIndex}
        onJump={(i) => setCurrentIndex(i)}
        onClose={() => setReviewOpen(false)}
        onSubmit={() => void handleSubmit()}
        submitting={submitting}
      />

      <SketchPad
        open={sketchOpen}
        onClose={() => setSketchOpen(false)}
        onInsert={() => setSketchOpen(false)}
        labels={{
          title: t("onlineExams.take.roughWork"),
          hint: t("onlineExams.take.roughWorkHint"),
          insert: t("onlineExams.take.roughWorkDone"),
          clear: t("onlineExams.author.math.sketch.clear"),
          undo: t("onlineExams.author.math.sketch.undo"),
          pen: t("onlineExams.author.math.sketch.pen"),
          eraser: t("onlineExams.author.math.sketch.eraser"),
          line: t("onlineExams.author.math.sketch.line"),
          arrow: t("onlineExams.author.math.sketch.arrow"),
          rect: t("onlineExams.author.math.sketch.rect"),
          ellipse: t("onlineExams.author.math.sketch.ellipse"),
        }}
      />
    </div>
  );
}
