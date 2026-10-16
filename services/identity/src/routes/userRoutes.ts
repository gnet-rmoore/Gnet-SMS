import express from "express";
import {
  authenticate,
  requireTenant,
  requireRoles,
  requireCapability,
  requireSelfOrRoles,
  requireResourceTenant,
  authenticateInternal,
} from "../middleware/auth";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { userController } from "../controllers/userController";
import { capabilityController } from "../controllers/capabilityController";
import { mailController } from "../controllers/mailController";

const router = express.Router();

router.get(
  "/api/schools/:schoolId/students",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL", "VPI", "VPA", "TEACHER", "ACCOUNTANT", "COUNSELOR"]),
  userController.getStudents
);

router.post(
  "/api/schools/:schoolId/students",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "REGISTRAR"]),
  userController.createStudent
);

router.get(
  "/api/schools/:schoolId/students/import/template.csv",
  authenticate,
  requireTenant,
  requireCapability("action.bulk_import.roster", ["SCHOOL_ADMIN", "REGISTRAR"]),
  userController.studentImportTemplate
);

router.post(
  "/api/schools/:schoolId/students/import/preview",
  authenticate,
  requireTenant,
  requireCapability("action.bulk_import.roster", ["SCHOOL_ADMIN", "REGISTRAR"]),
  userController.previewStudentImport
);

router.post(
  "/api/schools/:schoolId/students/import",
  authenticate,
  requireTenant,
  requireCapability("action.bulk_import.roster", ["SCHOOL_ADMIN", "REGISTRAR"]),
  userController.importStudents
);

router.get(
  "/api/schools/:schoolId/staff",
  authenticate,
  requireTenant,
  requireRoles([
    "SCHOOL_ADMIN", "PRINCIPAL", "VPA", "VPI", "REGISTRAR", "ACCOUNTANT", "TEACHER",
    "MAINTENANCE", "TRANSPORTATION", "SECURITY", "PROCUREMENT", "LIBRARIAN", "NURSE",
    "COUNSELOR", "IT_ADMIN", "ATHLETICS_DIRECTOR", "HOSTEL_WARDEN", "CAFETERIA_MANAGER",
  ]),
  userController.getStaff
);

router.get(
  "/api/schools/:schoolId/users",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "IT_ADMIN"]),
  userController.listSchoolUsers
);

router.get(
  "/api/schools/:schoolId/role-audit",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "IT_ADMIN"]),
  userController.listRoleChangeAudit
);

router.get(
  "/api/schools/:schoolId/role-capabilities",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN"]),
  capabilityController.getMatrix
);

router.put(
  "/api/schools/:schoolId/role-capabilities/:role",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN"]),
  capabilityController.putRoleOverrides
);

router.post(
  "/api/schools/:schoolId/staff",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPA"]),
  userController.createStaff
);

router.get(
  "/api/schools/:schoolId/staff/import/template.csv",
  authenticate,
  requireTenant,
  requireCapability("action.bulk_import.roster", ["SCHOOL_ADMIN", "PRINCIPAL", "VPA"]),
  userController.staffImportTemplate
);

router.post(
  "/api/schools/:schoolId/staff/import/preview",
  authenticate,
  requireTenant,
  requireCapability("action.bulk_import.roster", ["SCHOOL_ADMIN", "PRINCIPAL", "VPA"]),
  userController.previewStaffImport
);

router.post(
  "/api/schools/:schoolId/staff/import",
  authenticate,
  requireTenant,
  requireCapability("action.bulk_import.roster", ["SCHOOL_ADMIN", "PRINCIPAL", "VPA"]),
  userController.importStaff
);

router.get(
  "/api/students/:studentId/grades",
  authenticate,
  requireSelfOrRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "PARENT"]),
  userController.getStudentGrades
);

router.get(
  "/api/parents/:parentId/children",
  authenticate,
  requireSelfOrRoles(["SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR", "COUNSELOR"]),
  requireResourceTenant(resourceLoaders.parent),
  userController.getParentsChildren
);

router.get("/api/users/me/guide", authenticate, userController.getMyGuide);
router.patch("/api/users/me/guide", authenticate, userController.patchMyGuide);

router.get(
  "/api/schools/:schoolId/guide-stats",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "IT_ADMIN"]),
  userController.getSchoolGuideStats
);

router.get(
  "/api/users/:userId",
  authenticate,
  requireSelfOrRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "REGISTRAR", "TEACHER", "ACCOUNTANT"]),
  requireResourceTenant(resourceLoaders.user),
  userController.getUserById
);

router.patch(
  "/api/users/:userId",
  authenticate,
  requireSelfOrRoles(["SCHOOL_ADMIN", "IT_ADMIN", "REGISTRAR", "PRINCIPAL"]),
  requireResourceTenant(resourceLoaders.user),
  userController.updateUser
);

router.patch(
  "/api/users/:userId/role",
  authenticate,
  requireRoles(["SCHOOL_ADMIN"]),
  requireResourceTenant(resourceLoaders.user),
  userController.changeUserRole
);

router.delete(
  "/api/users/:userId",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL"]),
  requireResourceTenant(resourceLoaders.user),
  userController.deleteUser
);

// --- Internal service-to-service API (no user JWT) ---
router.post("/api/internal/mail/send", authenticateInternal, mailController.sendInternal);
router.post("/api/internal/mail/render", authenticateInternal, mailController.renderInternal);
router.post("/api/internal/users/find-or-create", authenticateInternal, userController.findOrCreateUserInternal);
router.get("/api/internal/users/:id", authenticateInternal, userController.getUserByIdInternal);
router.patch("/api/internal/users/:id", authenticateInternal, userController.patchUserInternal);
router.post("/api/internal/users/bulk", authenticateInternal, userController.getUsersByIdsInternal);
router.get(
  "/api/internal/schools/:schoolId/students",
  authenticateInternal,
  userController.getStudentsInternal
);
router.get(
  "/api/internal/schools/:schoolId/users",
  authenticateInternal,
  userController.getUsersByRolesInternal
);
router.get(
  "/api/internal/schools/:schoolId/users/lookup",
  authenticateInternal,
  userController.lookupUserByEmailInternal
);
router.post("/api/internal/parent-links", authenticateInternal, userController.createParentLinkInternal);
router.get(
  "/api/internal/parents/:parentId/children",
  authenticateInternal,
  userController.getParentsChildrenInternal
);
router.get(
  "/api/internal/students/:studentId/parents",
  authenticateInternal,
  userController.getStudentParentsInternal
);
router.get(
  "/api/internal/parents/:parentId/students/:studentId/assert-link",
  authenticateInternal,
  userController.assertParentLinkedInternal
);

router.get(
  "/api/internal/capabilities",
  authenticateInternal,
  capabilityController.resolveInternal
);

router.post(
  "/api/internal/schools/:schoolId/students/verify-returning",
  authenticateInternal,
  userController.verifyReturningStudentInternal
);

export default router;
