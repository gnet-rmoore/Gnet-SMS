import express from "express";
import { authenticate, requireTenant, requireRoles, requireResourceTenant } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { examController } from "../controllers/examController";
import { SCHOOL_EXAM_CREATE_ROLES } from "../lib/examAuthorScope";
import {
  gradeEntryUpsertSchema,
  gradeEntryBulkSchema,
  componentGradeBulkSchema,
  examScheduleCreateSchema,
  examScheduleUpdateSchema,
} from "../validation/schemas";

/** Same paths as monolith src/server/routes/examRoutes.ts. */
const router = express.Router();

const EXAM_READ_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"];
const EXAM_WRITE_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"];
const EXAM_ADMIN_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"];
/** Exam sitting schedules are managed by school leadership only — not teachers. */
const SCHEDULE_WRITE_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"];

router.get(
  "/api/students/:studentId/grades",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT", "REGISTRAR"]),
  examController.getStudentGrades
);

router.get(
  "/api/schools/:schoolId/grades/pending",
  authenticate,
  requireTenant,
  requireRoles(EXAM_ADMIN_ROLES),
  examController.getPendingGrades
);

router.get(
  "/api/schools/:schoolId/grades/my-submissions",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"]),
  examController.getTeacherGradeSubmissions
);

router.post(
  "/api/schools/:schoolId/grades/review-batch",
  authenticate,
  requireTenant,
  requireRoles(EXAM_ADMIN_ROLES),
  examController.bulkReviewGradeEntries
);

router.get(
  "/api/schools/:schoolId/exams",
  authenticate,
  requireTenant,
  requireRoles(EXAM_READ_ROLES),
  examController.getExams
);

router.post(
  "/api/schools/:schoolId/exams",
  authenticate,
  requireTenant,
  requireRoles(SCHOOL_EXAM_CREATE_ROLES),
  examController.createExam
);

router.get(
  "/api/exams/:id",
  authenticate,
  requireRoles(EXAM_READ_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  examController.getExamById
);

router.put(
  "/api/exams/:id",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  examController.updateExam
);

router.get(
  "/api/exams/:id/schedule",
  authenticate,
  requireRoles(EXAM_READ_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  examController.listExamSchedules
);

router.post(
  "/api/exams/:id/schedule",
  authenticate,
  requireRoles(SCHEDULE_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(examScheduleCreateSchema),
  examController.createExamSchedule
);

router.patch(
  "/api/exam-schedules/:scheduleId",
  authenticate,
  requireRoles(SCHEDULE_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.examSchedule),
  validateBody(examScheduleUpdateSchema),
  examController.updateExamSchedule
);

router.delete(
  "/api/exam-schedules/:scheduleId",
  authenticate,
  requireRoles(SCHEDULE_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.examSchedule),
  examController.deleteExamSchedule
);

router.get(
  "/api/exams/:id/teacher-classrooms",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  examController.getTeacherClassrooms
);

router.get(
  "/api/exams/:id/submissions-summary",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  examController.getSubmissionsSummary
);

router.get(
  "/api/exams/:id/grades",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  examController.getExamGrades
);

router.post(
  "/api/exams/:id/grades",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(gradeEntryUpsertSchema),
  examController.upsertGradeEntry
);

router.post(
  "/api/exams/:id/grades/bulk",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(gradeEntryBulkSchema),
  examController.bulkUpsertGradeEntries
);

router.get(
  "/api/schools/:schoolId/gradebook/component-grades",
  authenticate,
  requireTenant,
  requireRoles(EXAM_WRITE_ROLES),
  examController.getComponentGrades
);

router.get(
  "/api/schools/:schoolId/gradebook/assessment-grades",
  authenticate,
  requireTenant,
  requireRoles(EXAM_WRITE_ROLES),
  examController.getAssessmentGrades
);

router.post(
  "/api/schools/:schoolId/gradebook/sync-structure-template",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "IT_ADMIN"]),
  examController.syncGradebookStructureTemplate
);

router.post(
  "/api/schools/:schoolId/gradebook/component-grades/bulk",
  authenticate,
  requireTenant,
  requireRoles(EXAM_WRITE_ROLES),
  validateBody(componentGradeBulkSchema),
  examController.bulkUpsertComponentGrades
);

router.patch(
  "/api/exams/:id/release-grades",
  authenticate,
  requireRoles(EXAM_ADMIN_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  examController.releaseGrades
);

router.post(
  "/api/exams/:id/process-results",
  authenticate,
  requireRoles(EXAM_ADMIN_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  examController.processResults
);

router.patch(
  "/api/grade-entries/:id",
  authenticate,
  requireRoles(EXAM_ADMIN_ROLES),
  requireResourceTenant(resourceLoaders.gradeEntry),
  examController.updateGradeEntryStatus
);

router.post(
  "/api/grade-entries/:id/reopen",
  authenticate,
  requireRoles(EXAM_ADMIN_ROLES),
  requireResourceTenant(resourceLoaders.gradeEntry),
  examController.reopenGradeEntry
);

router.get(
  "/api/schools/:schoolId/grades/edit-grants",
  authenticate,
  requireTenant,
  requireRoles(EXAM_ADMIN_ROLES),
  examController.listGradeEditGrants
);
router.get(
  "/api/schools/:schoolId/grades/edit-grants/mine",
  authenticate,
  requireTenant,
  requireRoles(EXAM_WRITE_ROLES),
  examController.listMyGradeEditGrants
);
router.post(
  "/api/schools/:schoolId/grades/edit-grants",
  authenticate,
  requireTenant,
  requireRoles(EXAM_ADMIN_ROLES),
  examController.createGradeEditGrant
);
router.post(
  "/api/schools/:schoolId/grades/edit-grants/:grantId/revoke",
  authenticate,
  requireTenant,
  requireRoles(EXAM_ADMIN_ROLES),
  examController.revokeGradeEditGrant
);

export default router;
