import express from "express";
import { authenticate, requireTenant, requireRoles, authenticateInternal } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { schoolController } from "../controllers/schoolController";
import { schoolUpdateSchema, receiptTemplateUpdateSchema } from "../validation/schemas";

/** Same paths as monolith src/server/routes/schoolRoutes.ts. */
const router = express.Router();

const SCHOOL_ADMIN_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "IT_ADMIN"];

router.get(
  "/api/internal/schools/:schoolId",
  authenticateInternal,
  schoolController.getSchoolInternal
);

router.get(
  "/api/internal/schools/:schoolId/entitlements",
  authenticateInternal,
  schoolController.getEntitlementsInternal
);

router.get(
  "/api/internal/schools/:schoolId/quotas",
  authenticateInternal,
  schoolController.getQuotasInternal
);

router.get(
  "/api/schools/:schoolId/entitlements",
  authenticate,
  requireTenant,
  schoolController.getEntitlementsForTenant
);

router.get(
  "/api/schools/:schoolId/subscription",
  authenticate,
  requireTenant,
  requireRoles(SCHOOL_ADMIN_ROLES),
  schoolController.getSubscriptionForTenant
);

router.get(
  "/api/schools/:schoolId/stats",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR", "ACCOUNTANT", "IT_ADMIN"]),
  schoolController.getStats
);

router.get(
  "/api/schools/:schoolId",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "IT_ADMIN", "VPI", "VPA", "REGISTRAR", "ACCOUNTANT"]),
  schoolController.getSchool
);

router.patch(
  "/api/schools/:schoolId",
  authenticate,
  requireTenant,
  requireRoles(SCHOOL_ADMIN_ROLES),
  validateBody(schoolUpdateSchema),
  schoolController.updateSchool
);

router.patch(
  "/api/schools/:schoolId/receipt-template",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR", "ACCOUNTANT", "IT_ADMIN"]),
  validateBody(receiptTemplateUpdateSchema),
  schoolController.updateReceiptTemplate
);

router.get(
  "/api/schools/:schoolId/admission-policy",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL", "IT_ADMIN"]),
  schoolController.getAdmissionPolicy
);

router.patch(
  "/api/schools/:schoolId/admission-policy",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL"]),
  schoolController.updateAdmissionPolicy
);

router.get(
  "/api/internal/schools/:schoolId/admission-policy",
  authenticateInternal,
  schoolController.getAdmissionPolicyInternal
);

router.post(
  "/api/schools/:schoolId/admission-background/presign",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL"]),
  schoolController.presignBackgroundUpload
);

router.post(
  "/api/schools/:schoolId/admission-background/upload",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL"]),
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    limit: "6mb",
  }),
  schoolController.uploadBackground
);

router.post(
  "/api/schools/:schoolId/onboarding/complete",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "IT_ADMIN", "PRINCIPAL"]),
  schoolController.completeOnboarding
);

router.patch(
  "/api/schools/:schoolId/setup/admission-policy-reviewed",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "IT_ADMIN", "PRINCIPAL", "REGISTRAR"]),
  schoolController.setAdmissionPolicyReviewed
);

export default router;
