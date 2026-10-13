import React from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { fetchGuideProgress, patchGuideProgress, type GuideMeta } from "./api";
import {
  filterStepsForCapabilities,
  filterStepsForStudentAge,
  firstIncompleteStep,
  GUIDE_TRACKS,
  progressPercent,
  wizardTrackForRole,
  type GuideProgress,
  type GuideStepDef,
  type GuideTrackDef,
} from "./catalog";

type GuideContextValue = {
  trackId: string | null;
  track: GuideTrackDef | null;
  steps: GuideStepDef[];
  progress: GuideProgress | null;
  meta: GuideMeta | null;
  loading: boolean;
  percent: number;
  nextStep: GuideStepDef | null;
  tourOpen: boolean;
  setTourOpen: (open: boolean) => void;
  basePath: string;
  refresh: () => Promise<void>;
  markStep: (id: string, status: "done" | "skipped" | "todo") => Promise<void>;
  startTour: (fromStepId?: string) => Promise<void>;
  dismissTour: (permanent?: boolean) => Promise<void>;
  restart: () => Promise<void>;
  completeGuide: () => Promise<void>;
};

const GuideContext = React.createContext<GuideContextValue | null>(null);

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const school = useAuthStore((s) => s.school);
  const capabilities = useAuthStore((s) => s.capabilities);
  const [progress, setProgress] = React.useState<GuideProgress | null>(null);
  const [trackId, setTrackId] = React.useState<string | null>(null);
  const [meta, setMeta] = React.useState<GuideMeta | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tourOpen, setTourOpen] = React.useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const resolvedTrackId = trackId || wizardTrackForRole(user?.role);
  const track = resolvedTrackId ? GUIDE_TRACKS[resolvedTrackId] || null : null;
  const steps = React.useMemo(() => {
    if (!track) return [];
    const capped = filterStepsForCapabilities(track.steps, capabilities);
    return filterStepsForStudentAge(track.id, capped, Boolean(meta?.under13));
  }, [track, capabilities, meta?.under13]);

  const basePath =
    user?.role === "SUPER_ADMIN" ? "/super-admin" : school?.slug ? `/${school.slug}` : "";

  const refresh = React.useCallback(async () => {
    if (!user?.id) {
      setProgress(null);
      setTrackId(null);
      setMeta(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchGuideProgress();
      setTrackId(res.trackId);
      setProgress(res.progress);
      setMeta(res.meta || null);
    } catch {
      const fallback = wizardTrackForRole(user.role);
      setTrackId(fallback);
      setProgress(null);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // Auto-offer tour once per session when not completed
  React.useEffect(() => {
    if (loading || !progress || !track) return;
    if (progress.status === "COMPLETED") return;
    const guideRequired = meta?.guideRequired || school?.guideRequired;
    if (progress.status === "DISMISSED" && !guideRequired) return;
    const key = `sms-guide-offered-${user?.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const t = window.setTimeout(() => setTourOpen(true), 800);
    return () => window.clearTimeout(t);
  }, [loading, progress, track, user?.id, meta?.guideRequired, school?.guideRequired]);

  // Deep link: ?step=<stepId> or ?tour=1
  React.useEffect(() => {
    if (loading || !track || !steps.length) return;
    const stepParam = searchParams.get("step");
    const tourParam = searchParams.get("tour");
    if (!stepParam && tourParam !== "1") return;
    const target =
      (stepParam && steps.find((s) => s.id === stepParam)) ||
      firstIncompleteStep(steps, progress) ||
      steps[0];
    if (!target) return;
    void (async () => {
      await patchGuideProgress({
        status: "IN_PROGRESS",
        activeStepId: target.id,
        sendWelcomeTip: true,
      }).then((res) => {
        setProgress(res.progress);
        setTrackId(res.trackId);
        if (res.meta) setMeta(res.meta);
      });
      setTourOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("step");
      next.delete("tour");
      setSearchParams(next, { replace: true });
    })();
    // Only react when URL params appear — not on every progress change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, track?.id, location.search]);

  const markStep = React.useCallback(
    async (id: string, status: "done" | "skipped" | "todo") => {
      const res = await patchGuideProgress({ markStep: { id, status } });
      setProgress(res.progress);
      setTrackId(res.trackId);
      if (res.meta) setMeta(res.meta);
    },
    []
  );

  const startTour = React.useCallback(
    async (fromStepId?: string) => {
      const res = await patchGuideProgress({
        status: "IN_PROGRESS",
        activeStepId: fromStepId || firstIncompleteStep(steps, progress)?.id || steps[0]?.id || null,
        sendWelcomeTip: true,
      });
      setProgress(res.progress);
      setTrackId(res.trackId);
      if (res.meta) setMeta(res.meta);
      setTourOpen(true);
    },
    [steps, progress]
  );

  const dismissTour = React.useCallback(
    async (permanent?: boolean) => {
      setTourOpen(false);
      const guideRequired = meta?.guideRequired || school?.guideRequired;
      if (permanent && guideRequired && progress?.status !== "COMPLETED") {
        // Soft close only — policy forbids permanent dismiss
        return;
      }
      if (permanent) {
        const res = await patchGuideProgress({ status: "DISMISSED" });
        setProgress(res.progress);
        if (res.meta) setMeta(res.meta);
      }
    },
    [meta?.guideRequired, school?.guideRequired, progress?.status]
  );

  const restart = React.useCallback(async () => {
    const res = await patchGuideProgress({ restart: true });
    setProgress(res.progress);
    setTrackId(res.trackId);
    if (res.meta) setMeta(res.meta);
    setTourOpen(true);
  }, []);

  const completeGuide = React.useCallback(async () => {
    const allDone: Record<string, "done"> = {};
    for (const s of steps) allDone[s.id] = "done";
    const res = await patchGuideProgress({
      status: "COMPLETED",
      steps: allDone,
      completedAt: new Date().toISOString(),
    });
    setProgress(res.progress);
    setTourOpen(false);
  }, [steps]);

  const value: GuideContextValue = {
    trackId: resolvedTrackId,
    track,
    steps,
    progress,
    meta,
    loading,
    percent: progressPercent(steps, progress),
    nextStep: firstIncompleteStep(steps, progress),
    tourOpen,
    setTourOpen,
    basePath,
    refresh,
    markStep,
    startTour,
    dismissTour,
    restart,
    completeGuide,
  };

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

export function useGuide() {
  const ctx = React.useContext(GuideContext);
  if (!ctx) throw new Error("useGuide must be used within GuideProvider");
  return ctx;
}

/** Safe hook when provider may be absent (e.g. public routes). */
export function useGuideOptional() {
  return React.useContext(GuideContext);
}
