import type { ApplicationReviewModalProps } from "../components/ApplicationReviewModal";

export type AdmissionStage = "SUBMITTED" | "REVIEW" | "APPROVED" | "ENTRANCE_FEE" | "ENROLLED" | "TERMINAL";
export type StepperStage = "SUBMITTED" | "REVIEW" | "APPROVED" | "FEE" | "ENROLLED";
export type BrowsableStage = Exclude<AdmissionStage, "TERMINAL" | "ENROLLED">;
export type EnrolledSubstep = "entrance" | "documents" | "waiting" | null;

export type NextActionState = "loading" | "loaded" | "error";

export type StageSnapshot = Pick<
  ApplicationReviewModalProps,
  "selectedApp" | "evaluationData" | "docsChecklist" | "selectedClassroomId" | "entranceFeeAmount" | "waiveFee" | "waiveDocs"
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

export const STAGE_ORDER: AdmissionStage[] = ["SUBMITTED", "REVIEW", "APPROVED", "ENTRANCE_FEE", "ENROLLED"];
export const BROWSABLE_STAGES: BrowsableStage[] = ["SUBMITTED", "REVIEW", "APPROVED", "ENTRANCE_FEE"];

const STAGE_INDEX: Record<AdmissionStage, number> = {
  SUBMITTED: 0, REVIEW: 1, APPROVED: 2, ENTRANCE_FEE: 3, ENROLLED: 4, TERMINAL: -1,
};

export function stageToStepper(stage: AdmissionStage): StepperStage | null {
  if (stage === "ENTRANCE_FEE") return "FEE";
  if (stage === "TERMINAL") return null;
  return stage;
}

export function stepperToStage(stage: StepperStage): AdmissionStage {
  return stage === "FEE" ? "ENTRANCE_FEE" : stage;
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
  documentEligibility?: { eligible?: boolean; reason?: string } | null;
  entranceFeeAmount?: string | number | null;
};

function titleDesc(stage: AdmissionStage) {
  switch (stage) {
    case "SUBMITTED": return { titleKey: "admissions.review.stage.submitted.title", descriptionKey: "admissions.review.stage.submitted.description" };
    case "REVIEW": return { titleKey: "admissions.review.stage.review.title", descriptionKey: "admissions.review.stage.review.description" };
    case "APPROVED": return { titleKey: "admissions.review.stage.approved.title", descriptionKey: "admissions.review.stage.approved.description" };
    case "ENTRANCE_FEE": return { titleKey: "admissions.review.stage.entranceFee.title", descriptionKey: "admissions.review.stage.entranceFee.description" };
    case "ENROLLED": return { titleKey: "admissions.review.stage.enrolled.title", descriptionKey: "admissions.review.stage.enrolled.description" };
    default: return { titleKey: "admissions.review.stage.terminalTitle", descriptionKey: "admissions.review.stage.terminalHint" };
  }
}

export function resolveAdmissionStage(input: ResolveInput): AdmissionStageView {
  const status = String(input.status || "PENDING").toUpperCase();
  const nextAction = input.nextAction ? String(input.nextAction).toUpperCase() : null;
  const blockedBy = Array.isArray(input.blockedBy) ? input.blockedBy.map(String) : [];
  const feeAmount = Number(input.entranceFeeAmount ?? 0);
  const td = titleDesc;

  if (status === "REJECTED" || status === "WITHDRAWN") {
    return { stage: "TERMINAL", step: null, ...td("TERMINAL"), fieldKeys: [], primaryActionKey: null, secondaryActionKeys: [], blockedBy: [], substep: null };
  }

  if (status === "PENDING") {
    return {
      stage: "SUBMITTED", step: 1, ...td("SUBMITTED"), fieldKeys: ["photo"],
      primaryActionKey: nextAction === "REVIEW" ? "confirmDetails" : null,
      secondaryActionKeys: [], blockedBy, substep: null,
    };
  }

  if (status === "UNDER_REVIEW" || status === "WAITLISTED") {
    return {
      stage: "REVIEW", step: 2, ...td("REVIEW"), fieldKeys: ["score", "interview", "comments"],
      primaryActionKey: "approve",
      secondaryActionKeys: status === "WAITLISTED" ? ["returnToReview", "reject"] : ["moveToWaitlist", "reject"],
      blockedBy, substep: null,
    };
  }

  const isFeeStage = nextAction === "PAY_FEE" || nextAction === "WAIT_DOCS" || (status === "APPROVED" && nextAction === "APPROVE" && blockedBy.includes("FEE_REQUIRED"));
  if ((status === "APPROVED" || status === "FEE_PENDING" || status === "DOCS_PENDING") && isFeeStage) {
    return {
      stage: "ENTRANCE_FEE", step: 4, ...td("ENTRANCE_FEE"), fieldKeys: ["feeAmount", "waiveFee", "waiveDocs"],
      primaryActionKey: feeAmount > 0 ? "createEntranceFee" : null,
      secondaryActionKeys: [], blockedBy, substep: null,
      primaryActionDisabledReasonKey: feeAmount > 0 ? null : "admissions.review.stage.feeNotRequired",
    };
  }

  if ((status === "APPROVED" || status === "FEE_PENDING" || status === "DOCS_PENDING") && (nextAction === "ASSIGN_CLASS" || nextAction === "ENROLL")) {
    const needsClass = blockedBy.includes("CLASSROOM_REQUIRED") || nextAction === "ASSIGN_CLASS";
    return {
      stage: "APPROVED", step: 3, ...td("APPROVED"), fieldKeys: ["classroom"],
      primaryActionKey: needsClass ? "confirmClass" : "finalizeEnrollment",
      secondaryActionKeys: [], blockedBy, substep: null,
    };
  }

  if (status === "ENROLLED") {
    const entranceDone = String(input.entranceStatus || "").toUpperCase() === "COMPLETED";
    if (!entranceDone) {
      return { stage: "ENROLLED", step: 5, ...td("ENROLLED"), fieldKeys: ["entranceResult", "entranceNotes"], primaryActionKey: "recordEntrance", secondaryActionKeys: [], blockedBy, substep: "entrance" };
    }
    if (input.documentEligibility?.eligible) {
      return { stage: "ENROLLED", step: 5, ...td("ENROLLED"), fieldKeys: ["documents"], primaryActionKey: "saveDocuments", secondaryActionKeys: [], blockedBy, substep: "documents" };
    }
    return { stage: "ENROLLED", step: 5, ...td("ENROLLED"), fieldKeys: [], primaryActionKey: null, secondaryActionKeys: [], blockedBy, substep: "waiting" };
  }

  // Unknown status fallback
  return { stage: "REVIEW", step: 2, ...td("REVIEW"), fieldKeys: ["score", "interview", "comments"], primaryActionKey: nextAction === "REVIEW" ? "approve" : "approve", secondaryActionKeys: ["moveToWaitlist", "reject"], blockedBy, substep: null };
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
    if (app.gradeLevel?.name || app.gradeLevelName) rows.push({ labelKey: "admissions.review.appliedGrade", value: String(app.gradeLevel?.name || app.gradeLevelName) });
    if (app.address) rows.push({ labelKey: "admissions.review.homeAddress", value: String(app.address) });
    rows.push({ labelKey: "admissions.review.guardianDetails", value: String(app.parentName || "-") });
    rows.push({ labelKey: "admissions.review.stage.summary.documents", value: String(docs.length) });
  } else if (stage === "REVIEW") {
    rows.push({ labelKey: "admissions.review.stage.summary.score", value: String(evalData.testScore ?? "-") });
    rows.push({ labelKey: "admissions.review.stage.summary.interview", value: String(evalData.interviewRating ?? "-") });
    rows.push({ labelKey: "admissions.review.stage.summary.decision", value: String(app.status || "-") });
  } else if (stage === "APPROVED") {
    rows.push({ labelKey: "admissions.review.stage.summary.class", value: String(snapshot.selectedClassroomId || app.classroomId || "-") });
    rows.push({ labelKey: "admissions.review.stage.summary.fee", value: String(app.feePaymentId || snapshot.entranceFeeAmount || "-") });
  } else if (stage === "ENTRANCE_FEE") {
    rows.push({ labelKey: "admissions.review.stage.summary.fee", value: String(snapshot.entranceFeeAmount || app.feeAmount || "-") });
    rows.push({ labelKey: "admissions.review.feeStatus", value: String(app.status || "-") });
    rows.push({ labelKey: "admissions.review.waiveFee", value: snapshot.waiveFee ? "Yes" : "No" });
    rows.push({ labelKey: "admissions.review.waiveDocs", value: snapshot.waiveDocs ? "Yes" : "No" });
    rows.push({ labelKey: "admissions.review.stage.summary.documents", value: `${docChecked}/4` });
  }
  return rows;
}