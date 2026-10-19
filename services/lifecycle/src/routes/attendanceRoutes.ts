import express from "express";
import {
  authenticate,
  requireTenant,
  requireRoles,
  requireResourceTenant,
  authenticateInternal,
} from "../middleware/auth";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { attendanceController } from "../controllers/attendanceController";

/** Same paths as monolith src/server/routes/attendanceRoutes.ts. */
const router = express.Router();

router.get(
  "/api/schools/:schoolId/attendance",
  authenticate,
  requireTenant,
  requireRoles([
    "SCHOOL_ADMIN",
    "PRINCIPAL",
    "VPI",
    "VPA",
    "TEACHER",
    "PARENT",
    "STUDENT",
    "HOSTEL_WARDEN",
  ]),
  attendanceController.getAttendanceBySchool
);

router.get(
  "/api/schools/:schoolId/attendance/stats",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR", "TEACHER"]),
  attendanceController.getAttendanceStats
);

router.get(
  "/api/attendance/:id",
  authenticate,
  requireRoles([
    "SCHOOL_ADMIN",
    "PRINCIPAL",
    "VPI",
    "VPA",
    "TEACHER",
    "PARENT",
    "STUDENT",
    "HOSTEL_WARDEN",
  ]),
  requireResourceTenant(resourceLoaders.attendance),
  attendanceController.getAttendanceDetails
);

router.post(
  "/api/schools/:schoolId/attendance",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "TEACHER"]),
  attendanceController.createAttendance
);

router.get(
  "/api/internal/schools/:schoolId/attendance/summary",
  authenticateInternal,
  attendanceController.getAttendanceSummaryInternal
);

export default router;
