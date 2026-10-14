import type { Request, Response } from "express";
import { financeService } from "../services/financeService";

/** Ported verbatim from src/server/controllers/financeController.ts */
export const financeController = {
  async getFees(req: Request, res: Response) {
    const { schoolId } = req.params;
    const { studentId, q, status, type, page, pageSize, sort, order, schoolYearKey } = req.query;
    const user = (req as any).user;
    try {
      let scopedStudentId = studentId as string | undefined;
      let scopedStudentIds: string[] | undefined;
      if (user?.role === "STUDENT") {
        scopedStudentId = user.id;
      } else if (user?.role === "PARENT") {
        const { getParentChildrenIds } = await import("../lib/identityClient");
        scopedStudentIds = await getParentChildrenIds(user.id);
        if (!scopedStudentIds.length) return res.json([]);
      }
      const fees = await financeService.getFees(
        schoolId,
        scopedStudentId,
        scopedStudentIds,
        {
          q: q ? String(q) : undefined,
          status: status ? String(status) : undefined,
          type: type ? String(type) : undefined,
          page: page as string | undefined,
          pageSize: pageSize as string | undefined,
          sort: sort ? String(sort) : undefined,
          order: order ? String(order) : undefined,
          schoolYearKey: schoolYearKey ? String(schoolYearKey) : undefined,
        }
      );
      res.json(fees);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch fees" });
    }
  },

  async getMyFees(req: Request, res: Response) {
    const user = (req as any).user;
    try {
      const fees = await financeService.getMyFees(
        user.id,
        user.role,
        user.schoolId
      );
      res.json(fees);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch your fees" });
    }
  },

  async createFee(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;

    if (user.role !== "ACCOUNTANT" && user.role !== "SCHOOL_ADMIN") {
      return res.status(403).json({ error: "Unauthorized to create fee records" });
    }

    try {
      const fee = await financeService.createFee(schoolId, req.body, {
        role: user.role,
      });
      res.json(fee);
    } catch (err: any) {
      res.status(err.status || 500).json({
        error: err.message || "Failed to create fee payment",
        code: err.code,
      });
    }
  },

  async collectPayment(req: Request, res: Response) {
    const { id } = req.params;
    const { paidAt, confirmStale, amount, method, notes, payerUserId } = req.body || {};
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized to collect payments" });
    }

    try {
      const result = await financeService.recordPayment(id, {
        amount,
        method,
        paidAt,
        notes,
        payerUserId,
        role: user.role,
        confirmStale: Boolean(confirmStale),
        recordedBy: user.id,
        recordedByRole: user.role,
      });
      res.json(result.fee);
    } catch (err: any) {
      res.status(err.status || 500).json({
        error: err.message || "Failed to collect payment",
        code: err.code,
        confirmRequired: err.confirmRequired,
      });
    }
  },

  async recordFeePayment(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized to record payments" });
    }
    try {
      const result = await financeService.recordPayment(id, {
        ...req.body,
        role: user.role,
        confirmStale: Boolean(req.body?.confirmStale),
        recordedBy: user.id,
        recordedByRole: user.role,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({
        error: err.message || "Failed to record payment",
        code: err.code,
        confirmRequired: err.confirmRequired,
      });
    }
  },

  async listFeePayments(req: Request, res: Response) {
    try {
      const schoolId = (req as any).user?.schoolId || req.params.schoolId;
      const rows = await financeService.listPaymentsForFee(req.params.id, schoolId);
      res.json(rows);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to list payments" });
    }
  },

  async listSchoolPaymentTxns(req: Request, res: Response) {
    try {
      const result = await financeService.listSchoolPaymentTxns(req.params.schoolId, req.query as any);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to list transactions" });
    }
  },

  async exportSchoolPaymentTxns(req: Request, res: Response) {
    try {
      const csv = await financeService.exportSchoolPaymentTxnsCsv(
        req.params.schoolId,
        req.query as any
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="fee-transactions-${req.params.schoolId.slice(0, 8)}.csv"`
      );
      res.send(csv);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to export transactions" });
    }
  },

  async listMyPaymentTxns(req: Request, res: Response) {
    const user = (req as any).user;
    try {
      const rows = await financeService.listMyPaymentTxns(user.id, user.role, user.schoolId);
      res.json(rows);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to fetch payment history" });
    }
  },

  async batchApply(req: Request, res: Response) {
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized to batch-apply fees" });
    }
    try {
      const result = await financeService.batchApplyTemplate(
        req.params.schoolId,
        req.body,
        { role: user.role }
      );
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({
        error: err.message || "Failed to batch-apply fees",
        code: err.code,
      });
    }
  },

  async updateFee(req: Request, res: Response) {
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized to update invoices" });
    }
    try {
      const fee = await financeService.updateFee(req.params.id, req.params.schoolId, req.body);
      res.json(fee);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to update fee" });
    }
  },

  async voidFee(req: Request, res: Response) {
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized to void invoices" });
    }
    try {
      const fee = await financeService.voidFee(req.params.id, req.params.schoolId, {
        recordedBy: user.id,
        recordedByRole: user.role,
        notes: req.body?.notes,
      });
      res.json(fee);
    } catch (err: any) {
      res.status(err.status || 500).json({
        error: err.message || "Failed to void fee",
        code: err.code,
      });
    }
  },

  async writeOffFee(req: Request, res: Response) {
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized to write off balances" });
    }
    try {
      const result = await financeService.writeOffFee(req.params.id, req.params.schoolId, {
        notes: req.body?.notes,
        recordedBy: user.id,
        recordedByRole: user.role,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({
        error: err.message || "Failed to write off balance",
        code: err.code,
      });
    }
  },

  async getBillingSettings(req: Request, res: Response) {
    try {
      const settings = await financeService.getBillingSettings(req.params.schoolId);
      res.json(settings);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load billing settings" });
    }
  },

  async updateBillingSettings(req: Request, res: Response) {
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized to update billing settings" });
    }
    try {
      const settings = await financeService.updateBillingSettings(req.params.schoolId, req.body || {});
      res.json(settings);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to update billing settings" });
    }
  },

  async backfillLegacyPaidTxns(req: Request, res: Response) {
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const result = await financeService.backfillLegacyPaidTxns(req.params.schoolId);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Backfill failed" });
    }
  },

  async payFee(req: Request, res: Response) {
    const { id } = req.params;
    const { paidAt, amount, method, notes } = req.body || {};
    const user = (req as any).user;
    try {
      const fee = await financeService.payOwnFee(id, user.id, user.role, paidAt, {
        amount,
        method,
        notes,
      });
      res.json(fee);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to pay fee", code: err.code });
    }
  },

  async createCheckout(req: Request, res: Response) {
    try {
      const session = await financeService.createCheckoutForFee(req.params.id, {
        successUrl: req.body?.successUrl,
        cancelUrl: req.body?.cancelUrl,
        email: req.body?.email,
        amount: req.body?.amount,
      });
      res.json(session);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  async createPublicCheckout(req: Request, res: Response) {
    try {
      const session = await financeService.createPublicCheckoutForFee(req.params.id, {
        applicationId: req.body?.applicationId,
        token: req.body?.token,
        successUrl: req.body?.successUrl,
        cancelUrl: req.body?.cancelUrl,
        email: req.body?.email,
      });
      res.json(session);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  async completeMockCheckout(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const fee = await financeService.completeConsoleCheckout(
        String(req.body?.sessionId || req.query.session_id || ""),
        user ? { userId: user.id, role: user.role } : undefined
      );
      res.json(fee);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async stripeWebhook(req: Request, res: Response) {
    try {
      const { verifyStripeWebhook } = await import("../lib/stripeCheckout");
      const raw = (req as any).rawBody || JSON.stringify(req.body);
      const result = await verifyStripeWebhook(raw, req.headers["stripe-signature"] as string);
      if (!result) return res.status(200).json({ received: true, ignored: true });
      // Idempotency: the real Stripe session id is unique per checkout, so a replayed
      // webhook resolves to the already-recorded txn instead of double-booking.
      const checkoutSessionId =
        result.sessionId || `stripe_${result.feeId}_${result.amount ?? "full"}`;
      await financeService.recordPayment(result.feeId, {
        amount: result.amount,
        method: "CHECKOUT",
        checkoutSessionId,
        recordedByRole: "SYSTEM",
        confirmStale: true,
        role: "SCHOOL_ADMIN",
      });
      res.json({ received: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async sendReminder(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const result = await financeService.sendReminder(id);
      res.json(result);
    } catch (err: any) {
      if (err.message === "Fee record not found") {
        return res.status(404).json({ error: err.message });
      }
      res.status(err.status || 500).json({ error: err.message || "Failed to send reminder" });
    }
  },

  async listTemplates(req: Request, res: Response) {
    try {
      const templates = await financeService.listTemplates(req.params.schoolId);
      res.json(templates);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch fee templates" });
    }
  },

  async createTemplate(req: Request, res: Response) {
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized to manage fee templates" });
    }
    try {
      const template = await financeService.createTemplate(req.params.schoolId, req.body);
      res.status(201).json(template);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to create template" });
    }
  },

  async deleteTemplate(req: Request, res: Response) {
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized to manage fee templates" });
    }
    try {
      const result = await financeService.deleteTemplate(req.params.schoolId, req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to delete template" });
    }
  },

  async updateTemplate(req: Request, res: Response) {
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized to manage fee templates" });
    }
    try {
      const template = await financeService.updateTemplate(
        req.params.schoolId,
        req.params.id,
        req.body
      );
      res.json(template);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to update template" });
    }
  },

  async createFeeInternal(req: Request, res: Response) {
    try {
      const fee = await financeService.createFeeInternal(req.body);
      res.status(201).json(fee);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create fee" });
    }
  },

  async getFeeInternal(req: Request, res: Response) {
    try {
      const fee = await financeService.getFeeById(req.params.id);
      if (!fee) return res.status(404).json({ error: "Not found" });
      res.json(fee);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  // EXPENSES METHODS
  async getExpenses(req: Request, res: Response) {
    const { schoolId } = req.params;
    const { category, status, q, from, to } = req.query;
    try {
      const result = await financeService.getExpenses(schoolId, {
        category: category ? String(category) : undefined,
        status: status ? String(status) : undefined,
        q: q ? String(q) : undefined,
        from: from ? String(from) : undefined,
        to: to ? String(to) : undefined,
        page: req.query.page as string | undefined,
        pageSize: req.query.pageSize as string | undefined,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  },

  async createExpense(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized to manage operational expenses" });
    }

    try {
      const expense = await financeService.createExpense(schoolId, req.body);
      res.json(expense);
    } catch (err) {
      res.status(500).json({ error: "Failed to create operational expense record" });
    }
  },

  async updateExpense(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized to manage operational expenses" });
    }

    try {
      const expense = await financeService.updateExpense(id, req.body);
      res.json(expense);
    } catch (err) {
      res.status(500).json({ error: "Failed to update operational expense record" });
    }
  },

  async deleteExpense(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "ACCOUNTANT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized to delete expenses" });
    }

    try {
      await financeService.deleteExpense(id);
      res.json({ success: true, message: "Expense record deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete expense record" });
    }
  },

  // COMPREHENSIVE SUMMARIES
  async getFinanceSummary(req: Request, res: Response) {
    const { schoolId } = req.params;
    try {
      const summary = await financeService.getFinanceSummary(schoolId);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: "Failed to compile financial summary" });
    }
  },
};
