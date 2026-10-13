import React from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowRight, Check, SkipForward, X } from "lucide-react";
import { useGuide } from "./GuideProvider";
import { pathMatchesVisit, type GuideStepDef } from "./catalog";
import { resolveGuideHowTo } from "./guideHowTo";
import { cn } from "../../lib/cn";

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
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const id = window.setInterval(measure, 400);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearInterval(id);
    };
  }, [measure]);

  return rect;
}

export function GuideHost() {
  const { t } = useTranslation("pages");
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
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

  // Focus trap + restore
  React.useEffect(() => {
    if (!tourOpen) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => {
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable[0]?.focus();
    }, 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        void dismissTour(false);
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
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
  }, [tourOpen, dismissTour]);

  if (!tourOpen || !track || !step) return null;

  const title = t(step.titleKey);
  const body = t(step.bodyKey);
  const howTo = resolveGuideHowTo(t as (k: string, o?: Record<string, unknown>) => unknown, step.id);
  const isLast = index >= steps.length - 1;
  const isIntro = step.type === "intro";
  const isCompletion = step.type === "completion";
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
  const guideRequired = Boolean(meta?.guideRequired);
  const motionProps = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 8 },
        transition: { duration: 0.2 },
      };

  const goNext = async () => {
    await markStep(step.id, "done");
    if (isLast || isCompletion) {
      await completeGuide();
      return;
    }
    const next = steps[index + 1];
    setIndex(index + 1);
    if (next?.route && basePath) {
      navigate(`${basePath}/${next.route}`);
    }
  };

  const goSkip = async () => {
    await markStep(step.id, "skipped");
    if (isLast) {
      await completeGuide();
      return;
    }
    setIndex(index + 1);
  };

  const goThere = () => {
    if (step.route && basePath) navigate(`${basePath}/${step.route}`);
  };

  const coach = (
    <motion.div
      ref={dialogRef}
      {...motionProps}
      className={cn(
        "z-[80] w-[min(100vw-1.5rem,26rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgb(15,23,42,0.18)]",
        isMobile ? "fixed inset-x-3 bottom-3" : "fixed"
      )}
      style={
        !isMobile && rect
          ? {
              top: Math.min(rect.bottom + 12, window.innerHeight - 280),
              left: Math.min(Math.max(12, rect.left), window.innerWidth - 420),
            }
          : !isMobile
            ? { top: "18%", left: "50%", transform: "translateX(-50%)" }
            : undefined
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-coach-title"
      aria-describedby="guide-coach-body"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">
            {t(track.titleKey)} · {index + 1}/{steps.length}
          </p>
          <h3 id="guide-coach-title" className="mt-1 text-base font-extrabold tracking-tight text-slate-900">
            {title}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => void dismissTour(false)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          aria-label={t("guide.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p id="guide-coach-body" className="mt-2 text-sm leading-relaxed text-slate-500">
        {body}
      </p>
      {howTo.length > 0 ? (
        <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/90 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
            {t("guide.howToLabel")}
          </p>
          <ol className="mt-1.5 list-decimal space-y-1 ps-4 text-xs leading-relaxed text-slate-600">
            {howTo.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </div>
      ) : null}
      {guideRequired && progress?.status !== "COMPLETED" ? (
        <p className="mt-2 text-xs text-amber-700">{t("guide.requiredHint")}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!isIntro && !isCompletion && step.route ? (
          <button
            type="button"
            onClick={goThere}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
          >
            {t("guide.goThere")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void goNext()}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
        >
          {isCompletion || isLast ? (
            <>
              <Check className="h-4 w-4" />
              {t("guide.finish")}
            </>
          ) : (
            <>
              {t("guide.next")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </>
          )}
        </button>
        {!isCompletion ? (
          <button
            type="button"
            onClick={() => void goSkip()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <SkipForward className="h-3.5 w-3.5" />
            {t("guide.skip")}
          </button>
        ) : null}
      </div>
      {!guideRequired ? (
        <button
          type="button"
          onClick={() => void dismissTour(true)}
          className="mt-3 text-xs font-medium text-slate-400 hover:text-slate-600"
        >
          {t("guide.dontShowAgain")}
        </button>
      ) : null}
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>
      {tourOpen ? (
        <>
          <motion.div
            key="dim"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="pointer-events-none fixed inset-0 z-[70] bg-slate-950/40"
            aria-hidden
          />
          {rect && !isMobile ? (
            <div
              className="pointer-events-none fixed z-[75] rounded-xl ring-4 ring-indigo-500/80 ring-offset-2 ring-offset-transparent"
              style={{
                top: rect.top - 4,
                left: rect.left - 4,
                width: rect.width + 8,
                height: rect.height + 8,
              }}
              aria-hidden
            />
          ) : null}
          {coach}
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
