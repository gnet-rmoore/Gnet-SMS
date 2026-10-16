import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { Clock, ShieldAlert, Send, Loader2, RotateCcw, Play, MonitorUp } from "lucide-react";
import { onlineExamApi, type KioskConfig, type ProctorLevel } from "./api";
import { formatRemaining } from "./types";
import { confirmAction, alertError } from "../../lib/swal";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "react-i18next";

type AnswerMap = Record<
  string,
  { selectedChoiceId?: string | null; textAnswer?: string | null }
>;

const DEFAULT_KIOSK: KioskConfig = {
  requireFullscreen: true,
  requireScreenShare: false,
  maxViolations: 3,
  warnAt: 1,
  blockedEvents: ["EXIT_FULLSCREEN", "TAB_BLUR", "VISIBILITY_HIDDEN", "COPY_ATTEMPT"],
  allowReconnect: true,
};

export default function TakeOnlineExamPage() {
  const { t } = useTranslation(["pages", "common"]);
  const { examId, attemptId: routeAttemptId } = useParams();
  const navigate = useNavigate();
  const { school } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [attemptId, setAttemptId] = React.useState<string | null>(routeAttemptId || null);
  const [examTitle, setExamTitle] = React.useState("");
  const [instructions, setInstructions] = React.useState<string | null>(null);
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [answers, setAnswers] = React.useState<AnswerMap>({});
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
  const reportingRef = React.useRef(false);
  const answersRef = React.useRef(answers);
  answersRef.current = answers;
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const captureVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const [screenSharing, setScreenSharing] = React.useState(false);

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
          setWarnLevel("danger");
          setWarning(t("onlineExams.take.maxViolationsReached"));
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
        await enterFullscreen();
      } catch {
        /* ignore transient */
      } finally {
        reportingRef.current = false;
      }
    },
    [attemptId, enterFullscreen, goResults, maxViolations, t]
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
    try {
      const res = await onlineExamApi.saveAnswers(attemptId, payload);
      if (useDeltas) {
        dirtyRef.current.clear();
      }
      if (res.serverNow && res.endsAt) {
        const server = new Date(res.serverNow).getTime();
        setClockOffset(server - Date.now());
        setEndsAtMs(new Date(res.endsAt).getTime());
      }
    } catch (err: any) {
      if (err?.code === "TIME_EXPIRED" || err?.message?.includes("expired")) {
        if (attemptId) goResults(attemptId);
      }
    }
  }, [attemptId, goResults]);

  const hydrateAttempt = React.useCallback(
    (data: any) => {
      setAttemptId(data.attempt.id);
      setExamTitle(data.exam?.title || t("onlineExams.take.examFallback"));
      setInstructions(data.exam?.instructions || null);
      setQuestions(data.questions || []);
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
      setEndsAtMs(new Date(data.attempt.endsAt).getTime());
      const map: AnswerMap = {};
      for (const a of data.answers || []) {
        map[a.questionId] = {
          selectedChoiceId: a.selectedChoiceId,
          textAnswer: a.textAnswer,
        };
      }
      setAnswers(map);
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

  // Heartbeat so proctors can show live connection state.
  React.useEffect(() => {
    if (!started || !attemptId) return;
    let cancelled = false;
    const beat = async () => {
      try {
        const res = await onlineExamApi.heartbeat(attemptId);
        if (!cancelled && res?.expired && attemptId) {
          goResults(attemptId);
        }
      } catch {
        /* transient */
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

  const beginScreenShare = React.useCallback(async () => {
    if (!needsScreenConsent) return true;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      attachCaptureVideo(stream);
      setScreenSharing(true);
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setScreenSharing(false);
        screenStreamRef.current = null;
        captureVideoRef.current = null;
        void reportViolation("SCREEN_SHARE_STOPPED");
      });
      return true;
    } catch {
      return false;
    }
  }, [needsScreenConsent, reportViolation, attachCaptureVideo]);

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

  const beginKiosk = async () => {
    await enterFullscreen();
    if (needsScreenConsent && !screenSharing) {
      const ok = await beginScreenShare();
      if (!ok) {
        await alertError(t("onlineExams.take.startFailed"), t("onlineExams.take.screenShareRequired"));
        return;
      }
    }
    setStarted(true);
  };

  const beginExam = async () => {
    if (!examId || !consentChecked || submitting) return;
    if (needsScreenConsent && !screenShareConsented) return;
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

  const handleSubmit = async () => {
    if (!attemptId) return;
    const ok = await confirmAction({
      title: t("onlineExams.take.submitConfirm"),
      text: t("onlineExams.take.submitConfirmText"),
      confirmText: t("common:submit"),
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await flushAnswers();
      await onlineExamApi.submit(attemptId);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> {t("onlineExams.take.preparing")}
      </div>
    );
  }

  if (!started) {
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
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight font-dashboard">{examTitle}</h1>
              <p className="text-slate-400 text-sm">{t("onlineExams.take.secureIntro")}</p>
            </div>
          </div>
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
                  maxViolations > 0
                    ? t("onlineExams.take.secureBullets.violationsSuffix", { max: maxViolations })
                    : "",
              })}
            </li>
            <li>{t("onlineExams.take.secureBullets.timer")}</li>
          </ul>
          <p className="text-xs text-slate-500 border border-slate-800 rounded-2xl p-4 leading-relaxed">
            {t("onlineExams.take.lockdownLimitations")}
          </p>
          {instructions && (
            <p className="text-sm text-slate-400 border border-slate-800 rounded-2xl p-4">
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
              disabled={!consentChecked || submitting || (needsScreenConsent && !screenShareConsented)}
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
              disabled={!consentChecked || submitting || (needsScreenConsent && !screenShareConsented)}
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
    <div className="min-h-screen bg-slate-50 select-none">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-extrabold tracking-tight text-slate-900">{examTitle}</p>
            <p className="text-xs text-slate-500">
              {t("onlineExams.take.violations")}{" "}
              <span className="font-mono">
                {violationCount}
                {maxViolations > 0 ? ` / ${maxViolations}` : ""}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
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
            <button
              type="button"
              onClick={handleSubmit}
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
                  {q.prompt}
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
                        name={`q-${q.id}`}
                        checked={ans.selectedChoiceId === c.id}
                        onChange={() => {
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: { selectedChoiceId: c.id },
                          }));
                          try { dirtyRef.current.add(q.id); } catch {}
                        }}
                      />
                      <span className="font-mono text-slate-400 text-sm w-6">{c.label}</span>
                      <span className="text-slate-800">{c.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "FILL_BLANK" && (
                <input
                  value={ans.textAnswer || ""}
                  onChange={(e) => {
                    setAnswers((prev) => ({
                      ...prev,
                      [q.id]: { textAnswer: e.target.value },
                    }));
                    try { dirtyRef.current.add(q.id); } catch {}
                  }}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  placeholder={t("onlineExams.take.yourAnswer")}
                  autoComplete="off"
                />
              )}

              {q.type === "ESSAY" && (
                <textarea
                  value={ans.textAnswer || ""}
                  onChange={(e) => {
                    setAnswers((prev) => ({
                      ...prev,
                      [q.id]: { textAnswer: e.target.value },
                    }));
                    try { dirtyRef.current.add(q.id); } catch {}
                  }}
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
