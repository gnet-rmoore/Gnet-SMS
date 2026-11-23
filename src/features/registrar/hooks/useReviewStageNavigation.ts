import { useCallback, useMemo, useRef, useState } from "react";
import type { AdmissionStage, BrowsableStage, StageSnapshot } from "../lib/admissionStage";
import { canBrowseStage } from "../lib/admissionStage";

export type ReviewViewState = { mode: "active"; stage: AdmissionStage } | { mode: "history"; stage: BrowsableStage };
export type StageAnnouncement = { key: string; stage: string } | null;

export function createSnapshot(input: Partial<StageSnapshot>): StageSnapshot {
  return {
    selectedApp: input.selectedApp ?? null,
    evaluationData: input.evaluationData ?? null,
    docsChecklist: input.docsChecklist ?? null,
    selectedClassroomId: input.selectedClassroomId ?? "",
    waiveFee: input.waiveFee ?? false,
    waiveDocs: input.waiveDocs ?? false,
    nextAction: input.nextAction ?? null,
    entranceResult: input.entranceResult ?? "SAT",
    entranceNotes: input.entranceNotes ?? "",
  };
}

export function snapshotsEqual(a: StageSnapshot | null, b: StageSnapshot | null) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useReviewStageNavigation(activeStage: AdmissionStage) {
  const [view, setView] = useState<ReviewViewState>({ mode: "active", stage: activeStage });
  const [announcement, setAnnouncement] = useState<StageAnnouncement>(null);
  const snapshotRef = useRef<StageSnapshot | null>(null);
  const [snapshot, setSnapshot] = useState<StageSnapshot | null>(null);

  const currentView = useMemo<ReviewViewState>(() => {
    if (view.mode === "history" && !canBrowseStage(view.stage, activeStage)) {
      return { mode: "active", stage: activeStage };
    }
    if (view.mode === "active") return { mode: "active", stage: activeStage };
    return view;
  }, [activeStage, view]);

  const captureSnapshot = useCallback((next: Partial<StageSnapshot>) => {
    const snap = createSnapshot(next);
    snapshotRef.current = snap;
    setSnapshot(snap);
    return snap;
  }, []);

  const selectStage = useCallback((stage: AdmissionStage, active: AdmissionStage, stageLabel: string) => {
    if (stage === active) {
      setView({ mode: "active", stage: active });
      setAnnouncement({ key: "admissions.review.stage.returnedToCurrent", stage: stageLabel });
      return;
    }
    if (canBrowseStage(stage, active)) {
      setView({ mode: "history", stage });
      setAnnouncement({ key: "admissions.review.stage.viewingCompleted", stage: stageLabel });
    }
  }, []);

  const returnToCurrent = useCallback((stageLabel: string) => {
    setView({ mode: "active", stage: activeStage });
    setAnnouncement({ key: "admissions.review.stage.returnedToCurrent", stage: stageLabel });
  }, [activeStage]);

  const resetOnMutation = useCallback((next: Partial<StageSnapshot>, active: AdmissionStage, stageLabel: string) => {
    captureSnapshot(next);
    setView({ mode: "active", stage: active });
    setAnnouncement({ key: "admissions.review.stage.returnedToCurrent", stage: stageLabel });
  }, [captureSnapshot]);

  return { view: currentView, snapshot, snapshotRef, announcement, captureSnapshot, selectStage, returnToCurrent, resetOnMutation, setView };
}
