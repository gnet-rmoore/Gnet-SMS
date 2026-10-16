import express from "express";
import { authenticate, requireTenant, requireRoles, requireResourceTenant } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { onlineExamController } from "../controllers/onlineExamController";
import { examRateLimit } from "../middleware/examRateLimit";
import {
  onlineExamConfigSchema,
  onlineExamQuestionsSchema,
  questionImportRowsSchema,
  onlineExamAnswersSchema,
  onlineExamPreviewScoreSchema,
  onlineExamViolationSchema,
  onlineExamRetakePolicySchema,
  onlineExamPushGradebookSchema,
  proctorWarnSchema,
  proctorFlagSchema,
  proctorExtendSchema,
  essayGradeSchema,
  screenFrameSchema,
} from "../validation/schemas";

const router = express.Router();

const EXAM_READ_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"];
const EXAM_WRITE_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"];

const RL_ENABLED = process.env.EXAM_RATE_LIMIT_ENABLED === "true";
async function rlOrPass(key: string, limit: number, windowSec: number, req: any, res: any) {
  if (!RL_ENABLED) return true;
  const r = await examRateLimit(key, limit, windowSec);
  if (!r.allowed) {
    res.setHeader("Retry-After", String(r.retryAfter));
    res.setHeader("X-RateLimit-Limit", String(r.limit));
    res.setHeader("X-RateLimit-Remaining", String(r.remaining));
    res.status(429).json({ error: "Too many requests" });
    return false;
  }
  return true;
}

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

// SSE live-stream deprecated in favour of Socket.IO (see liveExamEvents.ts).
router.get(
  "/api/exams/:id/live-stream",
  authenticate,
  requireTenant,
  requireRoles(EXAM_WRITE_ROLES),
  (req, res) => {
    res.status(410).json({ error: "SSE deprecated; use Socket.IO" });
  }
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

router.post(
  "/api/exams/:id/questions/import/preview",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(questionImportRowsSchema),
  onlineExamController.previewQuestionImport
);

router.post(
  "/api/exams/:id/questions/import",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(questionImportRowsSchema),
  onlineExamController.importQuestions
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
  "/api/exams/:id/attempt",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.exam),
  onlineExamController.resumeAttempt
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
  async (req, res, next) => {
    const key = `answers:${req.params.attemptId}`;
    const ok = await rlOrPass(key, 10, 60, req, res);
    if (!ok) return;
    next();
  },
  onlineExamController.saveAnswers
);

router.post(
  "/api/exam-attempts/:attemptId/violations",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.examAttempt),
  validateBody(onlineExamViolationSchema),
  async (req, res, next) => {
    const key = `viol:${req.params.attemptId}`;
    const ok = await rlOrPass(key, 30, 60, req, res);
    if (!ok) return;
    next();
  },
  onlineExamController.reportViolation
);

router.post(
  "/api/exam-attempts/:attemptId/heartbeat",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.examAttempt),
  async (req, res, next) => {
    const key = `hb:${req.params.attemptId}`;
    const ok = await rlOrPass(key, 90, 60, req, res);
    if (!ok) return;
    next();
  },
  onlineExamController.heartbeat
);

router.post(
  "/api/exam-attempts/:attemptId/submit",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.examAttempt),
  async (req, res, next) => {
    const key = `submit:${req.params.attemptId}`;
    const ok = await rlOrPass(key, 6, 60, req, res);
    if (!ok) return;
    next();
  },
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

// Live Proctor actions (staff, school-scoped).
router.post(
  "/api/exam-attempts/:attemptId/warn",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.examAttempt),
  validateBody(proctorWarnSchema),
  onlineExamController.warnStudent
);

router.post(
  "/api/exam-attempts/:attemptId/flag",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.examAttempt),
  validateBody(proctorFlagSchema),
  onlineExamController.flagAttempt
);

router.post(
  "/api/exam-attempts/:attemptId/force-submit",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.examAttempt),
  onlineExamController.forceSubmitAttempt
);

router.post(
  "/api/exam-attempts/:attemptId/extend",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.examAttempt),
  validateBody(proctorExtendSchema),
  onlineExamController.extendAttemptTime
);

// Live screen view (Phase 3): student-captured frames, proctor-signed reads.
router.get(
  "/api/exam-attempts/:attemptId/screen-config",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.examAttempt),
  onlineExamController.getScreenCaptureConfig
);

router.post(
  "/api/exam-attempts/:attemptId/screen-frame",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.examAttempt),
  validateBody(screenFrameSchema),
  onlineExamController.createScreenFrameUpload
);

router.post(
  "/api/exam-attempts/:attemptId/screen-frame/:frameId/uploaded",
  authenticate,
  requireRoles(["STUDENT"]),
  requireResourceTenant(resourceLoaders.examAttempt),
  validateBody(screenFrameSchema),
  onlineExamController.markScreenFrameUploaded
);

router.get(
  "/api/exam-attempts/:attemptId/frames",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.examAttempt),
  onlineExamController.listProctorFrames
);

// Manual essay marking (staff, school-scoped).
router.patch(
  "/api/exam-attempts/:attemptId/answers/:questionId/grade",
  authenticate,
  requireRoles(EXAM_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.examAttempt),
  validateBody(essayGradeSchema),
  onlineExamController.markEssayAnswer
);

// Ops/manual trigger for the server-side expired-attempt sweep.
router.post(
  "/api/exams/sweep-expired",
  authenticate,
  requireRoles(["SCHOOL_ADMIN"]),
  onlineExamController.sweepExpiredAttempts
);

export default router;
