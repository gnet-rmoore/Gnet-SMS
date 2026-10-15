import React from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  MapPin,
  PartyPopper,
  SkipForward,
  Sparkles,
  X,
} from "lucide-react";
import { useGuide } from "./GuideProvider";
import { pathMatchesVisit, type GuideStepDef } from "./catalog";
import { resolveGuideHowTo } from "./guideHowTo";
import { cn } from "../../lib/cn";

/** Anchor rect with live re-measure (resize, scroll, layout shifts). */
function useAnchorRect(anchorId?: string) {
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  const measure = React.useCallback(() => {
    if (!anchorId) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-guide-id="${anchorId}"]`);
    if (el) setRect(el.getBoundingClientRect());
    else setRect(null);
  }, [anchorId]);

  React.useEffect(() => {
    if (!anchorId) {
      setRect(null);
      return;
    }
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    const id = window.setInterval(measure, 350);
    const el = document.querySelector(`[data-guide-id="${anchorId}"]`);
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (el && observer) observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.clearInterval(id);
      observer?.disconnect();
    };
  }, [anchorId, measure]);

  return rect;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== "undefined" && window.innerWidth < 1024
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

const CARD_MAX_W = 384;
const EDGE_GAP = 14;

export function GuideHost() {
  const { t } = useTranslation("pages");
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const {
    tourOpen,
    steps,
    progress,
    track,
    meta,
    basePath,
    markStep,
    dismissTour,
    completeGuide,
    nextStep,
  } = useGuide();

  const [index, setIndex] = React.useState(0);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previousFocus = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!tourOpen || !steps.length) return;
    const activeId = progress?.activeStepId || nextStep?.id;
    const i = Math.max(0, steps.findIndex((s) => s.id === activeId));
    setIndex(i >= 0 ? i : 0);
  }, [tourOpen, steps, progress?.activeStepId, nextStep?.id]);

  const step: GuideStepDef | undefined = steps[index];
  const rect = useAnchorRect(step?.type === "nav_spotlight" ? step.anchorId : undefined);

  React.useEffect(() => {
    if (!tourOpen || !step?.visitPaths) return;
    if (pathMatchesVisit(location.pathname, step.visitPaths)) {
      const st = progress?.steps?.[step.id];
      if (st !== "done") void markStep(step.id, "done");
    }
  }, [location.pathname, tourOpen, step, progress?.steps, markStep]);

  const isLast = index >= steps.length - 1;
  const isIntro = step?.type === "intro";
  const isCompletion = step?.type === "completion";
  const focusableSelector =
    'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  const goNext = React.useCallback(async () => {
    if (!step) return;
    await markStep(step.id, "done");
    if (isLast || isCompletion) {
      await completeGuide();
      return;
    }
    const next = steps[index + 1];
    setIndex(index + 1);
    if (next?.route && basePath) navigate(`${basePath}/${next.route}`);
  }, [step, isLast, isCompletion, markStep, completeGuide, steps, index, basePath, navigate]);

  const goBack = React.useCallback(() => {
    if (index <= 0) return;
    const prev = steps[index - 1];
    setIndex(index - 1);
    if (prev?.route && basePath) navigate(`${basePath}/${prev.route}`);
  }, [index, steps, basePath, navigate]);

  const goSkip = React.useCallback(async () => {
    if (!step) return;
    await markStep(step.id, "skipped");
    if (isLast) {
      await completeGuide();
      return;
    }
    setIndex(index + 1);
  }, [step, isLast, markStep, completeGuide, index]);

  const goThere = React.useCallback(() => {
    if (step?.route && basePath) navigate(`${basePath}/${step.route}`);
  }, [step, basePath, navigate]);

  // Focus trap + restore + keyboard shortcuts
  React.useEffect(() => {
    if (!tourOpen) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => {
      const root = dialogRef.current;
      if (!root) return;
      root.querySelector<HTMLElement>(focusableSelector)?.focus();
    }, 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        void dismissTour(false);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        void goNext();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
      previousFocus.current?.focus?.();
    };
  }, [tourOpen, dismissTour, goNext, goBack, focusableSelector]);

  if (!tourOpen || !track || !step) return null;

  const title = t(step.titleKey);
  const body = t(step.bodyKey);
  const howTo = resolveGuideHowTo(t as (k: string, o?: Record<string, unknown>) => unknown, step.id);
  const guideRequired = Boolean(meta?.guideRequired);
  const accent = isCompletion ? "emerald" : "indigo";
  const StepIcon = isCompletion ? PartyPopper : isIntro ? Sparkles : BookOpen;

  const motionProps = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 12, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 8, scale: 0.98 },
        transition: { duration: 0.2, ease: "easeOut" as const },
      };

  const clampedLeft = (r: DOMRect) =>
    Math.min(Math.max(EDGE_GAP, r.left), window.innerWidth - CARD_MAX_W - EDGE_GAP);

  const placementStyle: React.CSSProperties = (() => {
    if (isMobile) return {};
    if (!rect) return { top: "16%", left: "50%", transform: "translateX(-50%)" };
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < 340 && rect.top > spaceBelow;
    return placeAbove
      ? { bottom: window.innerHeight - rect.top + EDGE_GAP, left: clampedLeft(rect) }
      : { top: rect.bottom + EDGE_GAP, left: clampedLeft(rect) };
  })();

  const coach = (
    <motion.div
      key="coach"
      ref={dialogRef}
      {...motionProps}
      className={cn(
        "z-[80] flex max-h-[calc(100dvh-1.5rem)] w-[min(100vw-1.5rem,24rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-12px_rgb(15,23,42,0.35)]",
        isMobile ? "fixed inset-x-3 bottom-3" : "fixed"
      )}
      style={placementStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-coach-title"
      aria-describedby="guide-coach-body"
    >
      {isMobile ? (
        <div className="flex justify-center pt-2.5" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-slate-200" />
        </div>
      ) : null}

      <div className="overflow-y-auto p-5">
        {/* Progress segments */}
        <div className="flex items-center gap-1" aria-hidden>
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i < index ? "bg-indigo-500" : i === index ? "bg-indigo-600" : "bg-slate-200"
              )}
            />
          ))}
        </div>

        <div className={cn("mt-4 flex items-start gap-3")}>
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              accent === "emerald"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-indigo-50 text-indigo-600"
            )}
          >
            <StepIcon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-[11px] font-bold uppercase tracking-[0.14em]",
                accent === "emerald" ? "text-emerald-600" : "text-indigo-600"
              )}
            >
              {t(track.titleKey)}
            </p>
            <h3
              id="guide-coach-title"
              className="mt-0.5 font-heading text-base font-extrabold tracking-tight text-slate-900"
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void dismissTour(false)}
            className="-me-1 -mt-1 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("guide.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {t("guide.whatItIsLabel")}
          </p>
          <p id="guide-coach-body" className="mt-1 text-sm leading-relaxed text-slate-600">
            {body}
          </p>
        </div>

        {howTo.length > 0 ? (
          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
              {t("guide.howToLabel")}
            </p>
            <ul className="mt-2 space-y-2">
              {howTo.map((line) => (
                <li key={line} className="flex gap-2 text-xs leading-relaxed text-slate-600">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {guideRequired && progress?.status !== "COMPLETED" ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            {t("guide.requiredHint")}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={index === 0}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-0"
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("guide.back")}
          </button>
          <div className="flex items-center gap-2">
            {!isIntro && !isCompletion && step.route ? (
              <button
                type="button"
                onClick={goThere}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {t("guide.goThere")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void goNext()}
              className={cn(
                "inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white shadow-lg",
                accent === "emerald"
                  ? "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-500"
                  : "bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-500"
              )}
            >
              {isCompletion || isLast ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  {t("guide.finish")}
                </>
              ) : (
                <>
                  {t("guide.next")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold tabular-nums text-slate-400">
            {t("guide.stepOf", { current: index + 1, total: steps.length })}
          </span>
          {!isCompletion ? (
            <button
              type="button"
              onClick={() => void goSkip()}
              className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              <SkipForward className="h-3.5 w-3.5" aria-hidden />
              {t("guide.skip")}
            </button>
          ) : null}
        </div>

        {!guideRequired ? (
          <button
            type="button"
            onClick={() => void dismissTour(true)}
            className="mt-2 text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            {t("guide.dontShowAgain")}
          </button>
        ) : null}
      </div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>
      {tourOpen ? (
        <>
          {rect && !isMobile ? (
            <div
              key="spotlight"
              className="pointer-events-none fixed z-[70] rounded-2xl ring-2 ring-indigo-400/90 transition-[top,left,width,height] duration-200"
              style={{
                top: rect.top - 6,
                left: rect.left - 6,
                width: rect.width + 12,
                height: rect.height + 12,
                boxShadow: "0 0 0 9999px rgb(15 23 42 / 0.55)",
              }}
              aria-hidden
            />
          ) : (
            <motion.div
              key="dim"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              className="pointer-events-none fixed inset-0 z-[70] bg-slate-950/55"
              aria-hidden
            />
          )}
          {coach}
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
