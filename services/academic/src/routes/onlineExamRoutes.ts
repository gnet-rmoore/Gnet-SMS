import express from "express";
import { authenticate, requireTenant, requireRoles, requireResourceTenant } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { onlineExamController } from "../controllers/onlineExamController";
import {
  onlineExamConfigSchema,
  onlineExamQuestionsSchema,
  onlineExamAnswersSchema,
  onlineExamPreviewScoreSchema,
  onlineExamViolationSchema,
  onlineExamRetakePolicySchema,
  onlineExamPushGradebookSchema,
} from "../validation/schemas";

const router = express.Router();

const EXAM_READ_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"];
const EXAM_WRITE_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"];

// Staff preview/demo routes (no attempt persistence). Static "preview/sample"
// does not collide with the `/api/exams/:id/...` patterns below.
router.get(
  "/api/exams/preview/sample",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  onlineExamController.getSamplePreview
);

router.post(
  "/api/exams/preview/sample/score",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  validateBody(onlineExamPreviewScoreSchema),
  onlineExamController.scoreSamplePreview
);

router.get(
  "/api/schools/:schoolId/online-exams",
  authenticate,
  requireTenant,
  requireRoles(EXAM_READ_ROLES),
  onlineExamController.listOnlineExams
);

router.get(
  "/api/students/:studentId/exam-attempts",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"]),
  onlineExamController.listStudentAttempts
);

router.patch(
  "/api/exams/:id/online-config",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(onlineExamConfigSchema),
  onlineExamController.updateOnlineConfig
);

router.get(
  "/api/exams/:id/questions",
  authenticate,
  requireRoles(EXAM_READ_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  onlineExamController.getQuestions
);

router.get(
  "/api/exams/:id/online-preview",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  onlineExamController.getExamPreview
);

router.post(
  "/api/exams/:id/online-preview/score",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(onlineExamPreviewScoreSchema),
  onlineExamController.scoreExamPreview
);

router.put(
  "/api/exams/:id/questions",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(onlineExamQuestionsSchema),
  onlineExamController.replaceQuestions
);

router.get(
    "/api/exams/:id/attempts",
    authenticate,
    requireRoles(EXAM_WRITE_ROLES),
    requireResourceTenant(resourceLoaders.exam),
    onlineExamController.listExamAttempts
  );

  router.get(
    "/api/exams/:id/live-attempts",
    authenticate,
    requireRoles(EXAM_WRITE_ROLES),
    requireResourceTenant(resourceLoaders.exam),
    onlineExamController.getLiveAttempts
  );

  router.get(
    "/api/exams/:id/live-stream",
    authenticate,
    requireRoles(EXAM_WRITE_ROLES),
    requireResourceTenant(resourceLoaders.exam),
    onlineExamController.liveStream
  );

  router.post(
  "/api/exams/:id/attempts",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.exam),
  onlineExamController.startAttempt
);

router.get(
  "/api/exam-attempts/:attemptId",
  authenticate,
  requireRoles(EXAM_READ_ROLES),
  requireResourceTenant(resourceLoaders.examAttempt),
  onlineExamController.getAttempt
);

router.patch(
  "/api/exam-attempts/:attemptId/answers",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.examAttempt),
  validateBody(onlineExamAnswersSchema),
  onlineExamController.saveAnswers
);

router.post(
  "/api/exam-attempts/:attemptId/violations",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.examAttempt),
  validateBody(onlineExamViolationSchema),
  onlineExamController.reportViolation
);

router.post(
  "/api/exam-attempts/:attemptId/submit",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.examAttempt),
  onlineExamController.submitAttempt
);

router.get(
  "/api/exam-attempts/:attemptId/results",
  authenticate,
  requireRoles(EXAM_READ_ROLES),
  requireResourceTenant(resourceLoaders.examAttempt),
  onlineExamController.getResults
);

// Retake eligibility & retake attempt (student)
router.get(
  "/api/exams/:id/retake-eligibility",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.exam),
  onlineExamController.getRetakeEligibility
);

router.post(
  "/api/exams/:id/retake",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.exam),
  onlineExamController.startRetakeAttempt
);

// Gradebook push (teacher)
router.post(
  "/api/exams/:id/push-to-gradebook",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(onlineExamPushGradebookSchema),
  onlineExamController.pushToGradebook
);

// Retake policy config (teacher)
router.patch(
  "/api/exams/:id/retake-policy",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(onlineExamRetakePolicySchema),
  onlineExamController.updateRetakePolicy
);

export default router;
