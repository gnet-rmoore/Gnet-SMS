import { Router } from "express";
import { authenticate, requireRoles, requireSchoolMembership, requireTenant, requireResourceTenant } from "../middleware/auth";
import { scheduleController } from "../controllers/scheduleController";
import { resourceLoaders } from "../middleware/resourceLoaders";

const router = Router();

const READ_ROLES = [
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
  "TEACHER",
  "STUDENT",
  "PARENT",
  "COUNSELOR",
  "IT_ADMIN",
] as const;

const WRITE_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"] as const;

router.get(
  "/api/schools/:schoolId/bell-schedules",
  authenticate,
  requireTenant,
  requireRoles([...READ_ROLES]),
  scheduleController.listBellSchedules
);

router.post(
  "/api/schools/:schoolId/bell-schedules",
  authenticate,
  requireTenant,
  requireRoles([...WRITE_ROLES]),
  scheduleController.createBellSchedule
);

router.post(
  "/api/schools/:schoolId/bell-schedules/ensure",
  authenticate,
  requireTenant,
  requireRoles([...READ_ROLES]),
  scheduleController.ensureBellSchedule
);

router.get(
  "/api/bell-schedules/:id",
  authenticate,
  requireSchoolMembership,
  requireRoles([...READ_ROLES]),
  requireResourceTenant(resourceLoaders.bellSchedule),
  scheduleController.getBellSchedule
);

router.patch(
  "/api/bell-schedules/:id",
  authenticate,
  requireSchoolMembership,
  requireRoles([...WRITE_ROLES]),
  requireResourceTenant(resourceLoaders.bellSchedule),
  scheduleController.updateBellSchedule
);

router.delete(
  "/api/bell-schedules/:id",
  authenticate,
  requireSchoolMembership,
  requireRoles([...WRITE_ROLES]),
  requireResourceTenant(resourceLoaders.bellSchedule),
  scheduleController.deleteBellSchedule
);

router.put(
  "/api/bell-schedules/:id/periods",
  authenticate,
  requireSchoolMembership,
  requireRoles([...WRITE_ROLES]),
  requireResourceTenant(resourceLoaders.bellSchedule),
  scheduleController.replacePeriods
);

router.patch(
  "/api/schedule-periods/:id",
  authenticate,
  requireSchoolMembership,
  requireRoles([...WRITE_ROLES]),
  requireResourceTenant(resourceLoaders.schedulePeriod),
  scheduleController.updatePeriod
);

router.get(
  "/api/schools/:schoolId/timetable",
  authenticate,
  requireTenant,
  requireRoles([...READ_ROLES]),
  scheduleController.listTimetable
);

router.put(
  "/api/schools/:schoolId/timetable",
  authenticate,
  requireTenant,
  requireRoles([...WRITE_ROLES]),
  scheduleController.putTimetable
);

router.post(
  "/api/schools/:schoolId/timetable/validate",
  authenticate,
  requireTenant,
  requireRoles([...WRITE_ROLES]),
  scheduleController.validateTimetable
);

router.get(
  "/api/schools/:schoolId/timetable/expand",
  authenticate,
  requireTenant,
  requireRoles([...READ_ROLES]),
  scheduleController.expandTimetable
);

router.post(
  "/api/schools/:schoolId/timetable/copy",
  authenticate,
  requireTenant,
  requireRoles([...WRITE_ROLES]),
  scheduleController.copyClassroom
);

router.delete(
  "/api/timetable-entries/:id",
  authenticate,
  requireSchoolMembership,
  requireRoles([...WRITE_ROLES]),
  requireResourceTenant(resourceLoaders.timetableEntry),
  scheduleController.deleteEntry
);

export default router;
