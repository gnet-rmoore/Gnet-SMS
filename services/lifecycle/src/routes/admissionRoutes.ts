import express from "express";
import {
  authenticate,
  requireTenant,
  requireResourceTenant,
  requireCapability,
  authenticateInternal,
} from "../middleware/auth";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { admissionController } from "../controllers/admissionController";

const router = express.Router();

const STAFF = ["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL"];

router.get(
  "/api/schools/:schoolId/applications",
  authenticate,
  requireTenant,
  requireCapability("action.admissions.manage", STAFF),
  admissionController.getApplications
);

router.get(
  "/api/schools/:schoolId/applications/funnel",
  authenticate,
  requireTenant,
  requireCapability("action.admissions.manage", STAFF),
  admissionController.getFunnel
);

router.get(
  "/api/schools/:schoolId/applications/export.csv",
  authenticate,
  requireTenant,
  requireCapability("action.admissions.manage", STAFF),
  admissionController.exportCsv
);

router.post(
  "/api/schools/:schoolId/applications",
  authenticate,
  requireTenant,
  requireCapability("action.admissions.manage", ["SCHOOL_ADMIN", "REGISTRAR"]),
  admissionController.createApplication
);

router.get(
  "/api/schools/:schoolId/placement-summary",
  authenticate,
  requireTenant,
  requireCapability("action.admissions.manage", STAFF),
  admissionController.getPlacementSummary
);

router.post(
  "/api/schools/:schoolId/applications/bulk-transition",
  authenticate,
  requireTenant,
  requireCapability("action.admissions.manage", STAFF),
  admissionController.bulkTransition
);

router.post(
  "/api/schools/:schoolId/applications/bulk-enroll",
  authenticate,
  requireTenant,
  requireCapability("action.admissions.manage", ["SCHOOL_ADMIN", "REGISTRAR"]),
  admissionController.bulkEnroll
);

router.get(
  "/api/applications/:id/next-action",
  authenticate,
  requireCapability("action.admissions.manage", STAFF),
  requireResourceTenant(resourceLoaders.application),
  admissionController.getNextAction
);

router.patch(
  "/api/applications/:id",
  authenticate,
  requireCapability("action.admissions.manage", STAFF),
  requireResourceTenant(resourceLoaders.application),
  admissionController.updateApplication
);

router.post(
  "/api/applications/:id/transition",
  authenticate,
  requireCapability("action.admissions.manage", STAFF),
  requireResourceTenant(resourceLoaders.application),
  admissionController.transition
);

router.post(
  "/api/applications/:id/enroll",
  authenticate,
  requireCapability("action.admissions.manage", ["SCHOOL_ADMIN", "REGISTRAR"]),
  requireResourceTenant(resourceLoaders.application),
  admissionController.enroll
);

router.delete(
  "/api/applications/:id",
  authenticate,
  requireCapability("action.admissions.manage", ["SCHOOL_ADMIN", "REGISTRAR"]),
  requireResourceTenant(resourceLoaders.application),
  admissionController.withdraw
);

router.post(
  "/api/applications/:id/documents",
  authenticate,
  requireCapability("action.admissions.manage", STAFF),
  requireResourceTenant(resourceLoaders.application),
  admissionController.addDocument
);

router.post(
  "/api/applications/:id/documents/presign",
  authenticate,
  requireCapability("action.admissions.manage", STAFF),
  requireResourceTenant(resourceLoaders.application),
  admissionController.createUpload
);

router.post(
  "/api/applications/:id/documents/confirm",
  authenticate,
  requireCapability("action.admissions.manage", STAFF),
  requireResourceTenant(resourceLoaders.application),
  admissionController.confirmUpload
);

router.patch(
  "/api/applications/:id/documents/:docId",
  authenticate,
  requireCapability("action.admissions.manage", STAFF),
  requireResourceTenant(resourceLoaders.application),
  admissionController.reviewDocument
);

router.post(
  "/api/applications/:id/create-entrance-fee",
  authenticate,
  requireCapability("action.admissions.manage", ["SCHOOL_ADMIN", "REGISTRAR", "ACCOUNTANT"]),
  requireResourceTenant(resourceLoaders.application),
  admissionController.createEntranceFee
);

router.post(
  "/api/applications/:id/assign-classroom",
  authenticate,
  requireCapability("action.admissions.manage", ["SCHOOL_ADMIN", "REGISTRAR"]),
  requireResourceTenant(resourceLoaders.application),
  admissionController.assignClassroom
);

router.get(
  "/api/schools/:schoolId/my-applications",
  authenticate,
  requireTenant,
  admissionController.getMyApplications
);

// Public applicant endpoints
router.post("/api/public/applications", admissionController.publicCreate);
router.post("/api/public/applications/verify-returning", admissionController.publicVerifyReturning);
router.get("/api/public/applications/lookup", admissionController.publicStatusLookup);
router.get("/api/public/applications/:id/status", admissionController.publicStatus);
router.post("/api/public/applications/:id/documents", admissionController.publicAddDocument);
router.post("/api/public/applications/:id/documents/presign", admissionController.publicCreateUpload);
router.post("/api/public/applications/:id/documents/confirm", admissionController.publicConfirmUpload);

router.post(
  "/api/internal/applications/fee-paid",
  authenticateInternal,
  admissionController.feePaidInternal
);

export default router;
