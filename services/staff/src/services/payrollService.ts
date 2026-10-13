import prisma from "../lib/prisma";
import {
  getIdentitySchoolName,
  getIdentityUserName,
  issuePayslipReceipt,
  voidPayslipReceipt,
} from "../lib/financeClient";

/**
 * Ported from src/server/services/payrollService.ts.
 * Dropped `user.{id,name,role}` include — Identity owns User.
 */
export const payrollService = {
  async getPayrolls(
    schoolId: string,
    month?: number,
    year?: number,
    opts?: { q?: string; status?: string; page?: number | string; pageSize?: number | string }
  ) {
    const where: any = {
      schoolId,
      ...(month ? { month } : {}),
      ...(year ? { year } : {}),
    };
    if (opts?.status) where.status = String(opts.status).toUpperCase();
    const q = opts?.q?.trim();
    if (q) {
      where.OR = [{ notes: { contains: q, mode: "insensitive" } }];
    }
    const page = Math.max(1, Number(opts?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(opts?.pageSize) || 50));
    const [total, items] = await Promise.all([
      prisma.payroll.count({ where }),
      prisma.payroll.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, total, page, pageSize };
  },

  async getUserPayrolls(userId: string) {
    return prisma.payroll.findMany({
      where: { userId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  },

  async createPayroll(data: {
    schoolId: string;
    userId: string;
    month: number;
    year: number;
    basicSalary: number;
    allowances?: number;
    deductions?: number;
    netSalary: number;
    status?: string;
    notes?: string;
  }) {
    const status = data.status || "PENDING";
    const payroll = await prisma.payroll.create({
      data: {
        ...data,
        status,
        paidAt: status === "PAID" ? new Date() : null,
      },
    });
    if (payroll.status === "PAID") {
      await this.issuePayslipForPayroll(payroll);
    }
    return payroll;
  },

  async updatePayroll(id: string, data: any) {
    const before = await prisma.payroll.findUnique({ where: { id } });
    const patch: Record<string, unknown> = { ...data };
    if (data.status === "PAID") {
      patch.paidAt = new Date();
    } else if (data.status === "PENDING") {
      patch.paidAt = null;
    }
    const payroll = await prisma.payroll.update({ where: { id }, data: patch });
    if (payroll.status === "PAID" && before?.status !== "PAID") {
      await this.issuePayslipForPayroll(payroll);
    } else if (
      before?.status === "PAID" &&
      payroll.status !== "PAID" &&
      before.schoolId
    ) {
      await voidPayslipReceipt({
        schoolId: before.schoolId,
        payrollId: payroll.id,
        reason: "Payroll marked unpaid (correction)",
      });
    }
    return payroll;
  },

  async deletePayroll(id: string) {
    return prisma.payroll.delete({ where: { id } });
  },

  async issuePayslipForPayroll(payroll: {
    id: string;
    schoolId: string;
    userId: string;
    month: number;
    year: number;
    basicSalary: number;
    allowances: number;
    deductions: number;
    netSalary: number;
    notes?: string | null;
  }) {
    const [staffName, schoolName] = await Promise.all([
      getIdentityUserName(payroll.userId),
      getIdentitySchoolName(payroll.schoolId),
    ]);
    let currency = "USD";
    try {
      const notes = payroll.notes ? JSON.parse(payroll.notes) : null;
      if (notes?.currency) currency = String(notes.currency);
    } catch {
      /* ignore */
    }
    await issuePayslipReceipt({
      schoolId: payroll.schoolId,
      payrollId: payroll.id,
      staffName,
      schoolName,
      month: payroll.month,
      year: payroll.year,
      basicSalary: payroll.basicSalary,
      allowances: payroll.allowances || 0,
      deductions: payroll.deductions || 0,
      netSalary: payroll.netSalary,
      currency,
      issuedBy: "system",
    });
  },
};
