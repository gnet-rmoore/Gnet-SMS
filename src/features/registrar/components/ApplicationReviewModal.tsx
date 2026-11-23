import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui";
import { useDrawerA11y } from "../../../hooks/useDrawerA11y";
import { registrarApi } from "../api";
import {
  canBrowseStage,
  getCompletedStages,
  resolveAdmissionStage,
  type AdmissionStage,
  type BrowsableStage,
  type NextActionState,
} from "../lib/admissionStage";
import { createSnapshot, snapshotsEqual, useReviewStageNavigation } from "../hooks/useReviewStageNavigation";
import { ReviewDrawerShell } from "./review/ReviewDrawerShell";
import { StageRail } from "./review/StageRail";
import { StageHistoryBanner } from "./review/StageHistoryBanner";
import { BrowsePreviousMenu } from "./review/BrowsePreviousMenu";
import { StageFrame } from "./review/StageFrame";

export type ApplicationReviewModalProps = {
  classrooms?: any;
  docsChecklist?: any;
  evaluationData?: any;
  handleSaveReview?: any;
  handleToggleDoc?: any;
  selectedApp?: any;
  selectedClassroomId?: any;
  setEvaluationData?: any;
  setSelectedClassroomId?: any;
  setShowAppReviewModal?: any;
  submitting?: any;
  handleUploadAdmissionDoc?: (docType: string, file: File) => Promise<void>;
  handleReviewAdmissionDoc?: (docId: string, status: "APPROVED" | "REJECTED") => Promise<void>;
  uploadingDoc?: boolean;
  waiveFee?: boolean;
  setWaiveFee?: (v: boolean) => void;
  waiveDocs?: boolean;
  setWaiveDocs?: (v: boolean) => void;
  entranceFeeAmount?: string;
  setEntranceFeeAmount?: (v: string) => void;
  handleCreateEntranceFee?: (amount?: number) => Promise<void>;
  handleCompleteEntrance?: (entranceResult: string, entranceNotes?: string) => Promise<void>;
  students?: Array<{ id: string; photoUrl?: string | null }>;
  onPhotoError?: (message: string) => void;
  onPhotoSuccess?: (message: string) => void;
  [key: string]: any;
};

export function ApplicationReviewModal(props: ApplicationReviewModalProps) {
  const {
    classrooms,
    docsChecklist,
    evaluationData,
    handleSaveReview,
    handleToggleDoc,
    selectedApp,
    selectedClassroomId,
    setEvaluationData,
    setSelectedClassroomId,
    setShowAppReviewModal,
    submitting,
    handleUploadAdmissionDoc,
    handleReviewAdmissionDoc,
    uploadingDoc,
    waiveFee = false,
    setWaiveFee,
    waiveDocs = false,
    setWaiveDocs,
    entranceFeeAmount = "",
    setEntranceFeeAmount,
    handleCreateEntranceFee,
    handleCompleteEntrance,
    students = [],
    onPhotoError,
    onPhotoSuccess,
  } = props;
  const { t } = useTranslation(["pages", "common"]);
  const [nextActionState, setNextActionState] = useState<NextActionState>("loading");
  const [nextActionData, setNextActionData] = useState<{ nextAction: string | null; blockedBy: string[]; documentEligibility: { eligible: boolean; reason?: string } | null }>({ nextAction: null, blockedBy: [], documentEligibility: null });
  const [entranceResult, setEntranceResult] = useState("SAT");
  const [entranceNotes, setEntranceNotes] = useState("");
  const [confirm, setConfirm] = useState<null | "reject" | "dirty">(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const rejectRef = useRef<HTMLButtonElement>(null);
  const confirmDialogRef = useRef<HTMLDivElement>(null);
  const refreshRef = useRef<() => void>(() => undefined);

  const entranceStatus = selectedApp?.entranceStatus || (selectedApp?.entranceCompletedAt ? "COMPLETED" : "PENDING");
  const stageView = useMemo(() => {
    if (nextActionState !== "loaded") return null;
    return resolveAdmissionStage({
      status: selectedApp?.status,
      nextAction: nextActionData.nextAction,
      blockedBy: nextActionData.blockedBy,
      entranceStatus,
      documentEligibility: nextActionData.documentEligibility,
      entranceFeeAmount,
    });
  }, [nextActionState, nextActionData, selectedApp?.status, entranceStatus, entranceFeeAmount]);
  const activeStage: AdmissionStage = stageView?.stage || "SUBMITTED";
  const nav = useReviewStageNavigation(activeStage);
  const completedStages = getCompletedStages(activeStage);

  const liveSnapshot = useMemo(() => createSnapshot({
    selectedApp, evaluationData, docsChecklist, selectedClassroomId, entranceFeeAmount, waiveFee, waiveDocs,
    nextAction: nextActionData as any, entranceResult, entranceNotes,
  }), [selectedApp, evaluationData, docsChecklist, selectedClassroomId, entranceFeeAmount, waiveFee, waiveDocs, nextActionData, entranceResult, entranceNotes]);
  const dirty = !snapshotsEqual(liveSnapshot, nav.snapshot);

  const refreshNextAction = useCallback(async () => {
    const id = selectedApp?.id;
    if (!id) return;
    setNextActionState("loading");
    try {
      const data = await registrarApi.getNextAction(id);
      setNextActionData({ nextAction: data?.nextAction || null, blockedBy: Array.isArray(data?.blockedBy) ? data.blockedBy : [], documentEligibility: data?.documentEligibility || null });
      setNextActionState("loaded");
    } catch {
      setNextActionState("error");
    }
  }, [selectedApp?.id]);
  refreshRef.current = () => { void refreshNextAction(); };

  useEffect(() => { void refreshNextAction(); }, [refreshNextAction, selectedApp?.status, selectedApp?.entranceCompletedAt]);

  useEffect(() => {
    nav.captureSnapshot({ selectedApp, evaluationData, docsChecklist, selectedClassroomId, entranceFeeAmount, waiveFee, waiveDocs, nextAction: nextActionData as any, entranceResult, entranceNotes });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApp?.id, selectedApp?.status, selectedApp?.entranceCompletedAt, nextActionState]);

  useEffect(() => {
    if (nav.view.mode === "history") historyRef.current?.focus();
    else titleRef.current?.focus();
  }, [nav.view.mode, nav.view.stage]);

  const requestClose = useCallback(() => {
    if (confirm) {
      setConfirm(null);
      if (confirm === "reject") rejectRef.current?.focus();
      else closeRef.current?.focus();
      return;
    }
    if (dirty) { setConfirm("dirty"); return; }
    setShowAppReviewModal(false);
  }, [confirm, dirty, setShowAppReviewModal]);
  const closeRequestRef = useRef(requestClose);
  closeRequestRef.current = requestClose;
  useDrawerA11y({ open: true, panelRef, initialFocusRef: closeRef, trapRef: confirm ? confirmDialogRef : panelRef, onRequestClose: () => closeRequestRef.current() });

  const afterMutation = useCallback(async () => {
    await refreshNextAction();
    nav.resetOnMutation({ selectedApp, evaluationData, docsChecklist, selectedClassroomId, entranceFeeAmount, waiveFee, waiveDocs, nextAction: nextActionData as any, entranceResult, entranceNotes }, activeStage, t(stageView?.titleKey || "", { defaultValue: activeStage }));
  }, [refreshNextAction, nav, selectedApp, evaluationData, docsChecklist, selectedClassroomId, entranceFeeAmount, waiveFee, waiveDocs, nextActionData, entranceResult, entranceNotes, activeStage, stageView, t]);

  const runPrimary = useCallback(async () => {
    const key = stageView?.primaryActionKey;
    if (!key) return;
    if (key === "confirmDetails") await handleSaveReview?.("UNDER_REVIEW", { close: false });
    else if (key === "approve") await handleSaveReview?.("APPROVED", { close: false });
    else if (key === "confirmClass" || key === "finalizeEnrollment") await handleSaveReview?.("ENROLLED", { close: false });
    else if (key === "createEntranceFee") await handleCreateEntranceFee?.(Number(entranceFeeAmount));
    else if (key === "recordEntrance") await handleCompleteEntrance?.(entranceResult, entranceNotes);
    else if (key === "saveDocuments") await handleSaveReview?.(undefined, { close: false });
    await afterMutation();
  }, [stageView, handleSaveReview, handleCreateEntranceFee, handleCompleteEntrance, entranceFeeAmount, entranceResult, entranceNotes, afterMutation]);

  const runSecondary = useCallback(async (key: string) => {
    if (key === "moveToWaitlist") await handleSaveReview?.("WAITLISTED", { close: false });
    else if (key === "returnToReview") await handleSaveReview?.("UNDER_REVIEW", { close: false });
    else if (key === "reject") { setConfirm("reject"); return; }
    else if (key === "refresh") { await refreshNextAction(); return; }
    await afterMutation();
  }, [handleSaveReview, afterMutation, refreshNextAction]);

  const selectStage = useCallback((stage: AdmissionStage) => {
    const label = t(`admissions.stepper.${stage === "ENTRANCE_FEE" ? "fee" : stage.toLowerCase()}`, { defaultValue: stage });
    nav.selectStage(stage, activeStage, label);
  }, [nav, activeStage, t]);

  const primaryLabelKey = !stageView?.primaryActionKey ? null
    : activeStage === "SUBMITTED" ? "admissions.review.stage.submitted.primary"
    : activeStage === "REVIEW" ? "admissions.review.stage.review.primary"
    : activeStage === "APPROVED" ? (stageView.primaryActionKey === "confirmClass" ? "admissions.review.stage.approved.confirmClass" : "admissions.review.stage.approved.finalizeEnrollment")
    : activeStage === "ENTRANCE_FEE" ? "admissions.review.stage.entranceFee.createFee"
    : stageView.substep === "entrance" ? "admissions.review.markEntranceComplete"
    : "admissions.review.stage.enrolled.saveDocuments";

  const headerMeta = (
    <div>
      <span className="text-xs font-black tracking-widest uppercase bg-white/10 px-2 py-0.5 rounded text-white mr-2">{t("admissions.review.hubBadge")}</span>
      <span className="ml-2 text-xs font-black tracking-wider uppercase px-2 py-0.5 rounded bg-white/10 text-slate-100">{selectedApp?.status}</span>
    </div>
  );

  const footer = nav.view.mode === "history" || activeStage === "TERMINAL" || nextActionState !== "loaded" ? (
    <Button type="button" variant="secondary" onClick={requestClose}>{t("common:close")}</Button>
  ) : (
    <>
      <div className="flex items-center gap-3">
        <BrowsePreviousMenu browsableStages={completedStages} onSelect={(s) => selectStage(s)} />
        <Button type="button" variant="secondary" disabled={submitting} onClick={async () => { await handleSaveReview?.(undefined, { close: true }); }}>{t("admissions.review.stage.saveAndClose")}</Button>
      </div>
      <div className="flex items-center gap-2">
        {stageView?.secondaryActionKeys.map((key) => (
          <Button key={key} ref={key === "reject" ? rejectRef : undefined} type="button" variant={key === "reject" ? "danger" : "ghost"} disabled={submitting} onClick={() => runSecondary(key)} className={key === "reject" ? "bg-red-50 hover:bg-red-100 border border-red-200 text-red-700" : undefined}>
            {t(key === "refresh" ? "admissions.review.stage.refresh" : `admissions.review.stage.review.${key}`)}
          </Button>
        ))}
        {stageView?.primaryActionKey ? (
          <Button type="button" variant="primary" loading={submitting} disabled={submitting || (stageView.primaryActionKey === "confirmClass" && !selectedClassroomId)} onClick={runPrimary} className="min-h-11 bg-slate-900 hover:bg-slate-800 text-white border border-slate-900">
            {primaryLabelKey ? t(primaryLabelKey) : null}
          </Button>
        ) : null}
      </div>
    </>
  );

  const confirmDialog = confirm ? (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <button type="button" aria-label={t("common:close")} onClick={() => setConfirm(null)} className="absolute inset-0 bg-slate-950/50" />
      <div ref={confirmDialogRef} role="alertdialog" aria-modal="true" aria-labelledby="review-confirm-title" className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h4 id="review-confirm-title" className="text-lg font-extrabold text-slate-900">{t(`admissions.review.confirm.${confirm === "reject" ? "reject.title" : "dirtyClose.title"}`)}</h4>
        <p className="mt-2 text-sm text-slate-600">{t(`admissions.review.confirm.${confirm === "reject" ? "reject.body" : "dirtyClose.body"}`)}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => { setConfirm(null); rejectRef.current?.focus(); }}>{t(`admissions.review.confirm.${confirm === "reject" ? "reject.cancel" : "dirtyClose.cancel"}`)}</Button>
          {confirm === "dirty" ? (
            <>
              <Button type="button" variant="secondary" onClick={() => { setConfirm(null); setShowAppReviewModal(false); }}>{t("admissions.review.confirm.dirtyClose.discard")}</Button>
              <Button type="button" variant="primary" autoFocus onClick={async () => { setConfirm(null); await handleSaveReview?.(undefined, { close: true }); }}>{t("admissions.review.confirm.dirtyClose.save")}</Button>
            </>
          ) : (
            <Button type="button" variant="danger" autoFocus onClick={async () => { setConfirm(null); await handleSaveReview?.("REJECTED", { close: false }); await afterMutation(); }}>{t("admissions.review.confirm.reject.confirm")}</Button>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <ReviewDrawerShell
        panelRef={panelRef}
        closeRef={closeRef}
        onClose={requestClose}
        titleId="application-review-drawer-title"
        descriptionId="application-review-drawer-desc"
        description={stageView ? t(stageView.descriptionKey) : t("admissions.review.stage.terminalHint")}
        title={t("admissions.review.evaluating", { name: selectedApp?.studentName })}
        headerMeta={headerMeta}
        stageRail={<StageRail status={selectedApp?.status} nextAction={nextActionData.nextAction} blockedBy={nextActionData.blockedBy} activeStage={activeStage} browsableStages={completedStages} onStageSelect={selectStage} />}
        historyBanner={nav.view.mode === "history" ? <StageHistoryBanner stageLabel={t(`admissions.stepper.${nav.view.stage === "ENTRANCE_FEE" ? "fee" : nav.view.stage.toLowerCase()}`, { defaultValue: nav.view.stage })} onReturn={() => nav.returnToCurrent(t(stageView?.titleKey || "", { defaultValue: activeStage }))} headingRef={historyRef} /> : undefined}
        footer={footer}
        overlay={confirmDialog}
      >
        {nextActionState !== "loaded" || !stageView ? (
          <div className="space-y-4" aria-busy="true">
            <div className="h-6 w-40 rounded bg-slate-100" />
            <div className="h-32 rounded-2xl bg-slate-100" />
            <div className="h-10 w-48 rounded bg-slate-100" />
          </div>
        ) : (
          <StageFrame
            key={`${nav.view.mode}-${nav.view.stage}`}
            mode={nav.view.mode}
            activeStage={activeStage}
            historyStage={nav.view.mode === "history" ? nav.view.stage : undefined}
            stageView={stageView}
            snapshot={nav.snapshot}
            titleRef={titleRef}
            {...props}
            entranceResult={entranceResult}
            setEntranceResult={setEntranceResult}
            entranceNotes={entranceNotes}
            setEntranceNotes={setEntranceNotes}
            documentEligibility={nextActionData.documentEligibility}
            substep={stageView.substep}
            onRefresh={() => refreshRef.current()}
            onSecondary={runSecondary}
            students={students}
            onPhotoError={onPhotoError}
            onPhotoSuccess={onPhotoSuccess}
          />
        )}
        <p aria-live="polite" className="sr-only">{nav.announcement ? t(nav.announcement.key, { stage: nav.announcement.stage }) : ""}</p>
      </ReviewDrawerShell>
    </>
  );
}