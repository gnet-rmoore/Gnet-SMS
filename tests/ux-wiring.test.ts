/**
 * Wiring contracts for the enrollment/admissions/teacher UX plan.
 * These guard the client-to-server paths that are hard to mount without a browser test runner.
 * Run: npx tsx tests/ux-wiring.test.ts
 */
import { readFileSync } from "fs";
import path from "path";
import {
  emptyAdmissionApplicationForm,
  isAdmissionFormEmpty,
} from "../src/features/admission-form/schema";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const enrollmentPage = read("src/features/enrollment/Page.tsx");
const enrollmentApi = read("src/features/enrollment/api.ts");
const registrarHook = read("src/features/registrar/hooks/useRegistrarQuery.ts");
const editStudent = read("src/features/registrar/components/EditStudentModal.tsx");
const lessonApi = read("src/features/lesson-plans/api.ts");
const lessonPage = read("src/features/lesson-plans/Page.tsx");
const publicApply = read("src/pages/PublicApply.tsx");
const gradebook = read("src/features/gradebook/Page.tsx");
const curriculumHook = read("src/features/curriculum/hooks/useCurriculumQuery.ts");
const schedulePage = read("src/features/class-schedule/Page.tsx");
const feesPageActions = read("src/features/fees/hooks/usePageActions.ts");
const applicationReviewModal = read("src/features/registrar/components/ApplicationReviewModal.tsx");
const registrarApi = read("src/features/registrar/api.ts");
const manualAdmissionTab = read("src/features/registrar/components/ManualAdmissionTab.tsx");
const newEnrollmentDrawer = read("src/features/registrar/components/NewEnrollmentDrawer.tsx");
const adminWizard = read("src/features/admission-form/AdmissionFormWizard.tsx");
const manualAdmissionForm = read("src/features/registrar/lib/manualAdmissionForm.ts");

console.log("=========================================");
console.log(" UX WIRING REGRESSION TESTS");
console.log("=========================================\n");

assert(
  enrollmentPage.includes("q: studentFilters.committedQ") &&
    enrollmentPage.includes("gradeLevelId: studentFilters.values.gradeLevelId"),
  "enrollment sends search and grade filters to the server"
);
assert(
  enrollmentPage.includes("studentFilters.page") &&
    enrollmentPage.includes("studentFilters.pageSize"),
  "enrollment resets/refetches by page and page size"
);
assert(
  enrollmentApi.includes("fetchAllItems") && enrollmentPage.includes("unwrapItems"),
  "enrollment catalogs use envelope-safe all-page fetches"
);
assert(
  enrollmentApi.includes("addMembersBulk") && enrollmentApi.includes("/members/bulk"),
  "enrollment bulk assignment uses the bulk member endpoint"
);
assert(
  enrollmentPage.includes("bulkResults") && enrollmentPage.includes("reason"),
  "enrollment shows per-user bulk failure reasons"
);
assert(!enrollmentPage.includes("selectedGradeFilter"), "enrollment has a single grade filter source");

assert(registrarHook.includes("unwrapItems"), "registrar unwraps paged grade levels");
assert(
  editStudent.includes("gradeLevelsLoading") && editStudent.includes("disabled={gradeLevelsLoading}"),
  "registrar edit-student grade select has a loading/disabled state"
);
assert(
  applicationReviewModal.includes("documentEligibility?.eligible") &&
    applicationReviewModal.includes("Record entrance complete") &&
    applicationReviewModal.includes('role="dialog"') &&
    applicationReviewModal.includes('aria-modal="true"') &&
    applicationReviewModal.includes("h-[100dvh]") &&
    applicationReviewModal.includes("max-w-[1040px]"),
  "registrar application review uses a full-height drawer and gates documents/entrance completion"
);
assert(
  registrarApi.includes("/entrance-complete"),
  "registrar API exposes server entrance-completion action"
);
assert(
  manualAdmissionTab.includes("NewEnrollmentDrawer") &&
    newEnrollmentDrawer.includes("w-full max-w-[960px]") &&
    newEnrollmentDrawer.includes("h-[100dvh]") &&
    newEnrollmentDrawer.includes("AdmissionFormWizard"),
  "direct admission uses a wide full-height enrollment drawer"
);
assert(
  newEnrollmentDrawer.includes("role=\"dialog\"") &&
    newEnrollmentDrawer.includes("aria-modal=\"true\"") &&
    newEnrollmentDrawer.includes("event.key === \"Escape\"") &&
    newEnrollmentDrawer.includes("FOCUSABLE"),
  "enrollment drawer traps focus and closes on Escape"
);
assert(
  newEnrollmentDrawer.includes("confirmAction") &&
    newEnrollmentDrawer.includes("admissions.manualAdmission.discardTitle"),
  "enrollment drawer confirms discarding unsaved details"
);
assert(
  newEnrollmentDrawer.includes("AdmissionApplicantPhoto") &&
    manualAdmissionForm.includes("pendingPhotoUrl"),
  "direct admission supports pending or linked profile photos"
);
assert(
  adminWizard.includes("changedFields") &&
    adminWizard.includes("studentPhotoSlot") &&
    adminWizard.includes("applicantType"),
  "admission wizard supports changed-field markers, photo slot, and applicant source"
);
assert(
  isAdmissionFormEmpty({
    ...emptyAdmissionApplicationForm(),
    existingStudentId: "",
    pendingPhotoUrl: null,
  } as any),
  "empty manual admission form is treated as empty"
);

assert(
  lessonApi.includes("fetchAllItems") && lessonPage.includes("fetchGradeLevels"),
  "lesson plans load all catalog pages for selectors"
);
assert(
  lessonPage.includes("draftKey") && lessonPage.includes("localStorage"),
  "lesson plans persist and restore drafts"
);

assert(
  publicApply.includes("unwrapItems(data)") &&
    publicApply.includes("gradesLoading") &&
    publicApply.includes("gradesError"),
  "public apply unwraps grades and separates loading/failure/empty states"
);

assert(
  gradebook.includes('["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"]') &&
    gradebook.includes("teacherCalendarMissing") &&
    gradebook.includes("teacherCalendarNeedsPeriods"),
  "gradebook differentiates admin and teacher calendar guidance"
);
assert(
  gradebook.includes("calendarLoadError") && gradebook.includes("classroomLoadError"),
  "gradebook surfaces setup load failures with retry"
);

assert(
  curriculumHook.includes("fetchAllItems") && curriculumHook.includes("unwrapItems"),
  "curriculum selectors use all-page catalog data"
);

assert(
  schedulePage.includes("FeatureModalShell") &&
    schedulePage.includes("space-y-5 sm:space-y-6"),
  "assign-class modal uses shared chrome and consistent spacing"
);

assert(
  feesPageActions.includes("const openEditTemplate =") &&
    feesPageActions.includes("openEditTemplate,"),
  "fees exposes a defined template-edit action"
);

console.log("");
if (failed) {
  console.error(`${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("All UX wiring tests passed");
