import { Router } from "express";
import { authenticate, requireTenant, requireRoles, requireSelfOrRoles, requireResourceTenant, authenticateInternal } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { payrollController } from "../controllers/payrollController";
import { payrollTemplateController } from "../controllers/payrollTemplateController";
import {
  payrollCreateSchema,
  payrollTemplateCreateSchema,
  payrollTemplateFromPayrollsSchema,
  payrollTemplateRunSchema,
  payrollTemplateUpdateSchema,
} from "../validation/schemas";

/** Same paths as monolith src/server/routes/payrollRoutes.ts. */
const router = Router();

const PAYROLL_ADMIN = ["SCHOOL_ADMIN", "ACCOUNTANT", "PRINCIPAL", "VPA"];
const PAYROLL_WRITE = ["SCHOOL_ADMIN", "ACCOUNTANT"];

router.get(
  "/api/schools/:schoolId/payrolls",
  authenticate,
  requireTenant,
  requireRoles(PAYROLL_ADMIN),
  payrollController.getPayrolls
);

router.get(
  "/api/users/:userId/payrolls",
  authenticate,
  requireSelfOrRoles(PAYROLL_ADMIN),
  requireResourceTenant(resourceLoaders.user),
  payrollController.getUserPayrolls
);

router.post(
  "/api/schools/:schoolId/payrolls",
  authenticate,
  requireTenant,
  requireRoles(PAYROLL_WRITE),
  validateBody(payrollCreateSchema),
  payrollController.createPayroll
);

router.put(
  "/api/payrolls/:id",
  authenticate,
  requireRoles(PAYROLL_WRITE),
  requireResourceTenant(resourceLoaders.payroll),
  payrollController.updatePayroll
);

router.delete(
  "/api/payrolls/:id",
  authenticate,
  requireRoles(PAYROLL_WRITE),
  requireResourceTenant(resourceLoaders.payroll),
  payrollController.deletePayroll
);

// --- Recurring payroll templates ---
router.get(
  "/api/schools/:schoolId/payroll-templates",
  authenticate,
  requireTenant,
  requireRoles(PAYROLL_ADMIN),
  payrollTemplateController.listTemplates
);

router.post(
  "/api/schools/:schoolId/payroll-templates",
  authenticate,
  requireTenant,
  requireRoles(PAYROLL_WRITE),
  validateBody(payrollTemplateCreateSchema),
  payrollTemplateController.createTemplate
);

router.post(
  "/api/schools/:schoolId/payroll-templates/from-payrolls",
  authenticate,
  requireTenant,
  requireRoles(PAYROLL_WRITE),
  validateBody(payrollTemplateFromPayrollsSchema),
  payrollTemplateController.createFromPayrolls
);

router.get(
  "/api/payroll-templates/:id/preview",
  authenticate,
  requireRoles(PAYROLL_ADMIN),
  requireResourceTenant(resourceLoaders.payrollTemplate),
  payrollTemplateController.previewTemplate
);

router.post(
  "/api/payroll-templates/:id/run",
  authenticate,
  requireRoles(PAYROLL_WRITE),
  requireResourceTenant(resourceLoaders.payrollTemplate),
  validateBody(payrollTemplateRunSchema),
  payrollTemplateController.runTemplate
);

router.put(
  "/api/payroll-templates/:id",
  authenticate,
  requireRoles(PAYROLL_WRITE),
  requireResourceTenant(resourceLoaders.payrollTemplate),
  validateBody(payrollTemplateUpdateSchema),
  payrollTemplateController.updateTemplate
);

router.delete(
  "/api/payroll-templates/:id",
  authenticate,
  requireRoles(PAYROLL_WRITE),
  requireResourceTenant(resourceLoaders.payrollTemplate),
  payrollTemplateController.deleteTemplate
);

// --- Internal service-to-service API (no user JWT) — Finance's summary uses this. ---
router.get("/api/internal/payrolls", authenticateInternal, payrollController.getPayrollsInternal);

export default router;
