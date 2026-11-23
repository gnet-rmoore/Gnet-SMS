import React from "react";
import { useTranslation } from "react-i18next";
import type { AdmissionStage, AdmissionStageView, BrowsableStage, StageSnapshot } from "../../lib/admissionStage";
import { getStageHistorySummary } from "../../lib/admissionStage";
import { StageHeader } from "./StageHeader";
import { ReadOnlyStageView } from "./ReadOnlyStageView";
import { SubmittedStage } from "./stages/SubmittedStage";
import { ReviewStage } from "./stages/ReviewStage";
import { ApprovedStage } from "./stages/ApprovedStage";
import { EntranceFeeStage } from "./stages/EntranceFeeStage";
import { EnrolledStage } from "./stages/EnrolledStage";
import { TerminalStage } from "./stages/TerminalStage";

type Props = {
  mode: "active" | "history";
  activeStage: AdmissionStage;
  historyStage?: BrowsableStage;
  stageView: AdmissionStageView;
  snapshot: StageSnapshot | null;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  [key: string]: any;
};

export function StageFrame(props: Props) {
  const { t } = useTranslation(["pages"]);
  const { mode, activeStage, historyStage, stageView, snapshot, titleRef } = props;

  if (mode === "history" && historyStage && snapshot) {
    const rows = getStageHistorySummary(historyStage, snapshot);
    const label = t(`admissions.stepper.${historyStage === "ENTRANCE_FEE" ? "fee" : historyStage.toLowerCase()}`);
    const historyStep = ["SUBMITTED", "REVIEW", "APPROVED", "ENTRANCE_FEE"].indexOf(historyStage) + 1;
    return (
    <div className="sms-stage-enter space-y-5">
      <StageHeader step={historyStep} total={5} title={label} description={t("admissions.review.stage.historyHint")} titleRef={titleRef} />
        <ReadOnlyStageView rows={rows} />
      </div>
    );
  }

  if (activeStage === "TERMINAL") {
    return <TerminalStage titleRef={titleRef} app={props.selectedApp} />;
  }

  const title = t(stageView.titleKey, { defaultValue: stageView.stage });
  const description = t(stageView.descriptionKey, { defaultValue: "" });
  const stageProps = { ...props, blockedBy: stageView.blockedBy } as any;
  return (
    <div className="sms-stage-enter space-y-5">
      <StageHeader step={stageView.step} total={5} title={title} description={description} titleRef={titleRef} />
      {activeStage === "SUBMITTED" ? <SubmittedStage {...stageProps} /> : null}
      {activeStage === "REVIEW" ? <ReviewStage {...stageProps} /> : null}
      {activeStage === "APPROVED" ? <ApprovedStage {...stageProps} /> : null}
      {activeStage === "ENTRANCE_FEE" ? <EntranceFeeStage {...stageProps} /> : null}
      {activeStage === "ENROLLED" ? <EnrolledStage {...stageProps} /> : null}
    </div>
  );
}