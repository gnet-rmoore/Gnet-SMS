import express from "express";
import { authenticate, requireTenant, requireRoles, requireResourceTenant, authenticateInternal } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { financeController } from "../controllers/financeController";
import { receiptController } from "../controllers/receiptController";
import { auditController } from "../controllers/auditController";
import { feeCreateSchema, feeUpdateSchema, feeTemplateSchema, feeBatchApplySchema, feeCollectSchema } from "../validation/schemas";

const router = express.Router();

router.get(
  "/api/schools/:schoolId/fees",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT", "PRINCIPAL", "REGISTRAR", "STUDENT", "PARENT", "VPA"]),
  financeController.getFees
);

router.get(
  "/api/my-fees",
  authenticate,
  requireRoles(["STUDENT", "PARENT", "SCHOOL_ADMIN", "ACCOUNTANT"]),
  financeController.getMyFees
);

router.get(
  "/api/my-fee-payment-txns",
  authenticate,
  requireRoles(["STUDENT", "PARENT", "SCHOOL_ADMIN", "ACCOUNTANT"]),
  financeController.listMyPaymentTxns
);

router.post(
  "/api/schools/:schoolId/fees",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  validateBody(feeCreateSchema),
  financeController.createFee
);

router.post(
  "/api/schools/:schoolId/fees/batch-apply",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  validateBody(feeBatchApplySchema),
  financeController.batchApply
);

router.patch(
  "/api/schools/:schoolId/fees/:id",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  validateBody(feeUpdateSchema),
  financeController.updateFee
);

router.post(
  "/api/schools/:schoolId/fees/:id/void",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  financeController.voidFee
);

router.post(
  "/api/schools/:schoolId/fees/:id/write-off",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  financeController.writeOffFee
);

router.get(
  "/api/schools/:schoolId/fee-billing-settings",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  financeController.getBillingSettings
);

router.patch(
  "/api/schools/:schoolId/fee-billing-settings",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  financeController.updateBillingSettings
);

router.post(
  "/api/schools/:schoolId/fee-payment-txns/backfill-legacy",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  financeController.backfillLegacyPaidTxns
);

router.patch(
  "/api/fees/:id/pay",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT", "PARENT", "STUDENT"]),
  requireResourceTenant(resourceLoaders.fee),
  financeController.payFee
);

router.post(
  "/api/fees/:id/pay",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT", "PARENT", "STUDENT"]),
  requireResourceTenant(resourceLoaders.fee),
  financeController.payFee
);

router.post(
  "/api/schools/:schoolId/fees/:id/collect",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  validateBody(feeCollectSchema),
  financeController.collectPayment
);

router.post(
  "/api/fees/:id/payments",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  requireResourceTenant(resourceLoaders.fee),
  validateBody(feeCollectSchema),
  financeController.recordFeePayment
);

router.get(
  "/api/fees/:id/payments",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT", "PRINCIPAL", "REGISTRAR", "STUDENT", "PARENT", "VPA"]),
  requireResourceTenant(resourceLoaders.fee),
  financeController.listFeePayments
);

router.get(
  "/api/schools/:schoolId/fee-payment-txns/export",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  financeController.exportSchoolPaymentTxns
);

router.get(
  "/api/schools/:schoolId/fee-payment-txns",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  financeController.listSchoolPaymentTxns
);

router.post(
  "/api/fees/:id/remind",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  requireResourceTenant(resourceLoaders.fee),
  financeController.sendReminder
);

router.get(
  "/api/schools/:schoolId/fee-templates",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  financeController.listTemplates
);

router.post(
  "/api/schools/:schoolId/fee-templates",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  validateBody(feeTemplateSchema),
  financeController.createTemplate
);

router.patch(
  "/api/schools/:schoolId/fee-templates/:id",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  validateBody(feeTemplateSchema),
  financeController.updateTemplate
);

router.delete(
  "/api/schools/:schoolId/fee-templates/:id",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  financeController.deleteTemplate
);

router.get(
  "/api/schools/:schoolId/expenses",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT", "PRINCIPAL", "VPA"]),
  financeController.getExpenses
);

router.post(
  "/api/schools/:schoolId/expenses",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  financeController.createExpense
);

router.patch(
  "/api/schools/:schoolId/expenses/:id",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  financeController.updateExpense
);

router.delete(
  "/api/schools/:schoolId/expenses/:id",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  financeController.deleteExpense
);

router.get(
  "/api/schools/:schoolId/finance/summary",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT", "PRINCIPAL", "VPA"]),
  financeController.getFinanceSummary
);

router.post("/api/internal/fees", authenticateInternal, financeController.createFeeInternal);
router.get("/api/internal/fees/:id", authenticateInternal, financeController.getFeeInternal);

router.post(
  "/api/fees/:id/checkout",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT", "PARENT", "STUDENT", "REGISTRAR"]),
  requireResourceTenant(resourceLoaders.fee),
  financeController.createCheckout
);

router.post("/api/public/fees/:id/checkout", financeController.createCheckout);
router.post("/api/public/checkout/complete", financeController.completeMockCheckout);
router.post("/api/webhooks/stripe", financeController.stripeWebhook);

// --- Receipts (official PDF / QR verify) ---
router.get(
  "/api/schools/:schoolId/receipts/templates",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT", "PRINCIPAL", "REGISTRAR", "IT_ADMIN"]),
  receiptController.listTemplates
);

router.get(
  "/api/schools/:schoolId/receipts/preview",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT", "PRINCIPAL", "REGISTRAR", "IT_ADMIN"]),
  receiptController.preview
);

router.get(
  "/api/schools/:schoolId/receipts",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT", "PRINCIPAL", "REGISTRAR", "STUDENT", "PARENT", "VPA", "TEACHER"]),
  receiptController.list
);

router.post(
  "/api/schools/:schoolId/receipts/issue",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  receiptController.issue
);

router.get(
  "/api/receipts/:id",
  authenticate,
  requireResourceTenant(resourceLoaders.receipt),
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT", "PRINCIPAL", "REGISTRAR", "STUDENT", "PARENT", "VPA", "TEACHER"]),
  receiptController.getOne
);

router.get(
  "/api/receipts/:id/download",
  authenticate,
  requireResourceTenant(resourceLoaders.receipt),
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT", "PRINCIPAL", "REGISTRAR", "STUDENT", "PARENT", "VPA", "TEACHER"]),
  receiptController.download
);

router.post(
  "/api/receipts/:id/void",
  authenticate,
  requireResourceTenant(resourceLoaders.receipt),
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  receiptController.voidReceipt
);

router.post(
  "/api/receipts/:id/reissue",
  authenticate,
  requireResourceTenant(resourceLoaders.receipt),
  requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"]),
  receiptController.reissue
);

router.post("/api/internal/receipts/issue", authenticateInternal, receiptController.issueInternal);
router.post(
  "/api/internal/receipts/void-by-source",
  authenticateInternal,
  receiptController.voidBySourceInternal
);
router.get("/api/public/receipts/verify/:code", receiptController.verify);
router.get("/api/internal/audit/events", authenticateInternal, auditController.listEvents);

export default router;
