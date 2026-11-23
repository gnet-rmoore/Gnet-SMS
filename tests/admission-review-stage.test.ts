/**
 * Pure stage resolver for registrar application review.
 * Run: npx tsx tests/admission-review-stage.test.ts
 */
import {
  BROWSABLE_STAGES,
  canBrowseStage,
  getCompletedStages,
  getStageHistorySummary,
  resolveAdmissionStage,
  stageToStepper,
  stepperToStage,
} from "../src/features/registrar/lib/admissionStage.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) { console.error(`FAILED: ${msg}`); failed++; } else { console.log(`PASSED: ${msg}`); }
}

function view(input: Parameters<typeof resolveAdmissionStage>[0]) {
  return resolveAdmissionStage(input);
}

const base = { status: "PENDING", nextAction: "REVIEW" as const, blockedBy: [] as string[] };

console.log("=== admission-review-stage ===");

{
  const v = view(base);
  assert(v.stage === "SUBMITTED" && v.fieldKeys.join() === "photo" && v.primaryActionKey === "confirmDetails" && v.secondaryActionKeys.length === 0, "PENDING+REVIEW -> SUBMITTED");
}
{
  const v = view({ ...base, nextAction: null });
  assert(v.stage === "SUBMITTED" && v.primaryActionKey === null, "PENDING+null -> SUBMITTED no CTA");
}
{
  const v = view({ ...base, nextAction: "SOMETHING" });
  assert(v.stage === "SUBMITTED" && v.primaryActionKey === null, "PENDING+unexpected -> SUBMITTED no CTA");
}

{
  const v = view({ status: "UNDER_REVIEW", nextAction: "APPROVE", blockedBy: [], reviewComplete: false });
  assert(v.stage === "REVIEW" && v.fieldKeys.join() === "score,interview,comments" && v.primaryActionKey === "saveReview" && v.secondaryActionKeys.join() === "moveToWaitlist,reject", "UNDER_REVIEW -> REVIEW saveReview");
}
{
  const v = view({ status: "WAITLISTED", nextAction: "APPROVE", blockedBy: [], reviewComplete: false });
  assert(v.stage === "REVIEW" && v.secondaryActionKeys.join() === "returnToReview,reject", "WAITLISTED hides moveToWaitlist");
}
{
  const v = view({ status: "UNDER_REVIEW", nextAction: "APPROVE", blockedBy: [], reviewComplete: true });
  assert(v.stage === "ENTRANCE" && v.fieldKeys.join() === "entranceResult,entranceNotes,feeStatus" && v.primaryActionKey === "recordEntrance", "reviewComplete -> ENTRANCE recordEntrance");
}
{
  const v = view({ status: "UNDER_REVIEW", nextAction: "APPROVE", blockedBy: [], reviewComplete: true, entranceResult: "SAT" });
  assert(v.stage === "APPROVED" && v.primaryActionKey === "approve", "passing entrance -> APPROVED approve");
}
{
  const v = view({ status: "UNDER_REVIEW", nextAction: "APPROVE", blockedBy: [], reviewComplete: true, entranceStatus: "COMPLETED", entranceResult: "NOT_PASSED" });
  assert(v.stage === "ENTRANCE" && v.blockedBy.includes("ENTRANCE_NOT_PASSED"), "failing entrance blocks approval");
}

for (const status of ["APPROVED", "FEE_PENDING", "DOCS_PENDING"]) {
  const v = view({ status, nextAction: "ENROLL", blockedBy: [], documentEligibility: { eligible: true } });
  assert(v.stage === "APPROVED" && v.fieldKeys.join() === "documents,feeStatus" && v.primaryActionKey === "finalizeEnrollment", `${status} -> APPROVED finalize`);
}
{
  const v = view({ status: "APPROVED", nextAction: "ENROLL", blockedBy: [], documentEligibility: { eligible: false, reason: "NOT_APPROVED_YET" } });
  assert(v.stage === "APPROVED" && v.primaryActionKey === null && v.secondaryActionKeys.join() === "refresh", "ineligible documents wait with refresh");
}
{
  const v = view({ status: "APPROVED", nextAction: "ENROLL", blockedBy: ["FEE_REQUIRED"], documentEligibility: { eligible: true } });
  assert(v.stage === "APPROVED" && v.primaryActionKey === "finalizeEnrollment" && v.primaryActionDisabledReasonKey === "admissions.review.blocker.FEE_REQUIRED", "fee blocker disables finalize");
}
{
  const v = view({ status: "ENROLLED", nextAction: "DONE", blockedBy: [] });
  assert(v.stage === "ENROLLED" && v.substep === null && v.fieldKeys.join() === "classroom" && v.primaryActionKey === "confirmPlacement", "ENROLLED -> class placement");
}

assert(view({ status: "REJECTED", nextAction: null, blockedBy: [] }).stage === "TERMINAL", "REJECTED terminal");
assert(view({ status: "WITHDRAWN", nextAction: null, blockedBy: [] }).stage === "TERMINAL", "WITHDRAWN terminal");
assert(view({ status: "WEIRD", nextAction: null, blockedBy: [] }).stage === "REVIEW", "Unknown -> REVIEW fallback");

for (const s of ["PENDING","UNDER_REVIEW","WAITLISTED","APPROVED","FEE_PENDING","DOCS_PENDING","ENROLLED","REJECTED","WITHDRAWN"]) {
  const v = view({ status: s, nextAction: "REVIEW", blockedBy: [], reviewComplete: true, documentEligibility: { eligible: true } });
  assert(v.secondaryActionKeys.length <= 2, `secondary actions bounded: ${s}`);
}
assert(getCompletedStages("TERMINAL").length === 0, "terminal has no completed stages");
assert(getCompletedStages("ENROLLED").join() === "SUBMITTED,REVIEW,ENTRANCE,APPROVED", "enrolled completed stages");
assert(!getCompletedStages("ENROLLED").includes("ENROLLED" as never), "ENROLLED never in completed");
assert(canBrowseStage("ENTRANCE", "APPROVED") === true, "can browse earlier");
assert(canBrowseStage("APPROVED", "APPROVED") === false, "cannot browse current");
assert(canBrowseStage("ENROLLED", "TERMINAL") === false, "cannot browse enrolled");
assert(BROWSABLE_STAGES.join() === "SUBMITTED,REVIEW,ENTRANCE,APPROVED", "browsable stages fixed");

for (const stage of ["REVIEW", "ENTRANCE", "APPROVED"] as const) {
  const rows = getStageHistorySummary(stage, { selectedApp: { status: "APPROVED", notes: "{}" }, evaluationData: { testScore: "82", interviewRating: "4" } });
  assert(rows.length > 0 && rows.every(r => r.labelKey && r.value !== undefined), `${stage} history summary rows`);
}

assert(stageToStepper("ENTRANCE") === "ENTRANCE", "ENTRANCE -> ENTRANCE");
assert(stepperToStage("ENTRANCE") === "ENTRANCE", "ENTRANCE adapter identity");
assert(stageToStepper("TERMINAL") === null, "TERMINAL -> null stepper");

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("All admission-review-stage tests passed");
