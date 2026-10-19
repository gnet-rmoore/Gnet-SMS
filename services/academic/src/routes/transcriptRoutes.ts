import express from "express";
import {
  authenticate,
  requireTenant,
  requireRoles,
  requireCapability,
  requireResourceTenant,
} from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { transcriptController } from "../controllers/transcriptController";
import { transcriptPrepareSchema, transcriptReviewSchema } from "../validation/schemas";

const router = express.Router();

const READ = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR"];
const PREPARE = ["SCHOOL_ADMIN", "REGISTRAR"];
const APPROVE = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"];

router.get(
  "/api/schools/:schoolId/transcripts",
  authenticate,
  requireTenant,
  requireRoles(READ),
  transcriptController.list
);

router.post(
  "/api/schools/:schoolId/transcripts/prepare",
  authenticate,
  requireTenant,
  requireCapability("action.transcripts.prepare", PREPARE),
  validateBody(transcriptPrepareSchema),
  transcriptController.prepare
);

router.get(
  "/api/transcripts/:id",
  authenticate,
  requireRoles(READ),
  requireResourceTenant(resourceLoaders.transcript),
  transcriptController.get
);

router.post(
  "/api/transcripts/:id/submit",
  authenticate,
  requireCapability("action.transcripts.prepare", PREPARE),
  requireResourceTenant(resourceLoaders.transcript),
  transcriptController.submit
);

router.post(
  "/api/transcripts/:id/approve",
  authenticate,
  requireCapability("action.transcripts.approve", APPROVE),
  requireResourceTenant(resourceLoaders.transcript),
  validateBody(transcriptReviewSchema),
  transcriptController.approve
);

router.post(
  "/api/transcripts/:id/reject",
  authenticate,
  requireCapability("action.transcripts.approve", APPROVE),
  requireResourceTenant(resourceLoaders.transcript),
  validateBody(transcriptReviewSchema),
  transcriptController.reject
);

router.get(
  "/api/transcripts/:id/pdf",
  authenticate,
  requireRoles(READ),
  requireResourceTenant(resourceLoaders.transcript),
  transcriptController.pdf
);

export default router;
