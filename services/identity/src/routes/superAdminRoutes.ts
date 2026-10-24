import express from "express";
import { authenticateSuperAdmin } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { credentialCreateSchema } from "../validation/schemas";
import { superAdminController } from "../controllers/superAdminController";
import { databaseMaintenanceController } from "../controllers/databaseMaintenanceController";

const router = express.Router();
const sa = authenticateSuperAdmin;

router.get("/api/super-admin/schools", sa, superAdminController.getSchools);
router.get("/api/super-admin/schools/export.csv", sa, superAdminController.exportSchoolsCsv);
router.post("/api/super-admin/schools", sa, superAdminController.registerSchool);
router.post("/api/super-admin/schools/seed-demo", sa, superAdminController.seedDemoSchool);
router.get("/api/super-admin/schools/:id", sa, superAdminController.getSchool);
router.get("/api/super-admin/schools/:id/students", sa, superAdminController.listSchoolStudents);
router.get("/api/super-admin/schools/:id/staff", sa, superAdminController.listSchoolStaff);
router.get("/api/super-admin/schools/:id/parents", sa, superAdminController.listSchoolParents);
router.get("/api/super-admin/schools/:id/health", sa, superAdminController.schoolHealth);
router.get("/api/super-admin/schools/:id/export/dsr", sa, superAdminController.exportDsr);
router.patch("/api/super-admin/schools/:id/plan", sa, superAdminController.assignPlan);
router.patch("/api/super-admin/schools/:id/billing", sa, superAdminController.updateBilling);
router.post(
  "/api/super-admin/schools/:id/billing/checkout",
  sa,
  superAdminController.startBillingCheckout
);
router.patch("/api/super-admin/schools/:id/domain", sa, superAdminController.setDomain);
router.post("/api/super-admin/schools/:id/domain/verify", sa, superAdminController.verifyDomain);
router.get("/api/super-admin/domain-edge", sa, superAdminController.getDomainEdge);
router.patch("/api/super-admin/schools/:id/notes", sa, superAdminController.updateNotes);
router.post("/api/super-admin/schools/:id/request-delete", sa, superAdminController.requestDelete);
router.post("/api/super-admin/schools/:id/resend-invite", sa, superAdminController.resendInvite);
router.patch("/api/super-admin/schools/:id/status", sa, superAdminController.updateSchoolStatus);
router.patch("/api/super-admin/schools/:id/background-image", sa, superAdminController.updateSchoolBackgroundImage);
router.patch("/api/super-admin/schools/:id", sa, superAdminController.updateSchool);
router.delete("/api/super-admin/schools/:id", sa, superAdminController.deleteSchool);

router.get("/api/super-admin/delete-requests", sa, superAdminController.listPendingDeletes);
router.post(
  "/api/super-admin/delete-requests/:requestId/approve",
  sa,
  superAdminController.approveDelete
);

router.get("/api/super-admin/school-registrations", sa, superAdminController.listRegistrations);
router.get("/api/super-admin/school-registrations/:id", sa, superAdminController.getRegistration);
router.post(
  "/api/super-admin/school-registrations/:id/approve",
  sa,
  superAdminController.approveRegistration
);
router.post(
  "/api/super-admin/school-registrations/:id/reject",
  sa,
  superAdminController.rejectRegistration
);
router.post(
  "/api/super-admin/school-registrations/:id/request-info",
  sa,
  superAdminController.requestRegistrationInfo
);

router.get("/api/super-admin/plans", sa, superAdminController.listPlans);
router.patch("/api/super-admin/plans/:code", sa, superAdminController.updatePlan);
router.post("/api/super-admin/plans", sa, superAdminController.createPlan);
router.get("/api/super-admin/stats", sa, superAdminController.getStats);
router.get("/api/super-admin/reports/breakdown", sa, superAdminController.reportsBreakdown);
router.post(
  "/api/super-admin/billing/console-complete",
  sa,
  superAdminController.completeConsoleCheckout
);
router.post("/api/webhooks/platform-stripe", superAdminController.platformStripeWebhook);
router.get("/api/super-admin/users", sa, superAdminController.getUsers);
router.get("/api/super-admin/users/export.csv", sa, superAdminController.exportUsersCsv);
router.post("/api/super-admin/users/:id/reset-password", sa, superAdminController.resetUserPassword);
router.patch("/api/super-admin/users/:id/active", sa, superAdminController.setUserActive);
router.post("/api/super-admin/users/:id/impersonate", sa, superAdminController.impersonate);
router.post("/api/super-admin/schools/:id/impersonate", sa, superAdminController.impersonateSchool);
router.post("/api/super-admin/impersonation/end", sa, superAdminController.endImpersonation);

router.get("/api/super-admin/operators", sa, superAdminController.listOperators);
router.post("/api/super-admin/operators", sa, superAdminController.createOperator);
router.patch("/api/super-admin/operators/:id/role", sa, superAdminController.setOperatorRole);
router.patch("/api/super-admin/operators/:id", sa, superAdminController.setOperatorActive);
router.post(
  "/api/super-admin/operators/:id/reset-password",
  sa,
  superAdminController.resetOperatorPassword
);

router.get("/api/super-admin/logs", sa, superAdminController.getLogs);
router.get("/api/super-admin/logs/summary", sa, superAdminController.getLogSummary);
router.get("/api/super-admin/delivery-diagnostics", sa, superAdminController.deliveryDiagnostics);
router.post("/api/super-admin/broadcast", sa, superAdminController.broadcast);

router.get("/api/super-admin/platform-settings", sa, superAdminController.getPlatformSettings);
router.patch("/api/super-admin/platform-settings", sa, superAdminController.updatePlatformSettings);
router.get("/api/super-admin/activity", sa, superAdminController.getActivity);
router.get("/api/super-admin/activity/export", sa, superAdminController.exportActivityCsv);

router.get("/api/super-admin/credentials", sa, superAdminController.getCredentials);
router.post(
  "/api/super-admin/credentials",
  sa,
  validateBody(credentialCreateSchema),
  superAdminController.createCredential
);
router.delete("/api/super-admin/credentials/:id", sa, superAdminController.deleteCredential);

router.get("/api/super-admin/email-settings", sa, superAdminController.getEmailSettings);
router.patch("/api/super-admin/email-settings", sa, superAdminController.updateEmailSettings);
router.post("/api/super-admin/email-settings/test", sa, superAdminController.sendTestEmail);

router.get("/api/super-admin/database/status", sa, databaseMaintenanceController.getStatus);
router.post("/api/super-admin/database/backup", sa, databaseMaintenanceController.createBackup);
router.get("/api/super-admin/database/backups", sa, databaseMaintenanceController.listBackups);
router.get(
  "/api/super-admin/database/backups/:name/download",
  sa,
  databaseMaintenanceController.downloadBackup
);
router.delete(
  "/api/super-admin/database/backups/:name",
  sa,
  databaseMaintenanceController.deleteBackup
);
router.post("/api/super-admin/database/optimize", sa, databaseMaintenanceController.optimize);

export default router;
