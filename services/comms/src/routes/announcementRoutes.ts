import { Router } from "express";
import { authenticate, requireTenant, requireRoles, requireResourceTenant } from "../middleware/auth";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { announcementController } from "../controllers/announcementController";

/** Same paths as monolith src/server/routes/announcementRoutes.ts. */
const router = Router();

const ANN_WRITE = ["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "VPI", "VPA"];

router.get("/api/schools/:schoolId/announcements", authenticate, requireTenant, announcementController.getAnnouncements);

router.post(
  "/api/schools/:schoolId/announcements",
  authenticate,
  requireTenant,
  requireRoles(ANN_WRITE),
  announcementController.createAnnouncement
);

router.post(
  "/api/announcements/:id/acknowledge",
  authenticate,
  requireResourceTenant(resourceLoaders.announcement),
  announcementController.acknowledgeAnnouncement
);

router.put(
  "/api/announcements/:id",
  authenticate,
  requireRoles(ANN_WRITE),
  requireResourceTenant(resourceLoaders.announcement),
  announcementController.updateAnnouncement
);

router.delete(
  "/api/announcements/:id",
  authenticate,
  requireRoles(ANN_WRITE),
  requireResourceTenant(resourceLoaders.announcement),
  announcementController.deleteAnnouncement
);

export default router;
