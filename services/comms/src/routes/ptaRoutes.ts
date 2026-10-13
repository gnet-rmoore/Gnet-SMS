import { Router } from "express";
import {
  authenticate,
  requireTenant,
  requireRoles,
  requireResourceTenant,
} from "../middleware/auth";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { ptaController } from "../controllers/ptaController";

const router = Router();

const PTA_ADMIN = ["SCHOOL_ADMIN"];
const PTA_READ = ["SCHOOL_ADMIN", "PRINCIPAL", "PARENT"];

router.get(
  "/api/schools/:schoolId/pta",
  authenticate,
  requireTenant,
  requireRoles(PTA_READ),
  ptaController.getPta
);

router.put(
  "/api/schools/:schoolId/pta",
  authenticate,
  requireTenant,
  requireRoles(PTA_ADMIN),
  ptaController.upsertPta
);

router.post(
  "/api/schools/:schoolId/pta/officers",
  authenticate,
  requireTenant,
  requireRoles(PTA_ADMIN),
  ptaController.appointOfficer
);

router.delete(
  "/api/schools/:schoolId/pta/officers/:userId",
  authenticate,
  requireTenant,
  requireRoles(PTA_ADMIN),
  ptaController.removeOfficer
);

router.get(
  "/api/schools/:schoolId/pta/meetings",
  authenticate,
  requireTenant,
  requireRoles(PTA_READ),
  ptaController.listMeetings
);

router.post(
  "/api/schools/:schoolId/pta/meetings",
  authenticate,
  requireTenant,
  requireRoles([...PTA_ADMIN, "PRINCIPAL", "PARENT"]),
  ptaController.createMeeting
);

router.put(
  "/api/pta/meetings/:id",
  authenticate,
  requireRoles([...PTA_ADMIN, "PRINCIPAL", "PARENT"]),
  requireResourceTenant(resourceLoaders.ptaMeeting),
  ptaController.updateMeeting
);

router.post(
  "/api/pta/meetings/:id/rsvp",
  authenticate,
  requireRoles(["PARENT"]),
  requireResourceTenant(resourceLoaders.ptaMeeting),
  ptaController.rsvpMeeting
);

router.get(
  "/api/schools/:schoolId/pta/volunteers",
  authenticate,
  requireTenant,
  requireRoles(PTA_READ),
  ptaController.listVolunteers
);

router.post(
  "/api/schools/:schoolId/pta/volunteers",
  authenticate,
  requireTenant,
  requireRoles([...PTA_ADMIN, "PRINCIPAL", "PARENT"]),
  ptaController.createVolunteer
);

router.post(
  "/api/pta/volunteers/:id/signup",
  authenticate,
  requireRoles(["PARENT"]),
  requireResourceTenant(resourceLoaders.ptaVolunteer),
  ptaController.signupVolunteer
);

router.get(
  "/api/schools/:schoolId/pta/campaigns",
  authenticate,
  requireTenant,
  requireRoles(PTA_READ),
  ptaController.listCampaigns
);

router.post(
  "/api/schools/:schoolId/pta/campaigns",
  authenticate,
  requireTenant,
  requireRoles([...PTA_ADMIN, "PRINCIPAL", "PARENT"]),
  ptaController.createCampaign
);

router.put(
  "/api/pta/campaigns/:id",
  authenticate,
  requireRoles([...PTA_ADMIN, "PRINCIPAL", "PARENT"]),
  requireResourceTenant(resourceLoaders.ptaCampaign),
  ptaController.updateCampaign
);

export default router;
