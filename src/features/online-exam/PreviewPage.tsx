import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  Pencil,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { onlineExamApi, type KioskConfig, type ProctorLevel } from "./api";
import {
  ExamRulesBlock,
  IntroFacts,
  QuestionProgress,
  SubmitSummarySheet,
  ForwardNavButton,
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
import {
  requestExamTabStream,
  stopMediaStream,
  attachStreamToVideo,
  examTabShareSupported,
  isStreamLive,
} from "./screenShare";

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

function questionTypeLabel(type: string, t: any) {
  if (type === "MULTIPLE_CHOICE") return t("onlineExams.types.multipleChoice", "Multiple choice");
  if (type === "TRUE_FALSE") return t("onlineExams.types.trueFalse", "True/False");
  if (type === "FILL_BLANK") return t("onlineExams.types.fillBlank", "Fill in the blank");
  if (type === "ESSAY") return t("onlineExams.types.essay", "Essay");
  return String(type || "");
}

export default function OnlineExamPreviewPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { examId, demoToken } = useParams();
  const { school } = useAuthStore();
  const isDemo = !!demoToken;
  const isSample = !examId && !isDemo;
  const navigate = useNavigate();

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [submitting, setSubmitting] = React.useState(false);
  const [exam, setExam] = React.useState<any>(null);
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [answers, setAnswers] = React.useState<AnswerMap>({});
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [maxReachedIndex, setMaxReachedIndex] = React.useState(0);
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
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const captureVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const screenShareSupported = examTabShareSupported();

  const capturesScreen = proctorLevel === "SCREEN_VIEW";
  const needsScreenConsent = kioskConfig.requireScreenShare || capturesScreen;

  const backTo =
    isSample || isDemo
      ? `/${school?.slug}/online-exams`
      : `/${school?.slug}/exams/${examId}/online`;
  const examTitle = exam?.title || t("onlineExams.preview.sampleTitle");

  const enterFullscreen = React.useCallback(async () => {
    if (!kioskConfig.requireFullscreen) return;
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch {
      /* browser may block; preview continues like the real kiosk */
    }
  }, [kioskConfig.requireFullscreen]);

  const stopScreenShare = React.useCallback(() => {
    stopMediaStream(screenStreamRef.current);
    screenStreamRef.current = null;
    if (captureVideoRef.current) {
      try { captureVideoRef.current.srcObject = null; } catch {}
      captureVideoRef.current = null;
    }
    setScreenSharing(false);
  }, []);

  React.useEffect(() => () => stopScreenShare(), [stopScreenShare]);

  const loadPreview = React.useCallback(async () => {
    setPhase("loading");
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
    setMaxReachedIndex(0);
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
    stopScreenShare();
    try {
      const data = isSample
        ? await onlineExamApi.getSamplePreview()
        : isDemo
          ? await onlineExamApi.getDemoPreview(demoToken as string)
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
      const startIdx = firstUnansweredIndex(list, {});
      setCurrentIndex(startIdx);
      setMaxReachedIndex(startIdx);
      setPhase(list.length ? "intro" : "unavailable");
    } catch (err: any) {
      await alertError(t("onlineExams.preview.loadFailed"), err?.message);
      setPhase("unavailable");
    }
  }, [examId, isSample, isDemo, demoToken, t, stopScreenShare]);

  React.useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

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
          : isDemo
            ? await onlineExamApi.scoreDemoPreview(demoToken as string, payload)
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
    [questions, isSample, isDemo, demoToken, examId, stopScreenShare, t]
  );

  const countViolation = React.useCallback(
    (type: string) => {
      if (phase !== "exam" || finishingRef.current) return;
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
      setWarning(t("onlineExams.take.violationWarning", { count: next, max: max || next }));
      if (kioskConfig.requireFullscreen) void enterFullscreen();
    },
    [phase, kioskConfig, scoreAndFinish, enterFullscreen, t]
  );

  const terminateForScreenShare = React.useCallback(
    (message?: string) => {
      if (phase !== "exam" || finishingRef.current) return;
      setScreenSharing(false);
      setWarnLevel("danger");
      setWarning(message || t("onlineExams.take.screenShareRequired"));
      const next = violationRef.current + 1;
      violationRef.current = next;
      setViolationCount(next);
      void scoreAndFinish("MAX_VIOLATIONS");
    },
    [phase, scoreAndFinish, t]
  );

  const enforceScreenShareRequirement = React.useCallback(
    async (source: "start" | "runtime") => {
      if (!needsScreenConsent) return true;
      if (!screenShareSupported) {
        if (source === "start") {
          await alertError(t("onlineExams.take.startFailed"), t("onlineExams.take.screenShareUnavailable", "Screen sharing is unavailable in this browser."));
        } else {
          terminateForScreenShare(t("onlineExams.take.screenShareUnavailable", "Screen sharing is unavailable in this browser."));
        }
        return false;
      }
      const res = await requestExamTabStream();
      if (!res.ok) {
        if (source === "start") {
          await alertError(t("onlineExams.take.startFailed"), res.message || t("onlineExams.take.screenShareRequired"));
        } else {
          terminateForScreenShare(res.message || t("onlineExams.take.screenShareRequired"));
        }
        return false;
      }
      screenStreamRef.current = res.stream;
      captureVideoRef.current = attachStreamToVideo(res.stream, captureVideoRef.current);
      setScreenSharing(true);
      const track = res.stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          screenStreamRef.current = null;
          captureVideoRef.current = null;
          terminateForScreenShare(t("onlineExams.take.screenShareRequired"));
        };
      }
      return true;
    },
    [needsScreenConsent, screenShareSupported, terminateForScreenShare, t]
  );

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

  React.useEffect(() => {
    if (phase !== "exam") return;
    const onFs = () => { if (!document.fullscreenElement) countViolation("EXIT_FULLSCREEN"); };
    const onVis = () => { if (document.visibilityState === "hidden") countViolation("VISIBILITY_HIDDEN"); };
    const onBlur = () => countViolation("TAB_BLUR");
    const onContext = (e: MouseEvent) => { e.preventDefault(); countViolation("CONTEXT_MENU"); };
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); countViolation("COPY_ATTEMPT"); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); void enterFullscreen(); }
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "p", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        countViolation("COPY_ATTEMPT");
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
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
  }, [phase, countViolation, enterFullscreen]);

  React.useEffect(() => {
    if (phase !== "exam" || !needsScreenConsent) return;
    const check = () => { if (!isStreamLive(screenStreamRef.current)) terminateForScreenShare(); };
    const id = window.setInterval(check, 4000);
    document.addEventListener("visibilitychange", check);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", check); };
  }, [phase, needsScreenConsent, terminateForScreenShare]);

  const beginPreview = async () => {
    if (!consentChecked || submitting) return;
    if (needsScreenConsent && !screenShareConsented) return;
    if (needsScreenConsent && !screenShareSupported) {
      await alertError(t("onlineExams.take.startFailed"), t("onlineExams.take.screenShareUnavailable", "Screen sharing is unavailable in this browser."));
      return;
    }
    setSubmitting(true);
    try {
      if (needsScreenConsent) {
        const ok = await enforceScreenShareRequirement("start");
        if (!ok) return;
      }
      await enterFullscreen();
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
      const startIdx = firstUnansweredIndex(questions, answersRef.current);
      setCurrentIndex(startIdx);
      setMaxReachedIndex(startIdx);
      setPhase("exam");
    } finally {
      setSubmitting(false);
    }
  };

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
  const currentAnswered = currentQuestion ? isQuestionAnswered(currentQuestion, currentAnswer) : false;
  const isLastQuestion = questions.length === 0 || currentIndex >= questions.length - 1;

  const goNextQuestion = () => {
    if (!currentAnswered) return;
    setCurrentIndex((i) => {
      const next = Math.min(i + 1, questions.length - 1);
      setMaxReachedIndex((m) => Math.max(m, next));
      return next;
    });
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
          <Link to={backTo} className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200">
            {t("onlineExams.preview.backToAuthoring")}
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-start sm:items-center justify-center px-4 py-5 sm:px-6 sm:py-8 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="max-w-lg w-full rounded-[32px] border border-slate-800 bg-slate-900 p-5 sm:p-8 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-2xl overflow-hidden bg-white p-1.5 border border-slate-800">
              <SchoolLogo url={school?.logoUrl} size="md" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 truncate">{school?.name}</p>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-dashboard truncate">{examTitle}</h1>
              <p className="text-slate-400 text-xs sm:text-sm">{t("onlineExams.take.secureIntro")}</p>
            </div>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300 inline-flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> {t("onlineExams.preview.badge")}
          </p>
          <p className="text-xs sm:text-sm text-slate-300">
            {isSample ? t("onlineExams.preview.introSample") : isDemo ? t("onlineExams.preview.introDemo") : t("onlineExams.preview.introExam")}
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
          <SystemCheck screenShareRequired={needsScreenConsent} screenShareReady={screenSharing} screenShareSupported={screenShareSupported} />
          <ExamRulesBlock requireFullscreen={kioskConfig.requireFullscreen} needsScreenConsent={needsScreenConsent} maxViolations={kioskConfig.maxViolations} />
          {exam?.instructions && (
            <p className="text-xs sm:text-sm text-slate-400 border border-slate-800 rounded-2xl p-3 sm:p-4">{exam.instructions}</p>
          )}
          <label className="flex items-start gap-3 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-500" />
            <span>{t("onlineExams.take.consentLabel")}</span>
          </label>
          {needsScreenConsent && (
            <label className="flex items-start gap-3 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={screenShareConsented} onChange={(e) => setScreenShareConsented(e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-500" />
              <span>{t("onlineExams.take.screenShareConsentLabel")}</span>
            </label>
          )}
          <button type="button" onClick={() => void beginPreview()} disabled={!consentChecked || submitting || (needsScreenConsent && (!screenShareConsented || !screenShareSupported))} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl inline-flex items-center justify-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <Play className="w-4 h-4" />
            {t("onlineExams.take.agreeAndBegin")}
          </button>
          <button type="button" onClick={() => void handleExit()} className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200">
            {t("onlineExams.preview.exit")}
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
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-dashboard">{t("onlineExams.preview.resultTitle")}</h1>
            <p className="text-slate-500 font-medium">{result.exam?.title || exam?.title}</p>
          </div>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { label: t("onlineExams.results.score"), value: `${attempt.score ?? 0}/${attempt.maxScore ?? 0}` },
              { label: t("onlineExams.results.passed"), value: attempt.passedCount ?? 0, icon: CheckCircle2, tone: "emerald" },
              { label: t("onlineExams.results.missed"), value: attempt.missedCount ?? 0, icon: XCircle, tone: "rose" },
              { label: t("onlineExams.results.pendingEssays"), value: attempt.pendingCount ?? 0, icon: Clock3, tone: "slate" },
            ].map((s: any) => (
              <div key={s.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-3">
                {s.icon && (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.tone === "emerald" ? "bg-emerald-50 text-emerald-600" : s.tone === "rose" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
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
              {t("onlineExams.results.violationsRecorded")} <span className="font-mono">{previewViolations}</span>
            </div>
          )}
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-4">
            <h2 className="font-extrabold tracking-tight text-slate-900">{t("onlineExams.results.questionReview")}</h2>
            <div className="space-y-4">
              {rQuestions.map((q: any, index: number) => {
                const pending = q.answer?.pending === true;
                const ok = q.answer?.isCorrect === true;
                return (
                  <div key={q.id} className={`rounded-2xl border p-5 ${pending ? "border-slate-100 bg-slate-50" : ok ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-slate-900">
                        <span className="font-mono text-slate-400 mr-2">Q{index + 1}</span>
                        <RichContent content={q.prompt} className="inline" />
                      </p>
                      <span className="text-xs font-mono text-slate-500 shrink-0">
                        {pending ? t("common:pending") : ok ? `+${q.answer?.pointsAwarded ?? q.points}` : "0"}
                      </span>
                    </div>
                    {q.answer?.textAnswer != null && q.answer.textAnswer !== "" && (
                      <p className="mt-2 text-sm text-slate-600">
                        <span>{t("onlineExams.results.yourAnswer", { text: "" }).trim()} </span>
                        <RichContent content={q.answer.textAnswer} className="text-slate-800" />
                      </p>
                    )}
                    {q.answer?.selectedChoiceId && (
                      <p className="mt-2 text-sm text-slate-600">
                        <span>{t("onlineExams.results.yourChoice")}: </span>
                        <RichContent content={q.choices?.find((c: any) => c.id === q.answer.selectedChoiceId)?.text || "—"} className="text-slate-800" />
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
            <button type="button" onClick={() => void loadPreview()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50">
              <RotateCcw className="w-4 h-4" /> {t("onlineExams.preview.tryAgain")}
            </button>
            <Link to={backTo} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3">
              {t("onlineExams.preview.exit")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] select-none">
      <div className="sticky top-0 z-20 border-b-2 border-[#0b1f3b] bg-white/95 backdrop-blur shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 rounded-xl overflow-hidden bg-white p-1 border border-slate-200">
              <SchoolLogo url={school?.logoUrl} size="sm" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1e3a5f] truncate">{school?.name}</p>
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-extrabold tracking-tight text-slate-900 truncate">{examTitle}</p>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">{t("onlineExams.preview.badge")}</span>
              </div>
              <div className="mt-0.5"><ViolationShield count={violationCount} max={kioskConfig.maxViolations} /></div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            {endsAtMs > 0 && <TimerPill remainingMs={remainingMs} />}
            <button type="button" onClick={() => void handleExit()} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              {t("onlineExams.preview.exit")}
            </button>
            <button type="button" onClick={() => setReviewOpen(true)} disabled={submitting} className="bg-[#1e3a5f] hover:bg-[#172e4a] disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-sm">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t("common:submit")}
            </button>
          </div>
        </div>
        {warning && (
          <div className={`${warnLevel === "danger" ? "bg-rose-600" : "bg-amber-500"} text-white text-center text-sm font-medium py-2`}>{warning}</div>
        )}
        {needsScreenConsent && screenSharing && (
          <div className="bg-[#0b1f3b] text-emerald-300 text-center text-xs font-semibold py-1.5 inline-flex w-full items-center justify-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" /> {t("onlineExams.take.screenSharingActive")}
          </div>
        )}
        <TimeProgress remainingMs={remainingMs} totalMs={totalMs} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        <QuestionProgress questions={questions} answers={answers} currentIndex={currentIndex} maxReachedIndex={maxReachedIndex} />
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.section key={currentQuestion.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.18 }} className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden">
              <div className="px-5 sm:px-7 py-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-[#0b1f3b] text-white flex items-center justify-center font-extrabold text-sm">{currentIndex + 1}</div>
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-slate-500 mb-1">
                        {t("onlineExams.take.questionLabel", "Question {{n}}", { n: currentIndex + 1 })} · {questionTypeLabel(currentQuestion.type, t)}
                      </div>
                      <div className="text-[15px] leading-relaxed text-slate-900 font-medium"><RichContent content={currentQuestion.prompt} /></div>
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded-full border border-[#c8d6ea] bg-[#e8eef7] px-3 py-1 text-[11.5px] font-extrabold text-[#0b1f3b] whitespace-nowrap">
                    {t("onlineExams.take.pointsShort", { count: currentQuestion.points })}
                  </span>
                </div>
                <div className="sm:ml-12 space-y-3">
                  {(currentQuestion.type === "MULTIPLE_CHOICE" || currentQuestion.type === "TRUE_FALSE") && (
                    <div className="space-y-2">
                      {(currentQuestion.choices || []).map((c: any) => {
                        const selected = currentAnswer.selectedChoiceId === c.id;
                        return (
                          <label key={c.id} className={`grid grid-cols-[20px_28px_minmax(0,1fr)] items-start gap-2.5 rounded-xl border px-3.5 py-3 cursor-pointer transition-colors ${selected ? "border-[#1e3a5f] bg-[#eef4fb]" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                            <span className="pt-1 leading-none">
                              <input type="radio" name={`preview-q-${currentQuestion.id}`} checked={selected} onChange={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: { selectedChoiceId: c.id } }))} className="w-4 h-4 accent-[#0b1f3b]" />
                            </span>
                            <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-extrabold ${selected ? "border-[#1e3a5f] text-[#0b1f3b] bg-white" : "border-slate-400 text-slate-700"}`}>{c.label}</span>
                            <span className="text-[14.5px] leading-relaxed text-slate-800 pt-0.5 min-w-0"><RichContent content={c.text} /></span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {currentQuestion.type === "FILL_BLANK" && (
                    <div className="space-y-2">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-slate-500">{t("onlineExams.take.answerLabel", "Answer")}</p>
                      <input value={currentAnswer.textAnswer || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: { textAnswer: e.target.value } }))} className="w-full max-w-xl rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]" placeholder={t("onlineExams.take.yourAnswer")} autoComplete="off" />
                    </div>
                  )}
                  {currentQuestion.type === "ESSAY" && (
                    <div className="space-y-2">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-slate-500">{t("onlineExams.take.responseLabel", "Response")}</p>
                      <textarea value={currentAnswer.textAnswer || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: { textAnswer: e.target.value } }))} rows={Math.min(16, Math.max(7, (Number(currentQuestion.points) || 1) * 2))} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-[15px] leading-7 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]" placeholder={t("onlineExams.take.writeAnswer")} />
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <button type="button" onClick={() => setSketchOpen(true)} title={t("onlineExams.take.roughWorkHint")} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                          <Pencil className="w-3.5 h-3.5" /> {t("onlineExams.take.roughWork")}
                        </button>
                        <WordCountBadge text={currentAnswer.textAnswer} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-sm text-slate-600 font-medium">{currentAnswered ? t("onlineExams.take.answerRecorded") : t("onlineExams.take.answerToContinue")}</p>
          <ForwardNavButton isLast={isLastQuestion} canAdvance={currentAnswered} onNext={goNextQuestion} onFinish={() => setReviewOpen(true)} submitting={submitting} />
        </div>
      </div>

      <SubmitSummarySheet open={reviewOpen} questions={questions} answers={answers} onClose={() => setReviewOpen(false)} onSubmit={() => void handleSubmit()} submitting={submitting} />
      <SketchPad open={sketchOpen} onClose={() => setSketchOpen(false)} onInsert={() => setSketchOpen(false)} labels={{ title: t("onlineExams.take.roughWork"), hint: t("onlineExams.take.roughWorkHint"), insert: t("onlineExams.take.roughWorkDone"), clear: t("onlineExams.author.math.sketch.clear"), undo: t("onlineExams.author.math.sketch.undo"), pen: t("onlineExams.author.math.sketch.pen"), eraser: t("onlineExams.author.math.sketch.eraser"), line: t("onlineExams.author.math.sketch.line"), arrow: t("onlineExams.author.math.sketch.arrow"), rect: t("onlineExams.author.math.sketch.rect"), ellipse: t("onlineExams.author.math.sketch.ellipse") }} />
    </div>
  );
}
