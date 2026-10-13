import type { Request, Response } from "express";
import { payrollService } from "../services/payrollService";

function isUniqueViolation(error: any): boolean {
  return (
    error?.code === "P2002" ||
    /unique constraint|already exists/i.test(String(error?.message || ""))
  );
}

/** Ported from src/server/controllers/payrollController.ts */
export const payrollController = {
  async getPayrolls(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const { month, year, q, status } = req.query;
      const result = await payrollService.getPayrolls(
        schoolId,
        month ? parseInt(month as string) : undefined,
        year ? parseInt(year as string) : undefined,
        {
          q: q ? String(q) : undefined,
          status: status ? String(status) : undefined,
          page: req.query.page as string | undefined,
          pageSize: req.query.pageSize as string | undefined,
        }
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getUserPayrolls(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const payrolls = await payrollService.getUserPayrolls(userId);
      res.json(payrolls);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async createPayroll(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const { userId, month, year, basicSalary, allowances, deductions, netSalary, status, notes } = req.body;
      const payroll = await payrollService.createPayroll({
        schoolId, userId, month, year, basicSalary, allowances, deductions, netSalary, status, notes,
      });
      res.status(201).json(payroll);
    } catch (error: any) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({
          error: "A payroll record already exists for this staff member and period",
        });
      }
      res.status(500).json({ error: error.message });
    }
  },

  async updatePayroll(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payroll = await payrollService.updatePayroll(id, req.body);
      res.json(payroll);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async deletePayroll(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await payrollService.deletePayroll(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // --- Internal (service-to-service) ---
  // Finance's getFinanceSummary used to read `prisma.payroll` directly for
  // its cash-flow totals; staff owns Payroll now, so it exposes this instead.
  async getPayrollsInternal(req: Request, res: Response) {
    try {
      const { schoolId } = req.query as { schoolId: string };
      const { items } = await payrollService.getPayrolls(schoolId, undefined, undefined, {
        page: 1,
        pageSize: 5000,
      });
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};
