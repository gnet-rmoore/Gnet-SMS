import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Send, Loader2, RotateCcw, Play, School, Pencil, ShieldCheck } from "lucide-react";
import { onlineExamApi, type KioskConfig, type ProctorLevel } from "./api";
import {
  ExamRulesBlock,
  IntroFacts,
  QuestionProgress,
  SubmitSummarySheet,
  ForwardNavButton,
  SaveIndicator,
  SystemCheck,
  TimeProgress,
  TimerPill,
  ViolationShield,
  WordCountBadge,
  firstUnansweredIndex,
  isQuestionAnswered,
  type KioskAnswerMap,
  type SaveState,
} from "./KioskUI";
import { SketchPad } from "./SketchPad";
import { RichContent } from "./RichContent";
import { SchoolLogo } from "../report-cards/components/pages/BifoldChrome";
import { alertError } from "../../lib/swal";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "react-i18next";
import {
  requestExamTabStream,
  isExamStreamFailure,
  stopMediaStream,
  attachStreamToVideo,
  examTabShareSupported,
  isStreamLive,
} from "./screenShare";

type AnswerMap = KioskAnswerMap;

const DEFAULT_KIOSK: KioskConfig = {
  requireFullscreen: true,
  requireScreenShare: false,
  maxViolations: 3,
  warnAt: 1,
  blockedEvents: ["EXIT_FULLSCREEN", "TAB_BLUR", "VISIBILITY_HIDDEN", "COPY_ATTEMPT"],
  allowReconnect: true,
};

type IntroFactsState = {
  duration: number | null;
  count: number;
  points: number;
  start: string | null;
  end: string | null;
};

const EMPTY_INTRO_FACTS: IntroFactsState = {
  duration: null,
  count: 0,
  points: 0,
  start: null,
  end: null,
};

function sumPoints(list: any[]) {
  return list.reduce((acc, q) => acc + (Number(q?.points) || 0), 0);
}

export default function TakeOnlineExamPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { examId, attemptId: routeAttemptId } = useParams();
  const navigate = useNavigate();
  const { school, user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [attemptId, setAttemptId] = React.useState<string | null>(routeAttemptId || null);
  const [examTitle, setExamTitle] = React.useState("");
  const [instructions, setInstructions] = React.useState<string | null>(null);
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [answers, setAnswers] = React.useState<AnswerMap>({});
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [maxReachedIndex, setMaxReachedIndex] = React.useState(0);
  const [endsAtMs, setEndsAtMs] = React.useState<number>(0);
  const [clockOffset, setClockOffset] = React.useState(0);
  const [remainingMs, setRemainingMs] = React.useState(0);
  const [violationCount, setViolationCount] = React.useState(0);
  const [maxViolations, setMaxViolations] = React.useState(3);
  const [started, setStarted] = React.useState(false);
  const [consentChecked, setConsentChecked] = React.useState(false);
  const [screenShareConsented, setScreenShareConsented] = React.useState(false);
  const [kioskConfig, setKioskConfig] = React.useState<KioskConfig>(DEFAULT_KIOSK);
  const [warning, setWarning] = React.useState<string | null>(null);
  const [warnLevel, setWarnLevel] = React.useState<"info" | "danger">("info");
  const [retakeEligibility, setRetakeEligibility] = React.useState<{ eligible: boolean; reason: string; nextAttemptNumber?: number; isFirstAttempt?: boolean } | null>(null);
  const [proctorLevel, setProctorLevel] = React.useState<ProctorLevel>("MONITOR");
  const [screenCaptureEnabled, setScreenCaptureEnabled] = React.useState(false);
  const [frameIntervalMs, setFrameIntervalMs] = React.useState(15000);
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = React.useState<number | null>(null);
  const [offline, setOffline] = React.useState(false);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [sketchOpen, setSketchOpen] = React.useState(false);
  const [totalMs, setTotalMs] = React.useState(0);
  const [introFacts, setIntroFacts] = React.useState<IntroFactsState>(EMPTY_INTRO_FACTS);
  const heartbeatFailsRef = React.useRef(0);
  const reportingRef = React.useRef(false);
  const endingRef = React.useRef(false);
  const answersRef = React.useRef(answers);
  answersRef.current = answers;
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const captureVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const [screenSharing, setScreenSharing] = React.useState(false);
  const screenShareSupported = examTabShareSupported();

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

  const capturesScreen = proctorLevel === "SCREEN_VIEW";
  const needsScreenConsent = kioskConfig.requireScreenShare || capturesScreen;

  const goResults = React.useCallback(
    (id: string) => {
      navigate(`/${school?.slug}/online-exams/${examId}/results/${id}`, { replace: true });
    },
    [navigate, school?.slug, examId]
  );

  const enterFullscreen = React.useCallback(async () => {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch {
      /* browser may block; still allow exam with violations */
    }
  }, []);

  const reportViolation = React.useCallback(
    async (type: string, detail?: string) => {
      if (!attemptId || reportingRef.current) return;
      reportingRef.current = true;
      try {
        const res = await onlineExamApi.reportViolation(attemptId, type, detail);
        setViolationCount(res.attempt?.violationCount ?? 0);
        if (res.attempt?.maxViolations != null) setMaxViolations(res.attempt.maxViolations);
        if (res.attempt?.autoSubmitted) {
          endingRef.current = true;
          setWarnLevel("danger");
          setWarning(t("onlineExams.take.maxViolationsReached"));
          stopScreenShare();
          try { if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined); } catch {}
          goResults(attemptId);
          return;
        }
        setWarnLevel(res.attempt?.warn ? "danger" : "info");
        setWarning(
          t("onlineExams.take.violationWarning", {
            count: res.attempt?.countedViolations ?? res.attempt?.violationCount,
            max: res.attempt?.maxViolations || maxViolations,
          })
        );
        if (kioskConfig.requireFullscreen) {
          await enterFullscreen();
        }
      } catch {
        /* ignore transient */
      } finally {
        reportingRef.current = false;
      }
    },
    [attemptId, enterFullscreen, goResults, maxViolations, t, kioskConfig.requireFullscreen, stopScreenShare]
  );

  const dirtyRef = React.useRef<Set<string>>(new Set());
  const flushAnswers = React.useCallback(async () => {
    if (!attemptId) return;
    const useDeltas = (import.meta.env.VITE_EXAM_SEND_DELTAS_ENABLED as string | undefined) !== "false";
    let payload: any[] = [];
    if (useDeltas) {
      payload = Array.from(dirtyRef.current).map((questionId) => {
        const v = answersRef.current[questionId] || {};
        return {
          questionId,
          selectedChoiceId: v.selectedChoiceId ?? null,
          textAnswer: v.textAnswer ?? null,
        };
      });
    } else {
      payload = Object.entries(answersRef.current).map(([questionId, v]) => ({
        questionId,
        selectedChoiceId: v.selectedChoiceId ?? null,
        textAnswer: v.textAnswer ?? null,
      }));
    }
    if (!payload.length) return;
    setSaveState("saving");
    try {
      const res = await onlineExamApi.saveAnswers(attemptId, payload);
      if (useDeltas) {
        dirtyRef.current.clear();
      }
      setSaveState("saved");
      setLastSavedAt(Date.now());
      setOffline(false);
      heartbeatFailsRef.current = 0;
      if (res.serverNow && res.endsAt) {
        const server = new Date(res.serverNow).getTime();
        setClockOffset(server - Date.now());
        setEndsAtMs(new Date(res.endsAt).getTime());
      }
    } catch (err: any) {
      if (err?.code === "TIME_EXPIRED" || err?.message?.includes("expired")) {
        if (attemptId) goResults(attemptId);
      } else {
        setSaveState("error");
      }
    }
  }, [attemptId, goResults]);

  const hydrateAttempt = React.useCallback(
    (data: any) => {
      setAttemptId(data.attempt.id);
      setExamTitle(data.exam?.title || t("onlineExams.take.examFallback"));
      setInstructions(data.exam?.instructions || null);
      const qs = data.questions || [];
      setQuestions(qs);
      setViolationCount(data.attempt?.violationCount || 0);
      setMaxViolations(data.attempt?.maxViolations ?? data.exam?.maxViolations ?? 3);
      if (data.exam?.kiosk) {
        setKioskConfig({ ...DEFAULT_KIOSK, ...data.exam.kiosk });
      }
      if (data.exam?.proctorLevel) {
        setProctorLevel(data.exam.proctorLevel);
      }
      const serverNow = data.attempt?.serverNow
        ? new Date(data.attempt.serverNow).getTime()
        : Date.now();
      setClockOffset(serverNow - Date.now());
      const endsMs = new Date(data.attempt.endsAt).getTime();
      setEndsAtMs(endsMs);
      setTotalMs(Math.max(0, endsMs - serverNow));
      setIntroFacts((prev) => ({
        duration: data.exam?.duration ?? prev.duration,
        count: qs.length,
        points: sumPoints(qs),
        start: prev.start,
        end: prev.end,
      }));
      const map: AnswerMap = {};
      for (const a of data.answers || []) {
        map[a.questionId] = {
          selectedChoiceId: a.selectedChoiceId,
          textAnswer: a.textAnswer,
        };
      }
      setAnswers(map);
      const startIdx = firstUnansweredIndex(qs, map);
      setCurrentIndex(startIdx);
      setMaxReachedIndex(startIdx);
    },
    [t]
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!examId) return;
      setLoading(true);
      try {
        if (routeAttemptId) {
          const data = await onlineExamApi.getAttempt(routeAttemptId);
          if (cancelled) return;
          if (data.attempt?.status && data.attempt.status !== "IN_PROGRESS") {
            goResults(data.attempt.id);
            return;
          }
          hydrateAttempt(data);
        } else {
          const meta = await onlineExamApi.getQuestions(examId);
          if (cancelled) return;
          setExamTitle(meta?.exam?.title || t("onlineExams.take.examFallback"));
          setInstructions(meta?.exam?.instructions || null);
          setMaxViolations(meta?.exam?.maxViolations ?? 3);
          setIntroFacts({
            duration: meta?.exam?.duration ?? null,
            count: meta?.questions?.length || 0,
            points: sumPoints(meta?.questions || []),
            start: meta?.exam?.startDate ?? null,
            end: meta?.exam?.endDate ?? null,
          });
          if (meta?.exam?.kioskConfig) {
            setKioskConfig({ ...DEFAULT_KIOSK, ...meta.exam.kioskConfig });
          }
          if (meta?.exam?.proctorLevel) {
            setProctorLevel(meta.exam.proctorLevel);
          }
          // Offer to resume an attempt that is still running on the server.
          try {
            const active = await onlineExamApi.resumeAttempt(examId);
            if (!cancelled && active?.inProgress && active?.attempt) {
              hydrateAttempt(active);
            }
          } catch {
            /* no active attempt */
          }
        }
      } catch (err: any) {
        await alertError(t("onlineExams.take.startFailed"), err?.message);
        navigate(`/${school?.slug}/online-exams`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId, routeAttemptId, goResults, navigate, school?.slug, hydrateAttempt, t]);

  // Check retake eligibility when not in an active attempt
  React.useEffect(() => {
    if (!examId || routeAttemptId) return;
    let cancelled = false;
    (async () => {
      try {
        const eligibility = await onlineExamApi.getRetakeEligibility(examId);
        if (!cancelled) setRetakeEligibility(eligibility);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [examId, routeAttemptId]);

  React.useEffect(() => {
    if (!started || !endsAtMs) return;
    const tick = () => {
      const now = Date.now() + clockOffset;
      const left = endsAtMs - now;
      setRemainingMs(left);
      if (left <= 0 && attemptId) {
        goResults(attemptId);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [started, endsAtMs, clockOffset, attemptId, goResults]);

  React.useEffect(() => {
    if (!started || !attemptId) return;
    const id = window.setInterval(() => {
      void flushAnswers();
    }, 15000);
    return () => window.clearInterval(id);
  }, [started, attemptId, flushAnswers]);

  // Debounced save shortly after the student touches an answer.
  React.useEffect(() => {
    if (!started || !attemptId) return;
    if (dirtyRef.current.size === 0) return;
    const id = window.setTimeout(() => void flushAnswers(), 1200);
    return () => window.clearTimeout(id);
  }, [answers, started, attemptId, flushAnswers]);

  // Heartbeat so proctors can show live connection state.
  React.useEffect(() => {
    if (!started || !attemptId) return;
    let cancelled = false;
    const beat = async () => {
      try {
        const res = await onlineExamApi.heartbeat(attemptId);
        if (cancelled) return;
        heartbeatFailsRef.current = 0;
        setOffline(false);
        if (res?.expired) {
          goResults(attemptId);
        }
      } catch {
        /* transient — flag offline after two consecutive failures */
        heartbeatFailsRef.current += 1;
        if (heartbeatFailsRef.current >= 2) setOffline(true);
      }
    };
    void beat();
    const id = window.setInterval(beat, 20000);
    const onVis = () => {
      if (document.visibilityState === "visible") void beat();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [started, attemptId, goResults]);

  // Resolve server-driven screen-capture policy once the attempt is running.
  React.useEffect(() => {
    if (!started || !attemptId) return;
    let cancelled = false;
    (async () => {
      try {
        const cfg = await onlineExamApi.getScreenConfig(attemptId);
        if (cancelled) return;
        setProctorLevel(cfg.proctorLevel);
        setScreenCaptureEnabled(cfg.enabled);
        if (cfg.intervalMs) setFrameIntervalMs(cfg.intervalMs);
      } catch {
        /* capture stays disabled */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [started, attemptId]);

  // Periodically capture downscaled JPEG snapshots and upload them for proctors.
  React.useEffect(() => {
    if (!started || !attemptId || !screenCaptureEnabled) return;
    let cancelled = false;
    let timer: number | undefined;

    const grab = async () => {
      const video = captureVideoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;
      try {
        const vw = video.videoWidth || 1280;
        const vh = video.videoHeight || 720;
        const targetW = 720;
        const scale = Math.min(1, targetW / vw);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(vw * scale));
        canvas.height = Math.max(1, Math.round(vh * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.6)
        );
        if (!blob || cancelled) return;
        const upload = await onlineExamApi.createScreenFrameUpload(attemptId, "image/jpeg");
        if (!upload.enabled || cancelled) return;
        const put = await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": upload.contentType },
          body: blob,
        });
        if (!put.ok || cancelled) return;
        await onlineExamApi.markScreenFrameUploaded(attemptId, upload.frameId, blob.size);
      } catch {
        /* transient capture/upload failure */
      }
    };

    void grab();
    timer = window.setInterval(() => void grab(), Math.max(5000, frameIntervalMs));
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [started, attemptId, screenCaptureEnabled, frameIntervalMs]);

  React.useEffect(() => {
    if (!started) return;

    const onFs = () => {
      if (!document.fullscreenElement) {
        void reportViolation("EXIT_FULLSCREEN");
      }
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        void reportViolation("VISIBILITY_HIDDEN");
      }
    };
    const onBlur = () => {
      void reportViolation("TAB_BLUR");
    };
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      void reportViolation("CONTEXT_MENU");
    };
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      void reportViolation("COPY_ATTEMPT");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        void enterFullscreen();
      }
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "p", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        void reportViolation("COPY_ATTEMPT", e.key);
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
  }, [started, reportViolation, enterFullscreen]);

  const finalizeAndExit = React.useCallback(async (id: string) => {
    if (endingRef.current) return;
    endingRef.current = true;
    try {
      await flushAnswers().catch(() => undefined);
    } catch {}
    stopScreenShare();
    try {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    } catch {}
    goResults(id);
  }, [flushAnswers, stopScreenShare, goResults]);

  const enforceScreenShareRequirement = React.useCallback(async (source: "start" | "runtime") => {
    if (!needsScreenConsent) return true;
    if (!screenShareSupported) {
      if (source === "start") {
        await alertError(t("onlineExams.take.startFailed"), t("onlineExams.take.screenShareUnavailable", "Screen sharing is unavailable in this browser."));
      } else if (attemptId) {
        setWarnLevel("danger");
        setWarning(t("onlineExams.take.screenShareRequired"));
        void reportViolation("SCREEN_SHARE_STOPPED", "screen-share-unavailable");
        await finalizeAndExit(attemptId);
      }
      return false;
    }
    const res = await requestExamTabStream();
    if (isExamStreamFailure(res)) {
      if (source === "start") {
        await alertError(
          t("onlineExams.take.startFailed"),
          res.reason === "invalid-surface"
            ? (res.message || t("onlineExams.take.screenShareRequired"))
            : (res.message || t("onlineExams.take.screenShareRequired"))
        );
      } else if (attemptId) {
        setWarnLevel("danger");
        setWarning(res.message || t("onlineExams.take.screenShareRequired"));
        void reportViolation("SCREEN_SHARE_STOPPED", res.reason);
        await finalizeAndExit(attemptId);
      }
      return false;
    }
    screenStreamRef.current = res.stream;
    captureVideoRef.current = attachStreamToVideo(res.stream, captureVideoRef.current);
    setScreenSharing(true);
    const track = res.stream.getVideoTracks()[0];
    if (track) {
      track.onended = () => {
        setScreenSharing(false);
        screenStreamRef.current = null;
        captureVideoRef.current = null;
        if (!endingRef.current) {
          setWarnLevel("danger");
          setWarning(t("onlineExams.take.screenShareRequired"));
          void reportViolation("SCREEN_SHARE_STOPPED", "track-ended");
          if (attemptId) void finalizeAndExit(attemptId);
        }
      };
    }
    return true;
  }, [needsScreenConsent, screenShareSupported, attemptId, reportViolation, finalizeAndExit, t]);

  const beginKiosk = async () => {
    if (needsScreenConsent) {
      const ok = await enforceScreenShareRequirement("start");
      if (!ok) return;
    }
    await enterFullscreen();
    setStarted(true);
  };

  const beginExam = async () => {
    if (!examId || !consentChecked || submitting) return;
    if (needsScreenConsent && !screenShareConsented) return;
    if (needsScreenConsent && !screenShareSupported) {
      await alertError(t("onlineExams.take.startFailed"), t("onlineExams.take.screenShareUnavailable", "Screen sharing is unavailable in this browser."));
      return;
    }
    setSubmitting(true);
    try {
      const data = await onlineExamApi.startAttempt(examId, true, screenShareConsented);
      if (data.attempt?.status && data.attempt.status !== "IN_PROGRESS") {
        goResults(data.attempt.id);
        return;
      }
      hydrateAttempt(data);
      await beginKiosk();
    } catch (err: any) {
      await alertError(t("onlineExams.take.startFailed"), err?.message);
    } finally {
      setSubmitting(false);
    }
  };

  /** Runs from the review sheet — the sheet itself is the confirm step. */
  const handleSubmit = async () => {
    if (!attemptId) return;
    setReviewOpen(false);
    setSubmitting(true);
    try {
      await flushAnswers();
      await onlineExamApi.submit(attemptId);
      endingRef.current = true;
      stopScreenShare();
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }
      goResults(attemptId);
    } catch (err: any) {
      await alertError(t("onlineExams.take.submitFailed"), err?.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Enforce continuous screen sharing when required
  React.useEffect(() => {
    if (!started || !needsScreenConsent || !attemptId) return;
    const check = () => {
      if (endingRef.current) return;
      if (!isStreamLive(screenStreamRef.current)) {
        setScreenSharing(false);
        setWarnLevel("danger");
        setWarning(t("onlineExams.take.screenShareRequired"));
        void reportViolation("SCREEN_SHARE_STOPPED", "stream-not-live");
        void finalizeAndExit(attemptId);
      }
    };
    const id = window.setInterval(check, 4000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [started, needsScreenConsent, attemptId, reportViolation, finalizeAndExit, t]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] || {} : {};
  const currentAnswered = currentQuestion
    ? isQuestionAnswered(currentQuestion, currentAnswer)
    : false;
  const isLastQuestion = questions.length === 0 || currentIndex >= questions.length - 1;

  const goNextQuestion = () => {
    if (!currentAnswered) return;
    setCurrentIndex((i) => {
      const next = Math.min(i + 1, questions.length - 1);
      setMaxReachedIndex((m) => Math.max(m, next));
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> {t("onlineExams.take.preparing")}
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-start sm:items-center justify-center px-4 py-5 sm:px-6 sm:py-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="max-w-lg w-full rounded-[32px] border border-slate-800 bg-slate-900 p-5 sm:p-8 space-y-4 sm:space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-2xl overflow-hidden bg-white p-1.5 border border-slate-800">
              <SchoolLogo url={school?.logoUrl} size="md" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 truncate">
                {school?.name}
              </p>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-dashboard truncate">
                {examTitle}
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">{t("onlineExams.take.secureIntro")}</p>
            </div>
          </div>

          {user?.name && (
            <p className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
              <School className="w-4 h-4 text-indigo-300" />
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                {t("onlineExams.take.candidateLabel")}
              </span>
              <span className="font-semibold text-slate-100">{user.name}</span>
            </p>
          )}

          <IntroFacts
            duration={introFacts.duration}
            questionCount={introFacts.count}
            totalPoints={introFacts.points}
            maxViolations={maxViolations}
            proctorLevel={proctorLevel}
            windowStart={introFacts.start}
            windowEnd={introFacts.end}
          />

          <SystemCheck
            screenShareRequired={needsScreenConsent}
            screenShareReady={screenSharing}
            screenShareSupported={screenShareSupported}
          />

          <ExamRulesBlock
            requireFullscreen={kioskConfig.requireFullscreen}
            needsScreenConsent={needsScreenConsent}
            maxViolations={maxViolations}
          />
          {instructions && (
            <p className="text-xs sm:text-sm text-slate-400 border border-slate-800 rounded-2xl p-3 sm:p-4">
              {instructions}
            </p>
          )}
          {!attemptId && (
            <label className="flex items-start gap-3 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-indigo-500"
              />
              <span>{t("onlineExams.take.consentLabel")}</span>
            </label>
          )}
          {!attemptId && needsScreenConsent && (
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
          {retakeEligibility?.eligible && !attemptId && (
            <button
              type="button"
              onClick={beginExam}
              disabled={!consentChecked || submitting || (needsScreenConsent && (!screenShareConsented || !screenShareSupported))}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl inline-flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {retakeEligibility.isFirstAttempt ? (
                <>
                  <Play className="w-4 h-4" />
                  {t("onlineExams.take.agreeAndBegin")}
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  {t("onlineExams.take.retakeExam", { attempt: retakeEligibility.nextAttemptNumber })}
                </>
              )}
            </button>
          )}
          {!retakeEligibility?.eligible && !attemptId && (
            <button
              type="button"
              onClick={beginExam}
              disabled={!consentChecked || submitting || (needsScreenConsent && (!screenShareConsented || !screenShareSupported))}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl inline-flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("onlineExams.take.agreeAndBegin")}
            </button>
          )}
          {attemptId && (
            <button
              type="button"
              onClick={beginKiosk}
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl inline-flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("onlineExams.take.enterFullscreen")}
            </button>
          )}
        </motion.div>
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
              <p className="font-extrabold tracking-tight text-slate-900 truncate">{examTitle}</p>
              <div className="mt-0.5"><ViolationShield count={violationCount} max={maxViolations} /></div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            <SaveIndicator state={saveState} savedAt={lastSavedAt} offline={offline} />
            <TimerPill remainingMs={remainingMs} />
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              disabled={submitting}
              className="bg-[#1e3a5f] hover:bg-[#172e4a] disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t("common:submit")}
            </button>
          </div>
        </div>
        {warning && (
          <div className={`${warnLevel === "danger" ? "bg-rose-600" : "bg-amber-500"} text-white text-center text-sm font-medium py-2`}>
            {warning}
          </div>
        )}
        {needsScreenConsent && screenSharing && (
          <div className="bg-[#0b1f3b] text-emerald-300 text-center text-xs font-semibold py-1.5 inline-flex w-full items-center justify-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" /> {t("onlineExams.take.screenSharingActive")}
          </div>
        )}
        <TimeProgress remainingMs={remainingMs} totalMs={totalMs} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        <QuestionProgress
          questions={questions}
          answers={answers}
          currentIndex={currentIndex}
          maxReachedIndex={maxReachedIndex}
        />

        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.section
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] overflow-hidden"
            >
              <div className="px-5 sm:px-7 py-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-[#0b1f3b] text-white flex items-center justify-center font-extrabold text-sm">
                      {currentIndex + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-slate-500 mb-1">
                        {t("onlineExams.take.questionLabel", "Question {{n}}", { n: currentIndex + 1 })} ? {questionTypeLabel(currentQuestion.type, t)}
                      </div>
                      <div className="text-[15px] leading-relaxed text-slate-900 font-medium">
                        <RichContent content={currentQuestion.prompt} />
                      </div>
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
                          <label
                            key={c.id}
                            className={`grid grid-cols-[20px_28px_minmax(0,1fr)] items-start gap-2.5 rounded-xl border px-3.5 py-3 cursor-pointer transition-colors ${selected ? "border-[#1e3a5f] bg-[#eef4fb]" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                          >
                            <span className="pt-1 leading-none">
                              <input
                                type="radio"
                                name={`q-${currentQuestion.id}`}
                                checked={selected}
                                onChange={() => {
                                  setAnswers((prev) => ({ ...prev, [currentQuestion.id]: { selectedChoiceId: c.id } }));
                                  try { dirtyRef.current.add(currentQuestion.id); } catch {}
                                }}
                                className="w-4 h-4 accent-[#0b1f3b]"
                              />
                            </span>
                            <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-extrabold ${selected ? "border-[#1e3a5f] text-[#0b1f3b] bg-white" : "border-slate-400 text-slate-700"}`}>
                              {c.label}
                            </span>
                            <span className="text-[14.5px] leading-relaxed text-slate-800 pt-0.5 min-w-0">
                              <RichContent content={c.text} />
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.type === "FILL_BLANK" && (
                    <div className="space-y-2">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-slate-500">{t("onlineExams.take.answerLabel", "Answer")}</p>
                      <input
                        value={currentAnswer.textAnswer || ""}
                        onChange={(e) => {
                          setAnswers((prev) => ({ ...prev, [currentQuestion.id]: { textAnswer: e.target.value } }));
                          try { dirtyRef.current.add(currentQuestion.id); } catch {}
                        }}
                        className="w-full max-w-xl rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                        placeholder={t("onlineExams.take.yourAnswer")}
                        autoComplete="off"
                      />
                    </div>
                  )}

                  {currentQuestion.type === "ESSAY" && (
                    <div className="space-y-2">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-slate-500">{t("onlineExams.take.responseLabel", "Response")}</p>
                      <textarea
                        value={currentAnswer.textAnswer || ""}
                        onChange={(e) => {
                          setAnswers((prev) => ({ ...prev, [currentQuestion.id]: { textAnswer: e.target.value } }));
                          try { dirtyRef.current.add(currentQuestion.id); } catch {}
                        }}
                        rows={Math.min(16, Math.max(7, (Number(currentQuestion.points) || 1) * 2))}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-[15px] leading-7 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                        placeholder={t("onlineExams.take.writeAnswer")}
                      />
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSketchOpen(true)}
                          title={t("onlineExams.take.roughWorkHint")}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {t("onlineExams.take.roughWork")}
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
          <p className="text-sm text-slate-600 font-medium">
            {currentAnswered ? t("onlineExams.take.answerRecorded") : t("onlineExams.take.answerToContinue")}
          </p>
          <ForwardNavButton
            isLast={isLastQuestion}
            canAdvance={currentAnswered}
            onNext={goNextQuestion}
            onFinish={() => setReviewOpen(true)}
            submitting={submitting}
          />
        </div>
      </div>

      <SubmitSummarySheet
        open={reviewOpen}
        questions={questions}
        answers={answers}
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

function questionTypeLabel(type: string, t: any) {
  if (type === "MULTIPLE_CHOICE") return t("onlineExams.types.multipleChoice", "Multiple choice");
  if (type === "TRUE_FALSE") return t("onlineExams.types.trueFalse", "True/False");
  if (type === "FILL_BLANK") return t("onlineExams.types.fillBlank", "Fill in the blank");
  if (type === "ESSAY") return t("onlineExams.types.essay", "Essay");
  return String(type || "");
}
