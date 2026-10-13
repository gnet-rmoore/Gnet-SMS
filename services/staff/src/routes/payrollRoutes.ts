import { Router } from "express";
import { authenticate, requireTenant, requireRoles, requireSelfOrRoles, requireResourceTenant, authenticateInternal } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { payrollController } from "../controllers/payrollController";
import { payrollCreateSchema } from "../validation/schemas";

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

// --- Internal service-to-service API (no user JWT) — Finance's summary uses this. ---
router.get("/api/internal/payrolls", authenticateInternal, payrollController.getPayrollsInternal);

export default router;
