import React from "react";
import { useTranslation } from "react-i18next";
import { OnboardingStepper, type StepperStage } from "../../../../components/OnboardingStepper";
import type { AdmissionStage, BrowsableStage } from "../../lib/admissionStage";
import { stageToStepper, stepperToStage } from "../../lib/admissionStage";

export function StageRail({
  status,
  nextAction,
  blockedBy,
  activeStage,
  browsableStages,
  onStageSelect,
}: {
  status?: string | null;
  nextAction?: string | null;
  blockedBy?: string[];
  activeStage: AdmissionStage;
  browsableStages: BrowsableStage[];
  onStageSelect: (stage: AdmissionStage) => void;
}) {
  const { t } = useTranslation(["pages"]);
  const active = stageToStepper(activeStage);
  const browsable = browsableStages.map((s) => stageToStepper(s)).filter(Boolean) as StepperStage[];
  const mappedBlockers = (blockedBy || []).map((b) => t(`admissions.review.blocker.${b}`, { defaultValue: t("admissions.review.blocker.fallback") }));
  return (
    <OnboardingStepper
      status={status}
      nextAction={nextAction}
      blockedBy={mappedBlockers}
      activeStage={active}
      browsableStages={browsable}
      onStageSelect={(s) => onStageSelect(stepperToStage(s))}
    />
  );
}