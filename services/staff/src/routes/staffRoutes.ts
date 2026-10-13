import express from "express";
import { authenticate, requireTenant, requireRoles, requireResourceTenant, authenticateInternal } from "../middleware/auth";
import { auditController } from "../controllers/auditController";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { validateBody } from "../middleware/validate";
import { staffController } from "../controllers/staffController";
import { leavePoliciesUpdateSchema, staffTaskCreateSchema } from "../validation/schemas";

/** Same paths as monolith src/server/routes/staffRoutes.ts. */
const router = express.Router();

const STAFF_ROLES = [
  "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "ACCOUNTANT", "REGISTRAR", "VPI", "VPA",
  "TRANSPORTATION", "MAINTENANCE", "LIBRARIAN", "NURSE", "COUNSELOR", "SECURITY",
  "IT_ADMIN", "PROCUREMENT", "ATHLETICS_DIRECTOR", "HOSTEL_WARDEN", "CAFETERIA_MANAGER",
];

const LEAVE_APPROVER_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPA"];

router.get(
  "/api/schools/:schoolId/leave-requests",
  authenticate,
  requireTenant,
  requireRoles(STAFF_ROLES),
  staffController.getLeaveRequests
);

router.get(
  "/api/schools/:schoolId/leave-balances",
  authenticate,
  requireTenant,
  requireRoles(STAFF_ROLES),
  staffController.getLeaveBalances
);

router.get(
  "/api/schools/:schoolId/leave-policies",
  authenticate,
  requireTenant,
  requireRoles(STAFF_ROLES),
  staffController.getLeavePolicies
);

router.put(
  "/api/schools/:schoolId/leave-policies",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPA"]),
  validateBody(leavePoliciesUpdateSchema),
  staffController.updateLeavePolicies
);

router.post(
  "/api/schools/:schoolId/leave-requests",
  authenticate,
  requireTenant,
  requireRoles(STAFF_ROLES),
  staffController.createLeaveRequest
);

router.patch(
  "/api/leave-requests/:id",
  authenticate,
  requireRoles(STAFF_ROLES),
  requireResourceTenant(resourceLoaders.leaveRequest),
  staffController.updateLeaveStatus
);

router.get(
  "/api/schools/:schoolId/staff-tasks",
  authenticate,
  requireTenant,
  requireRoles(STAFF_ROLES),
  staffController.getTasks
);

router.post(
  "/api/schools/:schoolId/staff-tasks",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "VPI"]),
  validateBody(staffTaskCreateSchema),
  staffController.createTask
);

router.patch(
  "/api/staff-tasks/:id",
  authenticate,
  requireRoles(STAFF_ROLES),
  requireResourceTenant(resourceLoaders.staffTask),
  staffController.updateTaskStatus
);

router.get(
  "/api/schools/:schoolId/staff-attendance",
  authenticate,
  requireTenant,
  requireRoles(STAFF_ROLES),
  staffController.getStaffAttendance
);

router.get(
  "/api/schools/:schoolId/staff-attendance/summary",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "ACCOUNTANT", "VPI"]),
  staffController.getAttendanceSummary
);

router.post(
  "/api/schools/:schoolId/staff-attendance",
  authenticate,
  requireTenant,
  requireRoles(STAFF_ROLES),
  staffController.markAttendance
);

router.get("/api/internal/audit/events", authenticateInternal, auditController.listEvents);

export default router;
