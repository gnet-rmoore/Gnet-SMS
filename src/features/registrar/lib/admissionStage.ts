import type { ApplicationReviewModalProps } from "../components/ApplicationReviewModal";
import { canonicalGradeName } from "../../academics-shared/gradeSubjectLabels";

export type AdmissionStage = "SUBMITTED" | "REVIEW" | "ENTRANCE" | "APPROVED" | "ENROLLED" | "TERMINAL";
export type StepperStage = Exclude<AdmissionStage, "TERMINAL">;
export type BrowsableStage = Exclude<AdmissionStage, "TERMINAL" | "ENROLLED">;
export type EnrolledSubstep = null;

export type NextActionState = "loading" | "loaded" | "error";

export type StageSnapshot = Pick<
  ApplicationReviewModalProps,
  "selectedApp" | "evaluationData" | "docsChecklist" | "selectedClassroomId" | "waiveFee" | "waiveDocs"
> & {
  nextAction: Record<string, unknown> | null;
  entranceResult: string;
  entranceNotes: string;
};

export type AdmissionStageView = {
  stage: AdmissionStage;
  step: number | null;
  titleKey: string;
  descriptionKey: string;
  fieldKeys: string[];
  primaryActionKey: string | null;
  secondaryActionKeys: string[];
  blockedBy: string[];
  substep: EnrolledSubstep;
  primaryActionDisabledReasonKey?: string | null;
};

export type StageHistorySummary = {
  stage: BrowsableStage;
  rows: Array<{ labelKey: string; value: string }>;
};

export const STAGE_ORDER: AdmissionStage[] = ["SUBMITTED", "REVIEW", "ENTRANCE", "APPROVED", "ENROLLED"];
export const BROWSABLE_STAGES: BrowsableStage[] = ["SUBMITTED", "REVIEW", "ENTRANCE", "APPROVED"];

const STAGE_INDEX: Record<AdmissionStage, number> = {
  SUBMITTED: 0, REVIEW: 1, ENTRANCE: 2, APPROVED: 3, ENROLLED: 4, TERMINAL: -1,
};

export function stageToStepper(stage: AdmissionStage): StepperStage | null {
  return stage === "TERMINAL" ? null : stage;
}

export function stepperToStage(stage: StepperStage): AdmissionStage {
  return stage;
}

export function canBrowseStage(stage: AdmissionStage, activeStage: AdmissionStage): stage is BrowsableStage {
  if (activeStage === "TERMINAL") return false;
  if (!BROWSABLE_STAGES.includes(stage as BrowsableStage)) return false;
  return STAGE_INDEX[stage] < STAGE_INDEX[activeStage];
}

export function getCompletedStages(activeStage: AdmissionStage): BrowsableStage[] {
  if (activeStage === "TERMINAL") return [];
  return BROWSABLE_STAGES.filter((s) => STAGE_INDEX[s] < STAGE_INDEX[activeStage]);
}

type ResolveInput = {
  status?: string | null;
  nextAction?: string | null;
  blockedBy?: string[] | null;
  entranceStatus?: string | null;
  entranceResult?: string | null;
  reviewComplete?: boolean;
  documentEligibility?: { eligible?: boolean; reason?: string } | null;
  feePaymentId?: string | null;
  feeStatus?: string | null;
};

function titleDesc(stage: AdmissionStage) {
  switch (stage) {
    case "SUBMITTED": return { titleKey: "admissions.review.stage.submitted.title", descriptionKey: "admissions.review.stage.submitted.description" };
    case "REVIEW": return { titleKey: "admissions.review.stage.review.title", descriptionKey: "admissions.review.stage.review.description" };
    case "ENTRANCE": return { titleKey: "admissions.review.stage.entrance.title", descriptionKey: "admissions.review.stage.entrance.description" };
    case "APPROVED": return { titleKey: "admissions.review.stage.approved.title", descriptionKey: "admissions.review.stage.approved.description" };
    case "ENROLLED": return { titleKey: "admissions.review.stage.enrolled.title", descriptionKey: "admissions.review.stage.enrolled.description" };
    default: return { titleKey: "admissions.review.stage.terminalTitle", descriptionKey: "admissions.review.stage.terminalHint" };
  }
}

function entrancePassed(result?: string | null): boolean {
  return ["SAT", "EXEMPT", "PASSED"].includes(String(result || "").toUpperCase());
}

function entranceDone(status?: string | null): boolean {
  return String(status || "").toUpperCase() === "COMPLETED";
}

export function resolveAdmissionStage(input: ResolveInput): AdmissionStageView {
  const status = String(input.status || "PENDING").toUpperCase();
  const blockedBy = Array.isArray(input.blockedBy) ? input.blockedBy.map(String) : [];
  const td = titleDesc;
  const result = String(input.entranceResult || "").toUpperCase();
  const passed = entrancePassed(result);
  const done = entranceDone(input.entranceStatus) || passed;

  if (status === "REJECTED" || status === "WITHDRAWN") {
    return { stage: "TERMINAL", step: null, ...td("TERMINAL"), fieldKeys: [], primaryActionKey: null, secondaryActionKeys: [], blockedBy: [], substep: null };
  }

  if (status === "PENDING") {
    return {
      stage: "SUBMITTED", step: 1, ...td("SUBMITTED"), fieldKeys: ["photo"],
      primaryActionKey: input.nextAction === "REVIEW" ? "confirmDetails" : null,
      secondaryActionKeys: [], blockedBy, substep: null,
    };
  }

  if (status === "UNDER_REVIEW" || status === "WAITLISTED") {
    if (!input.reviewComplete) {
      return {
        stage: "REVIEW", step: 2, ...td("REVIEW"), fieldKeys: ["score", "interview", "comments"],
        primaryActionKey: "saveReview",
        secondaryActionKeys: status === "WAITLISTED" ? ["returnToReview", "reject"] : ["moveToWaitlist", "reject"],
        blockedBy, substep: null,
      };
    }
    if (!done || !passed) {
      return {
        stage: "ENTRANCE", step: 3, ...td("ENTRANCE"), fieldKeys: ["entranceResult", "entranceNotes", "feeStatus"],
        primaryActionKey: "recordEntrance",
        secondaryActionKeys: ["reject"],
        blockedBy: !passed && done ? [...blockedBy, "ENTRANCE_NOT_PASSED"] : blockedBy,
        substep: null,
      };
    }
    return {
      stage: "APPROVED", step: 4, ...td("APPROVED"), fieldKeys: [],
      primaryActionKey: "approve",
      secondaryActionKeys: status === "WAITLISTED" ? ["returnToReview", "reject"] : ["reject"],
      blockedBy, substep: null,
    };
  }

  if (["APPROVED", "FEE_PENDING", "DOCS_PENDING"].includes(status)) {
    const canFinalize = input.documentEligibility?.eligible === true;
    const feeBlocked = blockedBy.includes("FEE_REQUIRED") || blockedBy.includes("CLASSROOM_REQUIRED");
    return {
      stage: "APPROVED", step: 4, ...td("APPROVED"),
      fieldKeys: canFinalize ? ["documents", "feeStatus"] : [],
      primaryActionKey: canFinalize ? "finalizeEnrollment" : null,
      secondaryActionKeys: canFinalize ? [] : ["refresh"],
      blockedBy,
      substep: null,
      primaryActionDisabledReasonKey: canFinalize && feeBlocked ? "admissions.review.blocker.FEE_REQUIRED" : null,
    };
  }

  if (status === "ENROLLED") {
    return {
      stage: "ENROLLED", step: 5, ...td("ENROLLED"), fieldKeys: ["classroom"],
      primaryActionKey: "confirmPlacement", secondaryActionKeys: [], blockedBy, substep: null,
    };
  }

  return {
    stage: "REVIEW", step: 2, ...td("REVIEW"), fieldKeys: ["score", "interview", "comments"],
    primaryActionKey: "saveReview", secondaryActionKeys: ["moveToWaitlist", "reject"], blockedBy, substep: null,
  };
}

export function getStageHistorySummary(stage: BrowsableStage, snapshot: Partial<StageSnapshot>): StageHistorySummary["rows"] {
  const app = (snapshot.selectedApp || {}) as any;
  const evalData = (snapshot.evaluationData || {}) as any;
  const docs = Array.isArray(app.admissionDocuments) ? app.admissionDocuments : [];
  const docChecked = Object.values((snapshot.docsChecklist || {}) as Record<string, boolean>).filter(Boolean).length;
  const rows: Array<{ labelKey: string; value: string }> = [];
  if (stage === "SUBMITTED") {
    rows.push({ labelKey: "admissions.review.stage.summary.decision", value: String(app.status || "PENDING") });
    rows.push({ labelKey: "admissions.review.gender", value: String(app.gender || "-") });
    rows.push({ labelKey: "admissions.review.dateOfBirth", value: app.dob ? String(app.dob).slice(0, 10) : "-" });
    if (app.gradeLevel?.name || app.gradeLevelName) rows.push({ labelKey: "admissions.review.appliedGrade", value: canonicalGradeName(app.gradeLevel?.name || app.gradeLevelName) });
    if (app.address) rows.push({ labelKey: "admissions.review.homeAddress", value: String(app.address) });
    rows.push({ labelKey: "admissions.review.guardianDetails", value: String(app.parentName || "-") });
    rows.push({ labelKey: "admissions.review.stage.summary.documents", value: String(docs.length) });
  } else if (stage === "REVIEW") {
    rows.push({ labelKey: "admissions.review.stage.summary.score", value: String(evalData.testScore ?? "-") });
    rows.push({ labelKey: "admissions.review.stage.summary.interview", value: String(evalData.interviewRating ?? "-") });
    rows.push({ labelKey: "admissions.review.stage.summary.decision", value: String(app.status || "-") });
  } else if (stage === "ENTRANCE") {
    rows.push({ labelKey: "admissions.review.stage.enrolled.entranceTitle", value: String(app.entranceResult || snapshot.entranceResult || "-") });
    if (app.entranceNotes || snapshot.entranceNotes) rows.push({ labelKey: "admissions.review.entranceNotes", value: String(app.entranceNotes || snapshot.entranceNotes) });
    rows.push({ labelKey: "admissions.review.feePaymentId", value: String(app.feePaymentId || "-") });
  } else if (stage === "APPROVED") {
    rows.push({ labelKey: "admissions.review.stage.summary.documents", value: `${docChecked}/4` });
    rows.push({ labelKey: "admissions.review.stage.summary.decision", value: String(app.admissionDecision || app.status || "-") });
    rows.push({ labelKey: "admissions.review.feeStatus", value: String(app.feeStatus || app.status || "-") });
  }
  return rows;
}
