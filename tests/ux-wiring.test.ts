/**
 * Wiring contracts for the enrollment/admissions/teacher UX plan.
 * These guard the client-to-server paths that are hard to mount without a browser test runner.
 * Run: npx tsx tests/ux-wiring.test.ts
 */
import { existsSync, readFileSync } from "fs";
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
const studentsPage = read("src/features/students/Page.tsx");
const studentRecordsPage = read("src/features/student-records/Page.tsx");
const dashboardRegistry = read("src/features/dashboard/registry.ts");

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
const reviewShell = read("src/features/registrar/components/review/ReviewDrawerShell.tsx");
const enrolledStage = read("src/features/registrar/components/review/stages/EnrolledStage.tsx");
const approvedStage = read("src/features/registrar/components/review/stages/ApprovedStage.tsx");
const entranceStage = read("src/features/registrar/components/review/stages/EntranceStage.tsx");
assert(
  enrolledStage.includes("classroomId") &&
    approvedStage.includes("documentEligibility") &&
    entranceStage.includes("entranceResult") &&
    reviewShell.includes('role="dialog"') &&
    reviewShell.includes('aria-modal="true"') &&
    reviewShell.includes("h-[100dvh]") &&
    reviewShell.includes("max-w-[720px]") &&
    reviewShell.includes("xl:max-w-[880px]") &&
    applicationReviewModal.includes("StageFrame") &&
    applicationReviewModal.includes("onStageSelect"),
  "registrar application review uses a full-height stage drawer with entrance, documents, and placement stages"
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
const drawerA11y = read("src/hooks/useDrawerA11y.ts");
assert(
  newEnrollmentDrawer.includes("role=\"dialog\"") &&
    newEnrollmentDrawer.includes("aria-modal=\"true\"") &&
    newEnrollmentDrawer.includes("useDrawerA11y") &&
    drawerA11y.includes("event.key === \"Escape\"") &&
    drawerA11y.includes("FOCUSABLE"),
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
  !existsSync(path.join(root, "src/features/students/components/EnrollStudentModal.tsx")) &&
    !existsSync(path.join(root, "src/features/student-records/components/AddRecordModal.tsx")),
  "duplicate enrollment modal files are removed"
);
assert(
  !studentsPage.includes("EnrollStudentModal") &&
    !studentsPage.includes("createStudent") &&
    !studentsPage.includes("pages:students.enroll"),
  "student directory page has no direct enrollment flow"
);
assert(
  !studentRecordsPage.includes("AddRecordModal") &&
    !studentRecordsPage.includes("createStudent") &&
    !studentRecordsPage.includes("/api/schools/${school?.id}/students"),
  "student records page does not create students"
);
assert(
  !dashboardRegistry.includes("dashboard.actions.enrollStudent") &&
    enrollmentPage.includes("admissions?tab=new_admission") &&
    !enrollmentPage.includes('to={`/${slug}/students`}') &&
    enrollmentPage.includes('t("admissions.tabs.directAdmission")'),
  "enrollment entry points route to direct admission"
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

const appRoutes = read("src/App.tsx");
const feeRoutes = read("services/finance/src/routes/financeRoutes.ts");
const feeNavRoles = read("src/constants/navByRole.ts");
const studentDashboard = read("src/features/dashboard/components/StudentDashboard.tsx");
const studentFeesQuery = read("src/features/fees/hooks/useFeesQuery.ts");
const studentFeesLedgerQuery = read("src/features/fees/hooks/useFeesLedgerQuery.ts");

const feeRouteRoles = appRoutes.match(/path="fees"[\s\S]*?allowedRoles=\{([^}]*)\}/)?.[1] || "";
assert(
  feeRouteRoles.includes("PARENT") && !feeRouteRoles.includes("STUDENT"),
  "/fees page is restricted to staff and parents"
);
const feeNavEntry = /fees:\s*\[([^\]]*)\]/.exec(feeNavRoles)?.[1] || "";
assert(
  feeNavEntry.includes("PARENT") && !feeNavEntry.includes("STUDENT"),
  "fee nav is shown to parents but not students"
);
assert(!feeRoutes.includes('"STUDENT"'), "finance service routes never grant STUDENT access");
assert(
  !studentDashboard.includes("/api/my-fees") && !studentDashboard.includes("myFees"),
  "student dashboard has no fee KPIs or fee actions"
);
assert(
  !studentFeesQuery.includes('role === "STUDENT"') &&
    !studentFeesLedgerQuery.includes('role === "STUDENT"'),
  "fee queries do not fetch student-owned views"
);

console.log("");
if (failed) {
  console.error(`${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("All UX wiring tests passed");
