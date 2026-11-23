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

// Submitted
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

// Review
{
  const v = view({ status: "UNDER_REVIEW", nextAction: "APPROVE", blockedBy: [] });
  assert(v.stage === "REVIEW" && v.fieldKeys.join() === "score,interview,comments" && v.primaryActionKey === "approve" && v.secondaryActionKeys.join() === "moveToWaitlist,reject", "UNDER_REVIEW+APPROVE");
}
{
  const v = view({ status: "WAITLISTED", nextAction: "APPROVE", blockedBy: [] });
  assert(v.stage === "REVIEW" && v.secondaryActionKeys.join() === "returnToReview,reject", "WAITLISTED hides moveToWaitlist");
}

// Entrance fee
for (const c of [
  { status: "APPROVED", nextAction: "PAY_FEE" },
  { status: "FEE_PENDING", nextAction: "PAY_FEE" },
  { status: "DOCS_PENDING", nextAction: "PAY_FEE" },
  { status: "DOCS_PENDING", nextAction: "WAIT_DOCS" },
  { status: "APPROVED", nextAction: "APPROVE", blockedBy: ["FEE_REQUIRED"] },
]) {
  const v = view({ ...c, blockedBy: c.blockedBy || [] });
  assert(v.stage === "ENTRANCE_FEE" && v.fieldKeys.join() === "feeAmount,waiveFee,waiveDocs", `Entrance fee: ${c.status}/${c.nextAction}`);
}
{
  const v = view({ status: "APPROVED", nextAction: "APPROVE", blockedBy: ["FEE_REQUIRED"], entranceFeeAmount: "0" });
  assert(v.stage === "ENTRANCE_FEE" && v.primaryActionKey === null, "No-fee state has no primary CTA");
}

// Approved
{
  const v = view({ status: "APPROVED", nextAction: "ASSIGN_CLASS", blockedBy: ["CLASSROOM_REQUIRED"] });
  assert(v.stage === "APPROVED" && v.fieldKeys.join() === "classroom" && v.primaryActionKey === "confirmClass", "APPROVED+ASSIGN_CLASS");
}
{
  const v = view({ status: "FEE_PENDING", nextAction: "ENROLL", blockedBy: [] });
  assert(v.stage === "APPROVED" && v.primaryActionKey === "finalizeEnrollment", "FEE_PENDING+ENROLL finalize");
}
{
  const v = view({ status: "DOCS_PENDING", nextAction: "ENROLL", blockedBy: [] });
  assert(v.stage === "APPROVED" && v.primaryActionKey === "finalizeEnrollment", "DOCS_PENDING+ENROLL finalize");
}

// Enrolled
{
  const v = view({ status: "ENROLLED", nextAction: "DONE", blockedBy: [], entranceStatus: "PENDING" });
  assert(v.stage === "ENROLLED" && v.substep === "entrance" && v.fieldKeys.join() === "entranceResult,entranceNotes", "ENROLLED entrance substep");
}
{
  const v = view({ status: "ENROLLED", nextAction: "DONE", blockedBy: [], entranceStatus: "COMPLETED", documentEligibility: { eligible: true } });
  assert(v.stage === "ENROLLED" && v.substep === "documents" && v.fieldKeys.join() === "documents", "ENROLLED docs substep");
}
{
  const v = view({ status: "ENROLLED", nextAction: "DONE", blockedBy: [], entranceStatus: "COMPLETED", documentEligibility: { eligible: false, reason: "STUDENT_RECORD_MISSING" } });
  assert(v.stage === "ENROLLED" && v.substep === "waiting" && v.fieldKeys.length === 0 && v.primaryActionKey === null, "ENROLLED waiting substep");
}

// Terminal / unknown
{
  assert(view({ status: "REJECTED", nextAction: null, blockedBy: [] }).stage === "TERMINAL", "REJECTED terminal");
  assert(view({ status: "WITHDRAWN", nextAction: null, blockedBy: [] }).stage === "TERMINAL", "WITHDRAWN terminal");
  assert(view({ status: "WEIRD", nextAction: null, blockedBy: [] }).stage === "REVIEW", "Unknown -> REVIEW fallback");
}

// No all-five-status-actions and no terminal browse
for (const s of ["PENDING","UNDER_REVIEW","WAITLISTED","APPROVED","FEE_PENDING","DOCS_PENDING","ENROLLED","REJECTED","WITHDRAWN"]) {
  const v = view({ status: s, nextAction: "REVIEW", blockedBy: [] });
  assert(v.secondaryActionKeys.length <= 2, `secondary actions bounded: ${s}`);
}
assert(getCompletedStages("TERMINAL").length === 0, "terminal has no completed stages");
assert(getCompletedStages("ENROLLED").join() === "SUBMITTED,REVIEW,APPROVED,ENTRANCE_FEE", "enrolled completed stages");
assert(!getCompletedStages("ENROLLED").includes("ENROLLED" as never), "ENROLLED never in completed");
assert(canBrowseStage("SUBMITTED", "REVIEW") === true, "can browse earlier");
assert(canBrowseStage("REVIEW", "REVIEW") === false, "cannot browse current");
assert(canBrowseStage("ENROLLED", "TERMINAL") === false, "cannot browse enrolled");
assert(BROWSABLE_STAGES.join() === "SUBMITTED,REVIEW,APPROVED,ENTRANCE_FEE", "browsable stages fixed");

// History summary
{
  const rows = getStageHistorySummary("REVIEW", { selectedApp: { notes: "{}" }, evaluationData: { testScore: "82", interviewRating: "4", comments: "ok" } });
  assert(rows.length > 0 && rows.every(r => r.labelKey && r.value !== undefined), "review history summary rows");
}

// Stepper adapter
assert(stageToStepper("ENTRANCE_FEE") === "FEE", "ENTRANCE_FEE -> FEE");
assert(stepperToStage("FEE") === "ENTRANCE_FEE", "FEE -> ENTRANCE_FEE");
assert(stageToStepper("TERMINAL") === null, "TERMINAL -> null stepper");

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("All admission-review-stage tests passed");
