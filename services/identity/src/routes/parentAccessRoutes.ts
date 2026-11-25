import express from "express";
import { parentAccessController } from "../controllers/parentAccessController";
import {
  authenticate,
  authenticateSuperAdmin,
  requireCapability,
  requireResourceTenant,
  requireRoles,
  requireTenant,
} from "../middleware/auth";
import { parentPhoneVerifyRateLimiter } from "../middleware/rateLimit";
import { validateBody } from "../middleware/validate";
import { parentAccessService } from "../services/parentAccessService";
import {
  parentAccessReviewSchema,
  parentPasswordResetSchema,
  parentPhoneCodeSchema,
  parentPhoneEnabledSchema,
  parentPhoneRequestSchema,
} from "../validation/schemas";

const router = express.Router();
const ADMIN_ROLES = ["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL", "IT_ADMIN"];
const ADMIN_CAPABILITY = "action.parent_access.manage";

router.post(
  "/api/parents/me/phone-login-request",
  authenticate,
  requireRoles(["PARENT"]),
  validateBody(parentPhoneRequestSchema),
  parentAccessController.submitPhoneRequest
);
router.get(
  "/api/parents/me/phone-login-request",
  authenticate,
  requireRoles(["PARENT"]),
  parentAccessController.myStatus
);
router.post(
  "/api/parents/me/phone-login-request/:id/send-code",
  authenticate,
  requireRoles(["PARENT"]),
  parentAccessController.sendVerificationCode
);
router.post(
  "/api/parents/me/phone-login-request/:id/verify",
  authenticate,
  requireRoles(["PARENT"]),
  parentPhoneVerifyRateLimiter,
  validateBody(parentPhoneCodeSchema),
  parentAccessController.verifyPhone
);

router.get(
  "/api/schools/:schoolId/parent-phone-login-requests",
  authenticate,
  requireTenant,
  requireRoles(ADMIN_ROLES),
  requireCapability(ADMIN_CAPABILITY, ADMIN_ROLES),
  parentAccessController.listRequests
);
router.get(
  "/api/schools/:schoolId/parent-access",
  authenticate,
  requireTenant,
  requireRoles(ADMIN_ROLES),
  requireCapability(ADMIN_CAPABILITY, ADMIN_ROLES),
  parentAccessController.listDirectory
);
router.post(
  "/api/parent-phone-login-requests/:id/approve",
  authenticate,
  requireResourceTenant((req) => parentAccessService.getRequestSchoolId(String(req.params.id || ""))),
  requireRoles(ADMIN_ROLES),
  requireCapability(ADMIN_CAPABILITY, ADMIN_ROLES),
  validateBody(parentAccessReviewSchema),
  parentAccessController.approveRequest
);
router.post(
  "/api/parent-phone-login-requests/:id/reject",
  authenticate,
  requireResourceTenant((req) => parentAccessService.getRequestSchoolId(String(req.params.id || ""))),
  requireRoles(ADMIN_ROLES),
  requireCapability(ADMIN_CAPABILITY, ADMIN_ROLES),
  validateBody(parentAccessReviewSchema),
  parentAccessController.rejectRequest
);
router.patch(
  "/api/users/:userId/parent-login",
  authenticate,
  requireResourceTenant((req) =>
    parentAccessService.getUserSchoolId(String(req.params.userId || ""), String(req.user?.schoolId || ""))
  ),
  requireRoles(ADMIN_ROLES),
  requireCapability(ADMIN_CAPABILITY, ADMIN_ROLES),
  validateBody(parentPhoneEnabledSchema),
  parentAccessController.setPhoneEnabled
);
router.post(
  "/api/users/:userId/parent-access-code/regenerate",
  authenticate,
  requireResourceTenant((req) =>
    parentAccessService.getUserSchoolId(String(req.params.userId || ""), String(req.user?.schoolId || ""))
  ),
  requireRoles(ADMIN_ROLES),
  requireCapability(ADMIN_CAPABILITY, ADMIN_ROLES),
  parentAccessController.regenerateCode
);
router.post(
  "/api/users/:userId/parent-access-code/reveal",
  authenticate,
  requireResourceTenant((req) =>
    parentAccessService.getUserSchoolId(String(req.params.userId || ""), String(req.user?.schoolId || ""))
  ),
  requireRoles(ADMIN_ROLES),
  requireCapability(ADMIN_CAPABILITY, ADMIN_ROLES),
  parentAccessController.revealCode
);
router.post(
  "/api/users/:userId/parent-password/reset",
  authenticate,
  requireResourceTenant((req) =>
    parentAccessService.getUserSchoolId(String(req.params.userId || ""), String(req.user?.schoolId || ""))
  ),
  requireRoles(ADMIN_ROLES),
  requireCapability(ADMIN_CAPABILITY, ADMIN_ROLES),
  validateBody(parentPasswordResetSchema),
  parentAccessController.resetParentPassword
);
router.post(
  "/api/users/:userId/parent-login/reset-lockout",
  authenticate,
  requireResourceTenant((req) =>
    parentAccessService.getUserSchoolId(String(req.params.userId || ""), String(req.user?.schoolId || ""))
  ),
  requireRoles(ADMIN_ROLES),
  requireCapability(ADMIN_CAPABILITY, ADMIN_ROLES),
  parentAccessController.resetLockout
);

router.post(
  "/api/super-admin/schools/:id/parents/:userId/parent-access-code/regenerate",
  authenticateSuperAdmin,
  parentAccessController.superAdminRegenerateCode
);
router.patch(
  "/api/super-admin/schools/:id/parents/:userId/parent-login",
  authenticateSuperAdmin,
  parentAccessController.superAdminSetPhoneEnabled
);
router.post(
  "/api/super-admin/schools/:id/parents/:userId/parent-login/reset-lockout",
  authenticateSuperAdmin,
  parentAccessController.superAdminResetLockout
);

export default router;
