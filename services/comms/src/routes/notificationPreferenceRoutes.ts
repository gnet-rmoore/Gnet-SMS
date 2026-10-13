import { Router } from "express";
import { authenticate, requireTenant, requireRoles } from "../middleware/auth";
import { notificationPreferenceController } from "../controllers/notificationPreferenceController";

const router = Router();

const SETTINGS_ROLES = ["SCHOOL_ADMIN", "IT_ADMIN", "PRINCIPAL"];

router.get(
  "/api/schools/:schoolId/notification-preferences",
  authenticate,
  requireTenant,
  requireRoles(SETTINGS_ROLES),
  notificationPreferenceController.list
);

router.patch(
  "/api/schools/:schoolId/notification-preferences",
  authenticate,
  requireTenant,
  requireRoles(SETTINGS_ROLES),
  notificationPreferenceController.upsert
);

export default router;
