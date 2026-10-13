import express from "express";
import { authenticate, requireTenant, requireRoles, requireResourceTenant } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { examPaperController } from "../controllers/examPaperController";
import {
  examPaperDraftSchema,
  examPaperPresignSchema,
  examPaperConfirmPdfSchema,
  examPaperReviewSchema,
  examPaperRosterSchema,
} from "../validation/schemas";

const router = express.Router();

const WRITE = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"];
const REVIEW = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"];

router.get(
  "/api/schools/:schoolId/exam-papers/pending",
  authenticate,
  requireTenant,
  requireRoles(REVIEW),
  examPaperController.listPending
);

router.post(
  "/api/exam-papers/:packageId/review",
  authenticate,
  requireRoles(REVIEW),
  requireResourceTenant(resourceLoaders.examPaperPackage),
  validateBody(examPaperReviewSchema),
  examPaperController.review
);

router.get(
  "/api/exams/:id/paper",
  authenticate,
  requireRoles(WRITE),
  requireResourceTenant(resourceLoaders.exam),
  examPaperController.getPaper
);

router.put(
  "/api/exams/:id/paper",
  authenticate,
  requireRoles(WRITE),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(examPaperDraftSchema),
  examPaperController.updatePaper
);

router.post(
  "/api/exams/:id/paper/submit",
  authenticate,
  requireRoles(WRITE),
  requireResourceTenant(resourceLoaders.exam),
  examPaperController.submit
);

router.post(
  "/api/exams/:id/paper/pdf/presign",
  authenticate,
  requireRoles(WRITE),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(examPaperPresignSchema),
  examPaperController.presignPdf
);

router.post(
  "/api/exams/:id/paper/pdf/confirm",
  authenticate,
  requireRoles(WRITE),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(examPaperConfirmPdfSchema),
  examPaperController.confirmPdf
);

router.delete(
  "/api/exams/:id/paper/pdf",
  authenticate,
  requireRoles(WRITE),
  requireResourceTenant(resourceLoaders.exam),
  examPaperController.clearPdf
);

router.get(
  "/api/exams/:id/paper/pdf",
  authenticate,
  requireRoles(WRITE),
  requireResourceTenant(resourceLoaders.exam),
  examPaperController.pdfDownload
);

router.put(
  "/api/exams/:id/paper/roster",
  authenticate,
  requireRoles(WRITE),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(examPaperRosterSchema),
  examPaperController.setRoster
);

export default router;
