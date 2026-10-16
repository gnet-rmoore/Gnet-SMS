import express from "express";
import { authenticate, requireTenant, requireRoles, requireResourceTenant } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { questionBankController } from "../controllers/questionBankController";
import {
  questionBankCreateSchema,
  questionBankUpdateSchema,
  questionBankSaveFromExamSchema,
} from "../validation/schemas";

const router = express.Router();

const BANK_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"];

// Copy exam questions into the school bank. Declared before the `/api/exams/:id`
// question routes below; the distinct suffix means no collision.
router.post(
  "/api/exams/:id/questions/save-to-bank",
  authenticate,
  requireRoles(BANK_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  validateBody(questionBankSaveFromExamSchema),
  questionBankController.saveFromExam
);

// School question bank (staff-authored, school-scoped).
router.get(
  "/api/schools/:schoolId/question-bank",
  authenticate,
  requireTenant,
  requireRoles(BANK_ROLES),
  questionBankController.list
);

router.post(
  "/api/schools/:schoolId/question-bank",
  authenticate,
  requireTenant,
  requireRoles(BANK_ROLES),
  validateBody(questionBankCreateSchema),
  questionBankController.create
);

router.get(
  "/api/schools/:schoolId/question-bank/:itemId",
  authenticate,
  requireTenant,
  requireRoles(BANK_ROLES),
  questionBankController.get
);

router.put(
  "/api/schools/:schoolId/question-bank/:itemId",
  authenticate,
  requireTenant,
  requireRoles(BANK_ROLES),
  validateBody(questionBankUpdateSchema),
  questionBankController.update
);

router.delete(
  "/api/schools/:schoolId/question-bank/:itemId",
  authenticate,
  requireTenant,
  requireRoles(BANK_ROLES),
  questionBankController.remove
);

export default router;
