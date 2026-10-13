import { Router } from "express";
import {
  authenticate,
  requireSchoolMembership,
  requireRoles,
  authenticateInternal,
} from "../middleware/auth";
import { calendarController } from "../controllers/calendarController";

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
  "ACCOUNTANT",
  "IT_ADMIN",
  "HOSTEL_WARDEN",
] as const;

const WRITE_ROLES = [
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
  "TEACHER",
  "ACCOUNTANT",
  "IT_ADMIN",
] as const;

router.get(
  "/api/calendar/events",
  authenticate,
  requireSchoolMembership,
  requireRoles([...READ_ROLES]),
  calendarController.getCalendarEvents
);

router.post(
  "/api/calendar/events",
  authenticate,
  requireSchoolMembership,
  requireRoles([...WRITE_ROLES]),
  calendarController.createEvent
);

router.patch(
  "/api/calendar/events/:id",
  authenticate,
  requireSchoolMembership,
  requireRoles([...WRITE_ROLES]),
  calendarController.updateEvent
);

router.delete(
  "/api/calendar/events/:id",
  authenticate,
  requireSchoolMembership,
  requireRoles([...WRITE_ROLES]),
  calendarController.deleteEvent
);

router.get(
  "/api/schools/:schoolId/calendar/instructional-days",
  authenticate,
  requireSchoolMembership,
  requireRoles([...READ_ROLES]),
  calendarController.getInstructionalDays
);

router.get(
  "/api/schools/:schoolId/calendar/instructional-day",
  authenticate,
  requireSchoolMembership,
  requireRoles([...READ_ROLES]),
  calendarController.checkInstructionalDay
);

router.get(
  "/api/internal/schools/:schoolId/instructional-day",
  authenticateInternal,
  calendarController.checkInstructionalDay
);

router.get(
  "/api/internal/schools/:schoolId/instructional-days",
  authenticateInternal,
  calendarController.getInstructionalDays
);

router.post(
  "/api/internal/schools/:schoolId/calendar/attendance-event",
  authenticateInternal,
  calendarController.upsertAttendanceEventInternal
);

export default router;
