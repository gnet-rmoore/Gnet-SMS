import fs from "node:fs";
import path from "node:path";
import { createAssert } from "./helpers/assert";

const root = path.resolve(import.meta.dirname, "..");
const { assert, summary } = createAssert();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const importsSymbol = (source: string, symbol: string) =>
  new RegExp(`import\\s*\\{[^}]*\\b${symbol}\\b[^}]*\\}\\s*from`).test(source);

const shell = read("src/components/ui/DetailDrawerShell.tsx");
const uiIndex = read("src/components/ui/index.ts");
const hook = read("src/hooks/useDrawerA11y.ts");

const staffPage = read("src/pages/School/StaffManagement.tsx");
const transcripts = read("src/pages/School/Transcripts.tsx");
const studentsPage = read("src/features/students/Page.tsx");
const studentEdit = read("src/features/students/components/EditStudentModal.tsx");
const registrarPage = read("src/features/registrar/Page.tsx");
const registrarEdit = read("src/features/registrar/components/EditStudentModal.tsx");
const dossier = read("src/features/registrar/components/StudentDossierModal.tsx");
const syllabusPage = read("src/features/curriculum/Page.tsx");
const syllabusView = read("src/features/curriculum/components/SyllabusViewModal.tsx");
const calendarPage = read("src/features/calendar-page/Page.tsx");
const eventDetails = read("src/features/calendar-page/components/EventDetailsModal.tsx");
const attendancePage = read("src/features/attendance/Page.tsx");
const rollCall = read("src/features/attendance/components/RollCallModal.tsx");
const attendanceHistory = read("src/features/attendance/components/AttendanceStudentHistoryModal.tsx");
const examPage = read("src/features/exam-details/Page.tsx");
const historyModal = read("src/features/exam-details/components/HistoryModal.tsx");
const resultsModal = read("src/features/exam-details/components/ResultsModal.tsx");
const expensesPage = read("src/features/expenses/Page.tsx");
const transactionModal = read("src/features/expenses/components/TransactionDetailsModal.tsx");
const questionBankPage = read("src/features/online-exam/QuestionBankPage.tsx");
const roomPage = read("src/features/classroom-workspace/RoomPage.tsx");

console.log("=== detail drawers ===");

assert(uiIndex.includes('export { DetailDrawerShell } from "./DetailDrawerShell";'), "DetailDrawerShell is exported from the ui barrel");
assert(shell.includes('import { createPortal } from "react-dom";') && shell.includes("createPortal(layer, document.body)"), "drawer layer is portalled to document.body");
assert(shell.includes('typeof document === "undefined"'), "drawer portal has an SSR guard");
assert(shell.includes("<AnimatePresence onExitComplete=") && shell.includes("setA11yActive(false)"), "drawer keeps presence state until exit completes");
assert(shell.includes("const [a11yActive, setA11yActive] = React.useState(open)") && shell.includes("open: a11yActive && !suspendA11y"), "a11y stays active during the exit animation");
assert(shell.includes("if (!openRef.current) setA11yActive(false)"), "exit cleanup checks the latest open state");
assert(shell.includes('role="dialog"') && shell.includes('aria-modal="true"') && shell.includes("aria-labelledby={titleId}"), "drawer exposes dialog semantics");
assert(shell.includes("h-[100dvh]") && shell.includes("max-w-[720px]") && shell.includes("xl:max-w-[880px]"), "drawer uses admissions width and full viewport height");
assert(shell.includes("min-h-0 flex-1 overflow-y-auto overscroll-contain"), "drawer has one scrolling body");
assert(shell.includes('transition={{ type: "spring", stiffness: 420, damping: 38 }}'), "drawer uses the admissions spring transition");
assert(shell.includes("fixed inset-0") && shell.includes("z-[100]"), "drawer layer defaults above page content");

assert(hook.includes('event.key === "Escape"') && hook.includes('event.key !== "Tab"'), "drawer a11y handles Escape and Tab");
assert(hook.includes('document.body.style.overflow = "hidden"') && hook.includes("previousOverflow"), "drawer a11y locks and restores body scroll");
assert(hook.includes('window.addEventListener("keydown", onKeyDown)') && hook.includes('window.removeEventListener("keydown", onKeyDown)'), "drawer a11y removes its keydown listener");

const converted = [
  ["staff edit", staffPage],
  ["student edit", studentEdit],
  ["registrar edit", registrarEdit],
  ["student dossier", dossier],
  ["transcript detail", transcripts],
  ["syllabus view", syllabusView],
  ["event details", eventDetails],
  ["roll call", rollCall],
  ["attendance history", attendanceHistory],
  ["exam history", historyModal],
  ["exam results", resultsModal],
  ["transaction details", transactionModal],
  ["question preview", questionBankPage],
  ["classroom post detail", roomPage],
];
for (const [name, source] of converted) {
  assert(source.includes("DetailDrawerShell"), `${name} uses the shared drawer shell`);
}

assert(staffPage.includes("open={showEditModal}") && staffPage.includes('form="edit-staff-form"') && staffPage.includes('id="edit-staff-form"'), "staff drawer submit targets its form");
assert(studentsPage.includes("open={showEditModal}") && !/\{\s*showEditModal\s*&&\s*\(\s*<EditStudentModal/.test(studentsPage), "student edit drawer is always mounted");
assert(studentEdit.includes('form="edit-student-form"') && studentEdit.includes('id="edit-student-form"'), "student drawer submit targets its form");
assert(registrarPage.includes("open={showEditStudentModal}") && !/\{\s*showEditStudentModal\s*&&/.test(registrarPage), "registrar edit drawer is always mounted");
assert(registrarEdit.includes('form="edit-registrar-student-form"') && registrarEdit.includes('id="edit-registrar-student-form"'), "registrar drawer submit targets its form");
assert(registrarPage.includes("open={Boolean(selectedStudent)}"), "student dossier open state is explicit");
assert(dossier.includes("if (!open || !student?.id) return;"), "late dossier photo patches cannot reopen a closed drawer");

assert(transcripts.includes("open={Boolean(detail)}") && transcripts.includes("{detail ? ("), "transcript drawer guards its detail body");
assert(transcripts.includes("suspendA11y={Boolean(reviewMode)}"), "transcript drawer suspends a11y for the nested review modal");
assert(transcripts.includes("z-[110]") && transcripts.includes("z-[130]"), "transcript nested modal and toast layer above the drawer");
assert(transcripts.includes('if (event.key !== "Escape") return;') && transcripts.includes("setReviewMode(null)"), "Escape closes only the transcript review modal");
assert(transcripts.includes("autoFocus"), "transcript review comment receives initial focus");

assert(syllabusPage.includes("open={showSyllabusViewModal && Boolean(selectedSyllabus)}") && !/\{\s*showSyllabusViewModal\s*&&\s*selectedSyllabus\s*&&/.test(syllabusPage), "syllabus drawer is always mounted with explicit open state");
assert(syllabusView.includes("open={open && Boolean(selectedSyllabus)}") && syllabusView.includes("{selectedSyllabus ? ("), "syllabus drawer guards its body when closed");
assert(syllabusView.includes("footer={footer}") && !syllabusView.includes("p-6 md:p-8 bg-white border-t"), "syllabus actions are pinned in the drawer footer");

assert(calendarPage.includes("open={Boolean(selectedEvent)}") && eventDetails.includes("open={open && Boolean(selectedEvent)}"), "event drawer is always mounted with explicit open state");
assert(!/getCategoryLightBg:\s*\(/.test(eventDetails) && !/getPriorityBadgeClass:\s*\(/.test(eventDetails) && !/get(CategoryLightBg|PriorityBadgeClass)=\{/.test(calendarPage), "event drawer has no unused style props");

assert(attendancePage.includes("open={showDetailsModal && Boolean(selectedRecord)}") && !/\{\s*showDetailsModal\s*&&\s*selectedRecord\s*&&/.test(attendancePage), "roll-call drawer is always mounted");
assert(rollCall.includes("open={open && Boolean(selectedRecord)}") && rollCall.includes("selectedRecord?.records"), "roll-call drawer tolerates a null record");
assert(attendancePage.includes("suspendA11y={Boolean(historyStudent)}") && attendanceHistory.includes('layerClass="z-[110]"'), "nested attendance drawer owns the top layer");
assert(attendancePage.includes("open={canTake && Boolean(historyStudent && school?.id)}") && !/\{\s*canTake\s*&&\s*historyStudent\s*&&\s*school\?\.id\s*&&/.test(attendancePage), "attendance history drawer is always mounted");
assert(attendanceHistory.includes("if (!student?.id || !schoolId) return;") && attendanceHistory.includes("open={open && Boolean(student?.id)}"), "attendance history skips fetch and rendering without a student");

assert(examPage.includes("open={Boolean(historyModal)}") && !/\{\s*historyModal\s*&&\s*<HistoryModal/.test(examPage), "exam history drawer is always mounted");
assert(examPage.includes("open={Boolean(resultsModal)}") && !/\{\s*resultsModal\s*&&\s*<ResultsModal/.test(examPage), "exam results drawer is always mounted");
assert(historyModal.includes("open={open && Boolean(historyModal)}") && !historyModal.includes("if (!historyModal) return null;"), "exam history drawer guards its body instead of unmounting");
assert(resultsModal.includes("open={open && Boolean(resultsModal)}") && !resultsModal.includes("if (!resultsModal) return null;"), "exam results drawer guards its body instead of unmounting");

assert(expensesPage.includes("open={Boolean(selectedTxnDetails)}") && !/\{\s*selectedTxnDetails\s*&&\s*<TransactionDetailsModal/.test(expensesPage), "transaction drawer is always mounted");
assert(transactionModal.includes("open={open && Boolean(txn)}") && !transactionModal.includes('bodyClassName=""'), "transaction drawer is null-safe and keeps shell padding");
assert(questionBankPage.includes("open={Boolean(preview)}") && questionBankPage.includes("{preview ? ("), "question preview drawer is always mounted and null-safe");
assert(roomPage.includes("open={Boolean(activePostId)}") && !/\{\s*activePostId\s*&&\s*\(/.test(roomPage), "classroom post drawer is always mounted");
assert(roomPage.includes('t(postDetail.type === "MATERIAL" ? "classroomWorkspace.materialFallback"') && !roomPage.includes("eyebrow={postDetail?.type}"), "classroom post eyebrow is localized");

for (const [name, source] of [
  ["transcripts", transcripts],
  ["registrar edit", registrarEdit],
  ["question bank", questionBankPage],
  ["syllabus view", syllabusView],
  ["event details", eventDetails],
  ["roll call", rollCall],
  ["attendance history", attendanceHistory],
  ["exam history", historyModal],
  ["exam results", resultsModal],
  ["transaction details", transactionModal],
] as const) {
  assert(!importsSymbol(source, "FeatureModalShell"), `${name} has no stale FeatureModalShell import`);
}

summary("detail-drawers");
