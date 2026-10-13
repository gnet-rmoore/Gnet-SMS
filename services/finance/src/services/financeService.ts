import prisma from "../lib/prisma";
import {
  getIdentityUser,
  getIdentityUsersByIds,
  getParentChildrenIds,
  getStudentParentIds,
  listIdentityStudents,
} from "../lib/identityClient";
import {
  getDivision,
  getGradeLevel,
  gradeLevelIdsForDivision,
  listGradeLevels,
} from "../lib/academicClient";
import { getPayrolls } from "../lib/staffClient";
import {
  assertFeeScopeEligible,
  normalizeCohort,
  normalizeScopeMode,
  parseScopeSnapshot,
  scopeSnapshotJson,
  staleScopeMismatchMessage,
  type FeeTemplateScope,
  type StudentFeeProfile,
} from "../lib/feeScope";
import {
  assertMinPaymentAmount,
  DEFAULT_MIN_PAYMENT,
  effectiveAmountPaid,
  invoiceBalance,
  normalizePaymentMethod,
  roundMoney,
  serializeFeeInvoice,
  statusFromBalances,
} from "../lib/feePaymentMath";

async function enrichFeeRows(rows: { studentId: string }[]) {
  const users = await getIdentityUsersByIds(rows.map((r) => r.studentId));
  return rows.map((row) => {
    const student = users.get(row.studentId);
    const serialized = serializeFeeInvoice(row as any);
    return {
      ...serialized,
      student: student
        ? {
            id: student.id,
            name: student.name,
            email: student.email,
            gradeLevelId: student.gradeLevelId || null,
            feeCohort: student.feeCohort || null,
          }
        : { id: row.studentId, name: "Unknown student", email: "" },
    };
  });
}

function serializeTxn(txn: any, names?: Map<string, { name?: string }>) {
  const recorded = txn.recordedBy ? names?.get(txn.recordedBy) : null;
  const payer = txn.payerUserId ? names?.get(txn.payerUserId) : null;
  return {
    id: txn.id,
    kind: txn.kind,
    schoolId: txn.schoolId,
    feePaymentId: txn.feePaymentId,
    studentId: txn.studentId,
    studentName: txn.studentNameSnapshot || names?.get(txn.studentId)?.name || "Student",
    feeType: txn.feeTypeSnapshot || "Fee",
    amount: txn.amount,
    balanceBefore: txn.balanceBefore,
    balanceAfter: txn.balanceAfter,
    billedAmount: txn.billedAmount,
    invoiceStatusBefore: txn.invoiceStatusBefore,
    invoiceStatusAfter: txn.invoiceStatusAfter,
    method: txn.method,
    paidAt: txn.paidAt,
    createdAt: txn.createdAt,
    recordedBy: txn.recordedBy,
    recordedByName:
      txn.recordedByRole === "SYSTEM"
        ? "System"
        : recorded?.name ||
          (txn.recordedByRole === "PARENT"
            ? "Parent (portal)"
            : txn.recordedByRole === "STUDENT"
              ? "Student (portal)"
              : txn.recordedBy
                ? "Staff"
                : "System"),
    recordedByRole: txn.recordedByRole,
    payerUserId: txn.payerUserId,
    payerName: txn.payerNameSnapshot || payer?.name || null,
    notes: txn.notes,
    receiptId: txn.receiptId,
    checkoutSessionId: txn.checkoutSessionId,
  };
}

async function resolveStudentName(studentId: string): Promise<string | null> {
  if (!studentId || String(studentId).startsWith("application:")) return null;
  const student = await getIdentityUser(studentId);
  return student?.name || null;
}

async function getMinPaymentAmount(schoolId: string): Promise<number> {
  const row = await prisma.schoolBillingSettings.findUnique({ where: { schoolId } });
  if (!row) return DEFAULT_MIN_PAYMENT;
  return roundMoney(Number(row.minPaymentAmount) || DEFAULT_MIN_PAYMENT);
}

async function buildStudentFeeProfile(
  schoolId: string,
  studentId: string
): Promise<StudentFeeProfile> {
  const user = await getIdentityUser(studentId);
  if (!user) {
    throw Object.assign(new Error("Student not found"), { status: 404 });
  }
  if (user.schoolId && user.schoolId !== schoolId) {
    throw Object.assign(new Error("Student does not belong to this school"), {
      status: 403,
    });
  }

  let divisionId: string | null = null;
  let gradeLevelName: string | null = null;
  let divisionName: string | null = null;

  if (user.gradeLevelId) {
    const grade = await getGradeLevel(schoolId, user.gradeLevelId);
    if (grade) {
      gradeLevelName = grade.name;
      divisionId = grade.divisionId || null;
      if (divisionId) {
        const div = await getDivision(schoolId, divisionId);
        divisionName = div?.name || null;
      }
    }
  }

  return {
    id: user.id,
    name: user.name,
    schoolId: user.schoolId || schoolId,
    gradeLevelId: user.gradeLevelId || null,
    feeCohort: user.feeCohort || null,
    divisionId,
    gradeLevelName,
    divisionName,
  };
}

function templateToScope(template: {
  scopeMode?: string | null;
  gradeLevelId?: string | null;
  divisionId?: string | null;
  cohort?: string | null;
  schoolYearKey?: string | null;
  name?: string;
}): FeeTemplateScope {
  return {
    scopeMode: normalizeScopeMode(template.scopeMode),
    gradeLevelId: template.gradeLevelId || null,
    divisionId: template.divisionId || null,
    cohort: normalizeCohort(template.cohort),
    schoolYearKey: template.schoolYearKey || null,
    name: template.name,
  };
}

/**
 * Ported from src/server/services/financeService.ts.
 * Enriches fee student names via Identity; payroll totals via staffClient.
 */
export const financeService = {
  async getFees(
    schoolId: string,
    studentId?: string,
    studentIds?: string[],
    query: {
      q?: string;
      status?: string;
      type?: string;
      page?: number | string;
      pageSize?: number | string;
      sort?: string;
      order?: string;
      schoolYearKey?: string;
    } = {}
  ) {
    const where: any = { schoolId };
    if (studentIds?.length) where.studentId = { in: studentIds };
    else if (studentId) where.studentId = studentId;

    if (query.schoolYearKey?.trim()) where.schoolYearKey = query.schoolYearKey.trim();

    const status = query.status ? String(query.status).toUpperCase() : "";
    const type = query.type ? String(query.type) : "";
    const q = query.q?.trim() || "";
    const and: any[] = [];

    if (type && type !== "ALL") where.type = type;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (status && status !== "ALL") {
      if (status === "OVERDUE") {
        where.status = { in: ["PENDING", "PARTIAL"] };
        where.dueDate = { lt: now };
      } else if (status === "PENDING" || status === "PARTIAL") {
        where.status = status;
        and.push({ dueDate: { gte: now } });
      } else {
        where.status = status;
      }
    }

    if (q) {
      and.push({
        OR: [
          { type: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
          { id: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const sortKey = String(query.sort || "dueDate");
    const order = query.order === "desc" ? "desc" : "asc";
    const orderBy =
      sortKey === "amount"
        ? { amount: order as "asc" | "desc" }
        : sortKey === "createdAt"
          ? { createdAt: order as "asc" | "desc" }
          : { dueDate: order as "asc" | "desc" };

    const wantsPage =
      query.page !== undefined &&
      query.page !== null &&
      String(query.page) !== "";

    if (!wantsPage) {
      const rows = await prisma.feePayment.findMany({
        where,
        orderBy,
      });
      return enrichFeeRows(rows);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50));
    const [total, rows] = await Promise.all([
      prisma.feePayment.count({ where }),
      prisma.feePayment.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: await enrichFeeRows(rows),
      total,
      page,
      pageSize,
    };
  },

  async getMyFees(userId: string, role: string, schoolId?: string) {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;

    if (role === "PARENT") {
      const childIds = await getParentChildrenIds(userId);
      if (childIds.length === 0) return [];
      where.studentId = { in: childIds };
    } else {
      where.studentId = userId;
    }

    const rows = await prisma.feePayment.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return enrichFeeRows(rows);
  },

  async createFee(
    schoolId: string,
    data: any,
    opts?: { role?: string; skipEligibility?: boolean }
  ) {
    const role = opts?.role || "SCHOOL_ADMIN";
    let template: Awaited<ReturnType<typeof prisma.feeTemplate.findFirst>> = null;
    let scope: FeeTemplateScope = {
      scopeMode: "SCHOOL",
      cohort: "ALL",
      schoolYearKey: data.schoolYearKey || null,
    };

    if (data.templateId) {
      template = await prisma.feeTemplate.findFirst({
        where: { id: data.templateId, schoolId },
      });
      if (!template) {
        throw Object.assign(new Error("Fee template not found"), { status: 404 });
      }
      scope = templateToScope({
        ...template,
        schoolYearKey: data.schoolYearKey || template.schoolYearKey,
      });
    } else if (role === "ACCOUNTANT" && !opts?.skipEligibility) {
      throw Object.assign(
        new Error("Accountants must create invoices from a fee template"),
        { status: 400, code: "TEMPLATE_REQUIRED" }
      );
    } else if (data.scopeMode || data.gradeLevelId || data.divisionId) {
      scope = {
        scopeMode: normalizeScopeMode(data.scopeMode),
        gradeLevelId: data.gradeLevelId || null,
        divisionId: data.divisionId || null,
        cohort: normalizeCohort(data.cohort),
        schoolYearKey: data.schoolYearKey || null,
        name: data.type,
      };
    }

    const studentId = String(data.studentId);
    if (!opts?.skipEligibility && !String(studentId).startsWith("application:")) {
      const profile = await buildStudentFeeProfile(schoolId, studentId);
      assertFeeScopeEligible(scope, profile);
    }

    const schoolYearKey =
      (data.schoolYearKey || template?.schoolYearKey || scope.schoolYearKey || null) as
        | string
        | null;

    if (template && schoolYearKey) {
      const existing = await prisma.feePayment.findFirst({
        where: {
          schoolId,
          studentId,
          templateId: template.id,
          schoolYearKey,
          status: { in: ["PENDING", "PARTIAL", "PAID"] },
        },
      });
      if (existing) {
        throw Object.assign(
          new Error(
            "Student already has an invoice for this template and school year"
          ),
          { status: 409, code: "FEE_ALREADY_BILLED" }
        );
      }
    }

    const amount = data.amount !== undefined ? Number(data.amount) : Number(template?.amount);
    const type = data.type || template?.type;
    if (!type || !Number.isFinite(amount) || amount <= 0) {
      throw Object.assign(new Error("Valid amount and type are required"), {
        status: 400,
      });
    }

    const created = await prisma.feePayment.create({
      data: {
        schoolId,
        studentId,
        applicationId: data.applicationId || null,
        amount,
        originalAmount:
          data.originalAmount !== undefined && data.originalAmount !== null
            ? Number(data.originalAmount)
            : null,
        discountPercent:
          data.discountPercent !== undefined && data.discountPercent !== null
            ? Number(data.discountPercent)
            : null,
        amountPaid: 0,
        type: String(type),
        status: data.status || "PENDING",
        dueDate: new Date(data.dueDate),
        notes: data.notes || null,
        templateId: template?.id || data.templateId || null,
        templateNameSnapshot: template?.name || null,
        scopeSnapshot: scopeSnapshotJson(scope),
        schoolYearKey,
      },
    });

    const studentName = await resolveStudentName(studentId);
    try {
      await prisma.feePaymentTxn.create({
        data: {
          schoolId,
          feePaymentId: created.id,
          studentId,
          kind: "INVOICE_CREATED",
          amount: 0,
          balanceBefore: 0,
          balanceAfter: roundMoney(amount),
          billedAmount: amount,
          invoiceStatusBefore: null,
          invoiceStatusAfter: created.status,
          method: "OTHER",
          paidAt: created.createdAt,
          recordedBy: null,
          recordedByRole: "SYSTEM",
          studentNameSnapshot: studentName,
          feeTypeSnapshot: created.type,
          notes: "Invoice created",
        },
      });
    } catch (err: any) {
      console.warn("[finance] INVOICE_CREATED txn failed:", err?.message || err);
    }

    return serializeFeeInvoice(created);
  },

  async createFeeInternal(data: any) {
    return this.createFee(data.schoolId, data, {
      role: "SCHOOL_ADMIN",
      skipEligibility: true,
    });
  },

  async getFeeById(id: string) {
    return prisma.feePayment.findUnique({ where: { id } });
  },

  async updateFee(id: string, schoolId: string, data: any) {
    const existing = await prisma.feePayment.findFirst({ where: { id, schoolId } });
    if (!existing) throw Object.assign(new Error("Fee not found"), { status: 404 });
    if (!["PENDING", "PARTIAL"].includes(existing.status)) {
      throw Object.assign(new Error("Only open invoices can be edited"), { status: 409 });
    }
    const paid = effectiveAmountPaid(existing);
    if (paid > 0 && data.amount !== undefined) {
      throw Object.assign(
        new Error("Cannot change billed amount after payments have been recorded"),
        { status: 409, code: "FEE_HAS_PAYMENTS" }
      );
    }
    const updated = await prisma.feePayment.update({
      where: { id },
      data: {
        amount: data.amount !== undefined ? Number(data.amount) : undefined,
        type: data.type,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        notes: data.notes === undefined ? undefined : data.notes,
      },
    });
    return serializeFeeInvoice(updated);
  },

  async voidFee(
    id: string,
    schoolId: string,
    opts?: { recordedBy?: string | null; recordedByRole?: string | null; notes?: string }
  ) {
    const existing = await prisma.feePayment.findFirst({ where: { id, schoolId } });
    if (!existing) throw Object.assign(new Error("Fee not found"), { status: 404 });
    if (existing.status === "PAID" || existing.status === "WRITTEN_OFF") {
      throw Object.assign(new Error("Settled invoices cannot be voided"), { status: 409 });
    }
    if (existing.status === "VOIDED") {
      throw Object.assign(new Error("Invoice already voided"), { status: 409 });
    }
    if (effectiveAmountPaid(existing) > 0) {
      throw Object.assign(
        new Error(
          "Cannot void an invoice with recorded payments. Write off the remaining balance instead, or keep the invoice open."
        ),
        { status: 409, code: "FEE_HAS_PAYMENTS" }
      );
    }
    const balanceBefore = invoiceBalance(existing.amount, effectiveAmountPaid(existing), existing.status);
    const studentName = await resolveStudentName(existing.studentId);
    const updated = await prisma.$transaction(async (tx) => {
      const fee = await tx.feePayment.update({
        where: { id },
        data: { status: "VOIDED" },
      });
      await tx.feePaymentTxn.create({
        data: {
          schoolId,
          feePaymentId: id,
          studentId: existing.studentId,
          kind: "VOID",
          amount: 0,
          balanceBefore,
          balanceAfter: 0,
          billedAmount: existing.amount,
          invoiceStatusBefore: existing.status,
          invoiceStatusAfter: "VOIDED",
          method: "OTHER",
          paidAt: new Date(),
          recordedBy: opts?.recordedBy || null,
          recordedByRole: opts?.recordedByRole || "SYSTEM",
          studentNameSnapshot: studentName,
          feeTypeSnapshot: existing.type,
          notes: opts?.notes || "Invoice voided",
        },
      });
      return fee;
    });
    return serializeFeeInvoice(updated);
  },

  /** Forgive remaining balance; cash already paid stays on amountPaid. */
  async writeOffFee(
    id: string,
    schoolId: string,
    opts: {
      notes?: string;
      recordedBy?: string | null;
      recordedByRole?: string | null;
    } = {}
  ) {
    const existing = await prisma.feePayment.findFirst({ where: { id, schoolId } });
    if (!existing) throw Object.assign(new Error("Fee not found"), { status: 404 });
    if (existing.status === "VOIDED") {
      throw Object.assign(new Error("Cannot write off a voided invoice"), { status: 409 });
    }
    if (existing.status === "PAID" || existing.status === "WRITTEN_OFF") {
      throw Object.assign(new Error("Invoice is already settled"), { status: 409 });
    }
    const amountPaidBefore = effectiveAmountPaid(existing);
    const balanceBefore = invoiceBalance(existing.amount, amountPaidBefore, existing.status);
    if (balanceBefore <= 0) {
      throw Object.assign(new Error("Nothing left to write off"), { status: 409 });
    }
    const studentName = await resolveStudentName(existing.studentId);
    const result = await prisma.$transaction(async (tx) => {
      const txn = await tx.feePaymentTxn.create({
        data: {
          schoolId,
          feePaymentId: id,
          studentId: existing.studentId,
          kind: "WRITE_OFF",
          amount: balanceBefore,
          balanceBefore,
          balanceAfter: 0,
          billedAmount: existing.amount,
          invoiceStatusBefore: existing.status,
          invoiceStatusAfter: "WRITTEN_OFF",
          method: "OTHER",
          paidAt: new Date(),
          recordedBy: opts.recordedBy || null,
          recordedByRole: opts.recordedByRole || null,
          studentNameSnapshot: studentName,
          feeTypeSnapshot: existing.type,
          notes: opts.notes || "Remaining balance written off",
        },
      });
      const fee = await tx.feePayment.update({
        where: { id },
        data: {
          status: "WRITTEN_OFF",
          paidAt: new Date(),
          amountPaid: amountPaidBefore,
        },
      });
      return { fee, txn };
    });
    return {
      fee: serializeFeeInvoice(result.fee),
      txn: serializeTxn(result.txn),
    };
  },

  /**
   * Record a partial or full payment against an invoice (append-only txn).
   * Collect full remaining balance when amount is omitted.
   */
  async recordPayment(
    id: string,
    input: {
      amount?: number | string;
      method?: string;
      paidAt?: string;
      notes?: string;
      payerUserId?: string;
      checkoutSessionId?: string;
      recordedBy?: string | null;
      recordedByRole?: string | null;
      confirmStale?: boolean;
      role?: string;
    } = {}
  ) {
    if (input.checkoutSessionId) {
      const existingTxn = await prisma.feePaymentTxn.findUnique({
        where: { checkoutSessionId: input.checkoutSessionId },
      });
      if (existingTxn) {
        const fee = await prisma.feePayment.findUnique({ where: { id: existingTxn.feePaymentId } });
        return {
          fee: fee ? serializeFeeInvoice(fee) : null,
          txn: serializeTxn(existingTxn),
          idempotent: true,
        };
      }
    }

    const existing = await prisma.feePayment.findUnique({ where: { id } });
    if (!existing) throw Object.assign(new Error("Fee not found"), { status: 404 });
    if (existing.status === "VOIDED") {
      throw Object.assign(new Error("Cannot collect a voided invoice"), {
        status: 409,
        code: "FEE_VOIDED",
      });
    }
    if (existing.status === "PAID") {
      throw Object.assign(new Error("Fee already paid"), {
        status: 409,
        code: "FEE_ALREADY_PAID",
      });
    }

    const snapshot = parseScopeSnapshot(existing.scopeSnapshot);
    if (
      snapshot &&
      normalizeScopeMode(snapshot.scopeMode) !== "SCHOOL" &&
      !String(existing.studentId).startsWith("application:")
    ) {
      try {
        const profile = await buildStudentFeeProfile(existing.schoolId, existing.studentId);
        const staleMsg = staleScopeMismatchMessage(snapshot, profile);
        if (staleMsg) {
          const role = input.role || "ACCOUNTANT";
          if (role === "SCHOOL_ADMIN" && input.confirmStale) {
            /* allow override */
          } else if (role === "SCHOOL_ADMIN") {
            throw Object.assign(
              new Error(
                `${staleMsg} Confirm to collect anyway (student no longer matches invoice scope).`
              ),
              { status: 409, code: "FEE_SCOPE_STALE", confirmRequired: true }
            );
          } else {
            throw Object.assign(
              new Error(
                `${staleMsg} Collection blocked — student no longer matches this invoice’s scope. Ask a school admin to override.`
              ),
              { status: 409, code: "FEE_SCOPE_STALE" }
            );
          }
        }
      } catch (err: any) {
        if (err?.code === "FEE_SCOPE_STALE") throw err;
        if (err?.status && err.status !== 404 && err.status !== 403) throw err;
      }
    }

    const amountPaidBefore = effectiveAmountPaid(existing);
    const balanceBefore = invoiceBalance(existing.amount, amountPaidBefore);
    if (balanceBefore <= 0) {
      throw Object.assign(new Error("Fee already paid"), {
        status: 409,
        code: "FEE_ALREADY_PAID",
      });
    }

    const rawAmount =
      input.amount === undefined || input.amount === null || input.amount === ""
        ? balanceBefore
        : Number(input.amount);
    const payAmount = roundMoney(rawAmount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      throw Object.assign(new Error("Payment amount must be greater than zero"), {
        status: 400,
        code: "FEE_PAYMENT_INVALID_AMOUNT",
      });
    }
    if (payAmount > balanceBefore + 0.001) {
      throw Object.assign(
        new Error(
          `Payment $${payAmount.toFixed(2)} exceeds remaining balance $${balanceBefore.toFixed(2)}`
        ),
        { status: 409, code: "FEE_PAYMENT_EXCEEDS_BALANCE" }
      );
    }

    const minPayment = await getMinPaymentAmount(existing.schoolId);
    assertMinPaymentAmount(payAmount, balanceBefore, minPayment);

    const amountPaidAfter = roundMoney(amountPaidBefore + payAmount);
    const balanceAfter = invoiceBalance(existing.amount, amountPaidAfter);
    const statusBefore = statusFromBalances(existing.amount, amountPaidBefore, existing.status);
    const statusAfter = statusFromBalances(existing.amount, amountPaidAfter);
    const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
    const method = normalizePaymentMethod(input.method || (input.checkoutSessionId ? "CHECKOUT" : "CASH"));

    let studentName: string | null = null;
    let payerName: string | null = null;
    if (!String(existing.studentId).startsWith("application:")) {
      const student = await getIdentityUser(existing.studentId);
      studentName = student?.name || null;
    }
    if (input.payerUserId) {
      const payer = await getIdentityUser(input.payerUserId);
      payerName = payer?.name || null;
    } else if (input.recordedByRole === "PARENT" || input.recordedByRole === "STUDENT") {
      const self = input.recordedBy ? await getIdentityUser(input.recordedBy) : null;
      payerName = self?.name || null;
    }

    const result = await prisma.$transaction(async (tx) => {
      const txn = await tx.feePaymentTxn.create({
        data: {
          schoolId: existing.schoolId,
          feePaymentId: existing.id,
          studentId: existing.studentId,
          kind: "PAYMENT",
          amount: payAmount,
          balanceBefore,
          balanceAfter,
          billedAmount: existing.amount,
          invoiceStatusBefore: statusBefore,
          invoiceStatusAfter: statusAfter,
          method,
          paidAt,
          recordedBy: input.recordedBy || null,
          recordedByRole: input.recordedByRole || null,
          payerUserId: input.payerUserId || input.recordedBy || null,
          payerNameSnapshot: payerName,
          studentNameSnapshot: studentName,
          feeTypeSnapshot: existing.type,
          notes: input.notes || null,
          checkoutSessionId: input.checkoutSessionId || null,
        },
      });

      const fee = await tx.feePayment.update({
        where: { id: existing.id },
        data: {
          amountPaid: amountPaidAfter,
          status: statusAfter,
          paidAt: statusAfter === "PAID" ? paidAt : existing.paidAt,
        },
      });

      return { fee, txn };
    });

    let receiptId: string | null = null;
    try {
      const { receiptService } = await import("./receiptService");
      const receipt = await receiptService.issueForFeePaymentTxn(result.txn.id, input.recordedBy || "system");
      receiptId = receipt?.id || null;
      if (receiptId) {
        await prisma.feePaymentTxn.update({
          where: { id: result.txn.id },
          data: { receiptId },
        });
        result.txn.receiptId = receiptId;
      }
    } catch (err: any) {
      console.warn("[finance] receipt issue after payment:", err?.message || err);
    }

    if (result.fee.status === "PAID") {
      const { notifyFeePaid } = await import("../lib/lifecycleClient");
      await notifyFeePaid({ feeId: result.fee.id, applicationId: result.fee.applicationId });
    }

    if (result.fee.studentId && !String(result.fee.studentId).startsWith("application:")) {
      const { notifyInApp, notifyInAppMany } = await import("../lib/notifyInApp");
      const remaining = invoiceBalance(result.fee.amount, result.fee.amountPaid);
      const settled = result.fee.status === "PAID";
      const title = settled ? "Fee fully paid" : "Fee payment recorded";
      const body = settled
        ? `Payment of $${payAmount.toFixed(2)} settled ${result.fee.type || "fees"} in full.`
        : `Payment of $${payAmount.toFixed(2)} recorded for ${result.fee.type || "fees"}. Balance owing: $${remaining.toFixed(2)}.`;
      await notifyInApp({
        schoolId: result.fee.schoolId,
        userId: result.fee.studentId,
        eventKey: settled ? "FEE_PAID" : "FEE_PAYMENT",
        title,
        body,
        href: "/fees",
        meta: { feeId: result.fee.id, txnId: result.txn.id, amount: payAmount, balance: remaining },
      });
      const parentIds = await getStudentParentIds(result.fee.studentId);
      if (parentIds.length) {
        await notifyInAppMany(
          parentIds.map((parentId) => ({
            schoolId: result.fee.schoolId,
            userId: parentId,
            eventKey: settled ? "FEE_PAID" : "FEE_PAYMENT",
            title,
            body: settled
              ? `A payment of $${payAmount.toFixed(2)} settled ${result.fee.type || "fees"} for your child.`
              : `A payment of $${payAmount.toFixed(2)} was recorded for your child. Balance owing: $${remaining.toFixed(2)}.`,
            href: "/fees",
            meta: {
              feeId: result.fee.id,
              studentId: result.fee.studentId,
              txnId: result.txn.id,
              amount: payAmount,
              balance: remaining,
            },
          }))
        );
      }
    }

    return {
      fee: serializeFeeInvoice(result.fee),
      txn: serializeTxn({ ...result.txn, receiptId }),
    };
  },

  /** Backward-compatible full-balance collect. */
  async collectPayment(
    id: string,
    paidAt?: string,
    opts?: {
      role?: string;
      confirmStale?: boolean;
      amount?: number | string;
      method?: string;
      notes?: string;
      payerUserId?: string;
      recordedBy?: string | null;
      recordedByRole?: string | null;
      checkoutSessionId?: string;
    }
  ) {
    const result = await this.recordPayment(id, {
      amount: opts?.amount,
      method: opts?.method,
      paidAt,
      notes: opts?.notes,
      payerUserId: opts?.payerUserId,
      checkoutSessionId: opts?.checkoutSessionId,
      recordedBy: opts?.recordedBy,
      recordedByRole: opts?.recordedByRole || opts?.role || null,
      confirmStale: opts?.confirmStale,
      role: opts?.role,
    });
    return result.fee;
  },

  async listPaymentsForFee(feeId: string, schoolId?: string) {
    const fee = await prisma.feePayment.findUnique({ where: { id: feeId } });
    if (!fee) throw Object.assign(new Error("Fee not found"), { status: 404 });
    if (schoolId && fee.schoolId !== schoolId) {
      throw Object.assign(new Error("Fee not found"), { status: 404 });
    }
    const txns = await prisma.feePaymentTxn.findMany({
      where: { feePaymentId: feeId },
      orderBy: { paidAt: "desc" },
    });
    const ids = [
      ...txns.map((t) => t.recordedBy).filter(Boolean),
      ...txns.map((t) => t.payerUserId).filter(Boolean),
      ...txns.map((t) => t.studentId),
    ] as string[];
    const names = await getIdentityUsersByIds(ids);
    return txns.map((t) => serializeTxn(t, names));
  },

  async listSchoolPaymentTxns(
    schoolId: string,
    query: {
      from?: string;
      to?: string;
      studentId?: string;
      feeType?: string;
      method?: string;
      recordedBy?: string;
      statusAfter?: string;
      kind?: string;
      q?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50));
    const where: any = { schoolId };
    if (query.kind) where.kind = String(query.kind).toUpperCase();
    if (query.studentId) where.studentId = query.studentId;
    if (query.method) where.method = String(query.method).toUpperCase();
    if (query.recordedBy) where.recordedBy = query.recordedBy;
    if (query.statusAfter) where.invoiceStatusAfter = String(query.statusAfter).toUpperCase();
    if (query.feeType) where.feeTypeSnapshot = query.feeType;
    if (query.from || query.to) {
      where.paidAt = {};
      if (query.from) where.paidAt.gte = new Date(query.from);
      if (query.to) {
        const to = new Date(query.to);
        if (!String(query.to).includes("T")) to.setHours(23, 59, 59, 999);
        where.paidAt.lte = to;
      }
    }
    if (query.q?.trim()) {
      where.OR = [
        { studentNameSnapshot: { contains: query.q.trim(), mode: "insensitive" } },
        { payerNameSnapshot: { contains: query.q.trim(), mode: "insensitive" } },
        { feeTypeSnapshot: { contains: query.q.trim(), mode: "insensitive" } },
        { notes: { contains: query.q.trim(), mode: "insensitive" } },
      ];
    }

    const [total, txns] = await Promise.all([
      prisma.feePaymentTxn.count({ where }),
      prisma.feePaymentTxn.findMany({
        where,
        orderBy: { paidAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const ids = [
      ...txns.map((t) => t.recordedBy).filter(Boolean),
      ...txns.map((t) => t.payerUserId).filter(Boolean),
      ...txns.map((t) => t.studentId),
    ] as string[];
    const names = await getIdentityUsersByIds(ids);
    return {
      items: txns.map((t) => serializeTxn(t, names)),
      total,
      page,
      pageSize,
    };
  },

  async exportSchoolPaymentTxnsCsv(schoolId: string, query: Record<string, any> = {}) {
    const { items } = await this.listSchoolPaymentTxns(schoolId, {
      ...query,
      page: 1,
      pageSize: 5000,
    });
    const header = [
      "paidAt",
      "createdAt",
          "txnId",
          "kind",
          "studentName",
          "studentId",
          "feeType",
          "feePaymentId",
          "amount",
          "balanceBefore",
          "balanceAfter",
          "method",
          "recordedByName",
          "recordedByRole",
          "payerName",
          "invoiceStatusAfter",
          "receiptId",
          "notes",
        ];
        const escape = (v: unknown) => {
          const s = v == null ? "" : String(v);
          if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        };
        const lines = [header.join(",")];
        for (const row of items) {
          lines.push(
            [
              row.paidAt,
              row.createdAt,
              row.id,
              row.kind,
              row.studentName,
          row.studentId,
          row.feeType,
          row.feePaymentId,
          row.amount,
          row.balanceBefore,
          row.balanceAfter,
          row.method,
          row.recordedByName,
          row.recordedByRole,
          row.payerName,
          row.invoiceStatusAfter,
          row.receiptId,
          row.notes,
        ]
          .map(escape)
          .join(",")
      );
    }
    return lines.join("\n");
  },

  async listMyPaymentTxns(userId: string, role: string, schoolId?: string) {
    const where: any = { kind: "PAYMENT" };
    if (schoolId) where.schoolId = schoolId;
    if (role === "PARENT") {
      const childIds = await getParentChildrenIds(userId);
      if (!childIds.length) return [];
      where.studentId = { in: childIds };
    } else {
      where.studentId = userId;
    }
    const txns = await prisma.feePaymentTxn.findMany({
      where,
      orderBy: { paidAt: "desc" },
      take: 200,
    });
    const ids = [
      ...txns.map((t) => t.recordedBy).filter(Boolean),
      ...txns.map((t) => t.payerUserId).filter(Boolean),
      ...txns.map((t) => t.studentId),
    ] as string[];
    const names = await getIdentityUsersByIds(ids);
    return txns.map((t) => serializeTxn(t, names));
  },

  async payOwnFee(
    id: string,
    userId: string,
    role: string,
    paidAt?: string,
    opts?: { amount?: number | string; method?: string; notes?: string }
  ) {
    const fee = await prisma.feePayment.findUnique({ where: { id } });
    if (!fee) {
      throw Object.assign(new Error("Fee not found"), { status: 404 });
    }
    const isAdmin = ["SCHOOL_ADMIN", "ACCOUNTANT"].includes(role);
    const isOwner = fee.studentId === userId;
    let isLinkedParent = false;
    if (role === "PARENT") {
      const childIds = await getParentChildrenIds(userId);
      isLinkedParent = childIds.includes(fee.studentId);
    }
    if (!isAdmin && !isOwner && !isLinkedParent) {
      throw Object.assign(new Error("Unauthorized to pay this fee"), { status: 403 });
    }
    if (fee.status === "VOIDED") {
      throw Object.assign(new Error("This invoice was voided"), { status: 409, code: "FEE_VOIDED" });
    }
    if (fee.status === "PAID") {
      throw Object.assign(new Error("Fee already paid"), { status: 409, code: "FEE_ALREADY_PAID" });
    }
    const result = await this.recordPayment(id, {
      amount: opts?.amount,
      method: opts?.method || (isAdmin ? "CASH" : "OTHER"),
      paidAt,
      notes: opts?.notes,
      recordedBy: userId,
      recordedByRole: role,
      payerUserId: userId,
      confirmStale: isAdmin ? false : true,
      role: isAdmin ? role : "SCHOOL_ADMIN",
    });
    return result.fee;
  },

  async createCheckoutForFee(
    feeId: string,
    opts: { successUrl?: string; cancelUrl?: string; email?: string; amount?: number | string }
  ) {
    const fee = await prisma.feePayment.findUnique({ where: { id: feeId } });
    if (!fee) throw Object.assign(new Error("Fee not found"), { status: 404 });
    if (fee.status === "VOIDED") throw Object.assign(new Error("This invoice was voided"), { status: 409 });
    if (fee.status === "PAID") throw Object.assign(new Error("Fee already paid"), { status: 409 });
    const balance = invoiceBalance(fee.amount, effectiveAmountPaid(fee));
    if (balance <= 0) throw Object.assign(new Error("Fee already paid"), { status: 409 });
    const raw =
      opts.amount === undefined || opts.amount === null || opts.amount === ""
        ? balance
        : Number(opts.amount);
    const payAmount = roundMoney(raw);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      throw Object.assign(new Error("Payment amount must be greater than zero"), {
        status: 400,
        code: "FEE_PAYMENT_INVALID_AMOUNT",
      });
    }
    if (payAmount > balance + 0.001) {
      throw Object.assign(
        new Error(
          `Payment $${payAmount.toFixed(2)} exceeds remaining balance $${balance.toFixed(2)}`
        ),
        { status: 409, code: "FEE_PAYMENT_EXCEEDS_BALANCE" }
      );
    }
    const minPayment = await getMinPaymentAmount(fee.schoolId);
    assertMinPaymentAmount(payAmount, balance, minPayment);
    const { createEntranceCheckout } = await import("../lib/stripeCheckout");
    const appBase = process.env.APP_URL?.split(",")[0]?.trim() || "http://localhost:8080";
    return createEntranceCheckout({
      feeId: fee.id,
      amount: payAmount,
      applicationId: fee.applicationId || undefined,
      customerEmail: opts.email,
      successUrl: opts.successUrl || `${appBase}/checkout/success?fee_id=${fee.id}`,
      cancelUrl: opts.cancelUrl || `${appBase}/checkout/cancel?fee_id=${fee.id}`,
    });
  },

  async completeConsoleCheckout(sessionId: string, actor?: { userId?: string; role?: string }) {
    const { resolveConsoleSession } = await import("../lib/stripeCheckout");
    const session = resolveConsoleSession(sessionId);
    if (!session) throw Object.assign(new Error("Unknown checkout session"), { status: 404 });
    return this.recordPayment(session.feeId, {
      amount: session.amount,
      method: "CHECKOUT",
      checkoutSessionId: sessionId,
      recordedBy: actor?.userId || null,
      recordedByRole: actor?.role || "SYSTEM",
      payerUserId: actor?.userId || null,
      confirmStale: true,
      role: "SCHOOL_ADMIN",
    }).then((r) => r.fee);
  },

  async sendReminder(id: string) {
    const fee = await prisma.feePayment.findUnique({ where: { id } });
    if (!fee) throw new Error("Fee record not found");
    if (!["PENDING", "PARTIAL"].includes(fee.status)) {
      throw Object.assign(new Error("Reminders only apply to open invoices"), { status: 409 });
    }

    const student = await getIdentityUser(fee.studentId);
    console.log(
      JSON.stringify({
        level: "info",
        service: "finance",
        event: "fee.reminder_logged",
        feeId: fee.id,
        studentId: fee.studentId,
        studentName: student?.name || null,
        type: fee.type,
        amount: fee.amount,
        note: "Email/SMS delivery not configured; logged for staff follow-up",
      })
    );

    if (fee.studentId && !String(fee.studentId).startsWith("application:")) {
      const { notifyInApp, notifyInAppMany } = await import("../lib/notifyInApp");
      await notifyInApp({
        schoolId: fee.schoolId,
        userId: fee.studentId,
        eventKey: "FEE_DUE",
        title: "Fee reminder",
        body: `Reminder: ${fee.type || "Fee"} of ${fee.amount} is still pending.`,
        href: "/fees",
        meta: { feeId: fee.id },
      });
      const parentIds = await getStudentParentIds(fee.studentId);
      if (parentIds.length) {
        await notifyInAppMany(
          parentIds.map((parentId) => ({
            schoolId: fee.schoolId,
            userId: parentId,
            eventKey: "FEE_DUE",
            title: "Fee reminder",
            body: `Reminder: ${fee.type || "Fee"} of ${fee.amount} is still pending for your child.`,
            href: "/fees",
            meta: { feeId: fee.id, studentId: fee.studentId },
          }))
        );
      }
    }

    return {
      message:
        "Reminder sent via in-app and/or email when school notification preferences allow.",
      delivered: false,
      studentName: student?.name || null,
      studentEmail: student?.email || null,
    };
  },

  async listTemplates(schoolId: string) {
    return prisma.feeTemplate.findMany({
      where: { schoolId },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    });
  },

  async createTemplate(schoolId: string, data: any) {
    const scopeMode = normalizeScopeMode(data.scopeMode);
    const cohort = normalizeCohort(data.cohort);
    const gradeLevelId =
      scopeMode === "GRADE" ? String(data.gradeLevelId || "").trim() || null : null;
    const divisionId =
      scopeMode === "DIVISION" ? String(data.divisionId || "").trim() || null : null;

    if (scopeMode === "GRADE" && !gradeLevelId) {
      throw Object.assign(new Error("Grade-scoped templates require a grade level"), {
        status: 400,
      });
    }
    if (scopeMode === "DIVISION" && !divisionId) {
      throw Object.assign(new Error("Division-scoped templates require a division"), {
        status: 400,
      });
    }
    if (scopeMode === "DIVISION" && divisionId) {
      const d = await getDivision(schoolId, divisionId);
      if (!d) {
        throw Object.assign(new Error("Division not found"), { status: 404 });
      }
    }

    return prisma.feeTemplate.create({
      data: {
        schoolId,
        name: String(data.name).trim(),
        type: String(data.type).trim(),
        amount: Number(data.amount),
        description: String(data.description || "").trim(),
        scopeMode,
        gradeLevelId,
        divisionId,
        cohort,
        schoolYearKey: data.schoolYearKey
          ? String(data.schoolYearKey).trim()
          : null,
        subcategory: data.subcategory
          ? String(data.subcategory).trim()
          : null,
      },
    });
  },

  async deleteTemplate(schoolId: string, id: string) {
    const existing = await prisma.feeTemplate.findFirst({ where: { id, schoolId } });
    if (!existing) throw Object.assign(new Error("Template not found"), { status: 404 });
    const used = await prisma.feePayment.count({
      where: { schoolId, templateId: id },
    });
    if (used > 0) {
      // Keep for audit: invoices reference it by templateId (G3 — lookups by id still resolve).
      await prisma.feeTemplate.update({ where: { id }, data: { active: false } });
      return { ok: true, archived: true, linkedInvoices: used };
    }
    await prisma.feeTemplate.delete({ where: { id } });
    return { ok: true, archived: false };
  },

  async updateTemplate(schoolId: string, id: string, data: any) {
    const existing = await prisma.feeTemplate.findFirst({ where: { id, schoolId } });
    if (!existing) throw Object.assign(new Error("Template not found"), { status: 404 });

    const scopeMode = normalizeScopeMode(data.scopeMode ?? existing.scopeMode);
    const cohort = normalizeCohort(data.cohort ?? existing.cohort);
    const gradeLevelId =
      scopeMode === "GRADE"
        ? String((data.gradeLevelId !== undefined ? data.gradeLevelId : existing.gradeLevelId) || "").trim() ||
          null
        : null;
    const divisionId =
      scopeMode === "DIVISION"
        ? String((data.divisionId !== undefined ? data.divisionId : existing.divisionId) || "").trim() ||
          null
        : null;

    if (scopeMode === "GRADE" && !gradeLevelId) {
      throw Object.assign(new Error("Grade-scoped templates require a grade level"), {
        status: 400,
      });
    }
    if (scopeMode === "DIVISION" && !divisionId) {
      throw Object.assign(new Error("Division-scoped templates require a division"), {
        status: 400,
      });
    }
    if (scopeMode === "DIVISION" && divisionId) {
      const d = await getDivision(schoolId, divisionId);
      if (!d) {
        throw Object.assign(new Error("Division not found"), { status: 404 });
      }
    }

    const amount =
      data.amount !== undefined && data.amount !== null
        ? Number(data.amount)
        : existing.amount;
    if (!Number.isFinite(amount) || amount <= 0) {
      throw Object.assign(new Error("Amount must be a positive number"), { status: 400 });
    }

    return prisma.feeTemplate.update({
      where: { id },
      data: {
        name:
          data.name !== undefined ? String(data.name).trim() : existing.name,
        type:
          data.type !== undefined ? String(data.type).trim() : existing.type,
        amount,
        description:
          data.description !== undefined
            ? String(data.description || "").trim()
            : existing.description,
        scopeMode,
        gradeLevelId,
        divisionId,
        cohort,
        schoolYearKey:
          data.schoolYearKey !== undefined
            ? data.schoolYearKey
              ? String(data.schoolYearKey).trim()
              : null
            : existing.schoolYearKey,
        subcategory:
          data.subcategory !== undefined
            ? data.subcategory
              ? String(data.subcategory).trim()
              : null
            : existing.subcategory,
        active:
          data.active !== undefined ? Boolean(data.active) : existing.active,
      },
    });
  },

  async batchApplyTemplate(
    schoolId: string,
    data: {
      templateId: string;
      dueDate: string | Date;
      schoolYearKey?: string | null;
      notes?: string | null;
    },
    opts?: { role?: string }
  ) {
    const template = await prisma.feeTemplate.findFirst({
      where: { id: data.templateId, schoolId },
    });
    if (!template) {
      throw Object.assign(new Error("Fee template not found"), { status: 404 });
    }

    const scope = templateToScope({
      ...template,
      schoolYearKey: data.schoolYearKey || template.schoolYearKey,
    });
    const schoolYearKey = scope.schoolYearKey || null;
    const cohort = normalizeCohort(scope.cohort);

    let candidates: Awaited<ReturnType<typeof listIdentityStudents>> = [];
    if (normalizeScopeMode(scope.scopeMode) === "GRADE") {
      candidates = await listIdentityStudents(schoolId, {
        gradeLevelId: scope.gradeLevelId || undefined,
        feeCohort: cohort === "ALL" ? undefined : cohort,
      });
    } else if (normalizeScopeMode(scope.scopeMode) === "DIVISION") {
      const gradeIds = await gradeLevelIdsForDivision(schoolId, scope.divisionId!);
      if (gradeIds.length === 0) {
        return {
          created: 0,
          skipped: 0,
          failed: 0,
          total: 0,
          results: [] as Array<{
            studentId: string;
            studentName?: string;
            status: string;
            reason?: string;
          }>,
        };
      }
      const all = await listIdentityStudents(schoolId, {
        feeCohort: cohort === "ALL" ? undefined : cohort,
      });
      candidates = all.filter((s) => s.gradeLevelId && gradeIds.includes(s.gradeLevelId));
    } else {
      candidates = await listIdentityStudents(schoolId, {
        feeCohort: cohort === "ALL" ? undefined : cohort,
      });
    }

    const grades = await listGradeLevels(schoolId);
    const gradeMap = new Map(grades.map((g) => [g.id, g]));
    const results: Array<{
      studentId: string;
      studentName?: string;
      status: "created" | "skipped" | "failed";
      reason?: string;
      feeId?: string;
    }> = [];

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const stud of candidates) {
      const grade = stud.gradeLevelId ? gradeMap.get(stud.gradeLevelId) : null;
      const profile: StudentFeeProfile = {
        id: stud.id,
        name: stud.name,
        schoolId: stud.schoolId || schoolId,
        gradeLevelId: stud.gradeLevelId || null,
        feeCohort: stud.feeCohort || null,
        divisionId: grade?.divisionId || null,
        gradeLevelName: grade?.name || null,
        divisionName: null,
      };

      try {
        assertFeeScopeEligible(scope, profile);
      } catch (err: any) {
        failed++;
        results.push({
          studentId: stud.id,
          studentName: stud.name,
          status: "failed",
          reason: err.message,
        });
        continue;
      }

      if (schoolYearKey) {
        const existing = await prisma.feePayment.findFirst({
          where: {
            schoolId,
            studentId: stud.id,
            templateId: template.id,
            schoolYearKey,
            status: { in: ["PENDING", "PARTIAL", "PAID"] },
          },
        });
        if (existing) {
          skipped++;
          results.push({
            studentId: stud.id,
            studentName: stud.name,
            status: "skipped",
            reason: "Already billed for this template and school year",
          });
          continue;
        }
      }

      try {
        const fee = await this.createFee(
          schoolId,
          {
            studentId: stud.id,
            templateId: template.id,
            amount: template.amount,
            type: template.type,
            dueDate: data.dueDate,
            status: "PENDING",
            notes: data.notes || null,
            schoolYearKey,
          },
          { role: opts?.role || "ACCOUNTANT", skipEligibility: false }
        );
        created++;
        results.push({
          studentId: stud.id,
          studentName: stud.name,
          status: "created",
          feeId: fee.id,
        });
      } catch (err: any) {
        if (err?.code === "FEE_ALREADY_BILLED") {
          skipped++;
          results.push({
            studentId: stud.id,
            studentName: stud.name,
            status: "skipped",
            reason: err.message,
          });
        } else {
          failed++;
          results.push({
            studentId: stud.id,
            studentName: stud.name,
            status: "failed",
            reason: err.message || "Failed to create invoice",
          });
        }
      }
    }

    return { created, skipped, failed, total: candidates.length, results };
  },

  // EXPENSE ENDPOINTS
  async getExpenses(
    schoolId: string,
    opts?: {
      category?: string;
      status?: string;
      q?: string;
      from?: string;
      to?: string;
      page?: number | string;
      pageSize?: number | string;
    }
  ) {
    const where: any = { schoolId };
    if (opts?.category) where.category = opts.category;
    if (opts?.status) where.status = opts.status;
    const q = opts?.q?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }
    if (opts?.from || opts?.to) {
      where.date = {};
      if (opts.from) where.date.gte = new Date(opts.from);
      if (opts.to) {
        const to = new Date(opts.to);
        if (!String(opts.to).includes("T")) to.setHours(23, 59, 59, 999);
        where.date.lte = to;
      }
    }
    const page = Math.max(1, Number(opts?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(opts?.pageSize) || 50));
    const [total, items] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, total, page, pageSize };
  },

  async createExpense(schoolId: string, data: any) {
    const expense = await prisma.expense.create({
      data: {
        schoolId,
        title: data.title,
        category: data.category,
        amount: Number(data.amount),
        status: data.status || "PENDING",
        date: data.date ? new Date(data.date) : new Date(),
        notes: data.notes,
        receiptUrl: data.receiptUrl,
      },
    });
    if (expense.status === "APPROVED") {
      try {
        const { receiptService } = await import("./receiptService");
        await receiptService.issueForExpense(expense.id, "system");
      } catch (err: any) {
        console.warn("[finance] receipt issue after expense create:", err?.message || err);
      }
    }
    return expense;
  },

  async updateExpense(id: string, data: any) {
    const before = await prisma.expense.findUnique({ where: { id } });
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        title: data.title,
        category: data.category,
        amount: data.amount !== undefined ? Number(data.amount) : undefined,
        status: data.status,
        date: data.date ? new Date(data.date) : undefined,
        notes: data.notes,
        receiptUrl: data.receiptUrl,
      },
    });
    if (
      expense.status === "APPROVED" &&
      before?.status !== "APPROVED"
    ) {
      try {
        const { receiptService } = await import("./receiptService");
        await receiptService.issueForExpense(expense.id, "system");
      } catch (err: any) {
        console.warn("[finance] receipt issue after expense approve:", err?.message || err);
      }
    }
    return expense;
  },

  async deleteExpense(id: string) {
    return prisma.expense.delete({ where: { id } });
  },

  // COMPREHENSIVE FINANCE DASHBOARD DATA
  async getFinanceSummary(schoolId: string) {
    const fees = await prisma.feePayment.findMany({ where: { schoolId } });
    const expenses = await prisma.expense.findMany({ where: { schoolId } });
    const payrolls = await getPayrolls(schoolId).catch(() => [] as Awaited<ReturnType<typeof getPayrolls>>);
    const recentTxns = await prisma.feePaymentTxn.findMany({
      where: { schoolId, kind: "PAYMENT" },
      orderBy: { paidAt: "desc" },
      take: 5000,
    });

    const paidFeesTotal = fees.reduce((sum, f) => sum + effectiveAmountPaid(f), 0);
    const pendingFeesTotal = fees
      .filter((f) => f.status === "PENDING" || f.status === "PARTIAL")
      .reduce((sum, f) => sum + invoiceBalance(f.amount, effectiveAmountPaid(f)), 0);

    const approvedExpensesTotal = expenses.filter((e) => e.status === "APPROVED").reduce((sum, e) => sum + e.amount, 0);
    const pendingExpensesTotal = expenses.filter((e) => e.status === "PENDING").reduce((sum, e) => sum + e.amount, 0);

    const paidPayrollTotal = payrolls.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.netSalary, 0);
    const pendingPayrollTotal = payrolls.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.netSalary, 0);

    const monthlySummaryMap: Record<string, { income: number; expenses: number; payroll: number }> = {};

    const getYearMonthStr = (d: Date) => {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      return `${yr}-${mo}`;
    };

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlySummaryMap[getYearMonthStr(d)] = { income: 0, expenses: 0, payroll: 0 };
    }

    recentTxns.forEach((t) => {
      const ym = getYearMonthStr(new Date(t.paidAt));
      if (monthlySummaryMap[ym]) {
        monthlySummaryMap[ym].income += t.amount;
      } else {
        monthlySummaryMap[ym] = { income: t.amount, expenses: 0, payroll: 0 };
      }
    });

    // Legacy PAID invoices with no txn rows still count as income in paidAt month
    fees.forEach((f) => {
      if (f.status === "PAID" && f.paidAt && effectiveAmountPaid(f) > 0) {
        const hasTxn = recentTxns.some((t) => t.feePaymentId === f.id);
        if (!hasTxn) {
          const ym = getYearMonthStr(new Date(f.paidAt));
          if (monthlySummaryMap[ym]) {
            monthlySummaryMap[ym].income += f.amount;
          } else {
            monthlySummaryMap[ym] = { income: f.amount, expenses: 0, payroll: 0 };
          }
        }
      }
    });

    expenses.forEach((e) => {
      if (e.status === "APPROVED" && e.date) {
        const ym = getYearMonthStr(new Date(e.date));
        if (monthlySummaryMap[ym]) {
          monthlySummaryMap[ym].expenses += e.amount;
        } else {
          monthlySummaryMap[ym] = { income: 0, expenses: e.amount, payroll: 0 };
        }
      }
    });

    payrolls.forEach((p) => {
      if (p.status === "PAID") {
        const monthStr = String(p.month).padStart(2, "0");
        const ym = `${p.year}-${monthStr}`;
        if (monthlySummaryMap[ym]) {
          monthlySummaryMap[ym].payroll += p.netSalary;
        } else {
          monthlySummaryMap[ym] = { income: 0, expenses: 0, payroll: p.netSalary };
        }
      }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chartData = Object.entries(monthlySummaryMap)
      .map(([ym, data]) => {
        const [yr, mo] = ym.split("-");
        const monthLabel = monthNames[parseInt(mo, 10) - 1] + " " + yr;
        const totalOutflows = data.expenses + data.payroll;
        return {
          month: monthLabel,
          ym,
          income: Number(data.income.toFixed(2)),
          expenses: Number(totalOutflows.toFixed(2)),
          operational: Number(data.expenses.toFixed(2)),
          payroll: Number(data.payroll.toFixed(2)),
          surplus: Number((data.income - totalOutflows).toFixed(2)),
        };
      })
      .sort((a, b) => a.ym.localeCompare(b.ym));

    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach((e) => {
      if (e.status === "APPROVED") {
        categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
      }
    });

    const categoriesList = Object.entries(categoryBreakdown).map(([category, value]) => ({
      category,
      value: Number(value.toFixed(2)),
    }));

    return {
      totals: {
        totalRevenue: paidFeesTotal,
        pendingRevenue: pendingFeesTotal,
        totalExpenses: approvedExpensesTotal,
        pendingExpenses: pendingExpensesTotal,
        totalPayroll: paidPayrollTotal,
        pendingPayroll: pendingPayrollTotal,
        netCashFlow: paidFeesTotal - (approvedExpensesTotal + paidPayrollTotal),
      },
      chartData,
      categoriesBreakdown: categoriesList,
    };
  },

  async getBillingSettings(schoolId: string) {
    const row = await prisma.schoolBillingSettings.findUnique({ where: { schoolId } });
    return {
      schoolId,
      minPaymentAmount: row
        ? roundMoney(Number(row.minPaymentAmount) || DEFAULT_MIN_PAYMENT)
        : DEFAULT_MIN_PAYMENT,
    };
  },

  async updateBillingSettings(schoolId: string, data: { minPaymentAmount?: number | string }) {
    const min = roundMoney(Number(data.minPaymentAmount));
    if (!Number.isFinite(min) || min < 0) {
      throw Object.assign(new Error("Minimum payment must be zero or greater"), { status: 400 });
    }
    if (min > 100000) {
      throw Object.assign(new Error("Minimum payment is unreasonably large"), { status: 400 });
    }
    const row = await prisma.schoolBillingSettings.upsert({
      where: { schoolId },
      create: { schoolId, minPaymentAmount: min },
      update: { minPaymentAmount: min },
    });
    return {
      schoolId,
      minPaymentAmount: roundMoney(row.minPaymentAmount),
    };
  },

  /**
   * Create synthetic PAYMENT txns for legacy PAID invoices that have no payment rows,
   * and fix amountPaid denormalization.
   */
  async backfillLegacyPaidTxns(schoolId: string) {
    const paid = await prisma.feePayment.findMany({
      where: { schoolId, status: "PAID" },
    });
    let created = 0;
    let amountFixed = 0;
    for (const fee of paid) {
      const txnCount = await prisma.feePaymentTxn.count({
        where: { feePaymentId: fee.id, kind: "PAYMENT" },
      });
      const paidAmt = effectiveAmountPaid(fee);
      if (roundMoney(Number(fee.amountPaid || 0)) !== paidAmt) {
        await prisma.feePayment.update({
          where: { id: fee.id },
          data: { amountPaid: paidAmt },
        });
        amountFixed++;
      }
      if (txnCount > 0) continue;

      const studentName = await resolveStudentName(fee.studentId);
      await prisma.feePaymentTxn.create({
        data: {
          schoolId,
          feePaymentId: fee.id,
          studentId: fee.studentId,
          kind: "PAYMENT",
          amount: paidAmt,
          balanceBefore: paidAmt,
          balanceAfter: 0,
          billedAmount: fee.amount,
          invoiceStatusBefore: "PENDING",
          invoiceStatusAfter: "PAID",
          method: "OTHER",
          paidAt: fee.paidAt || fee.updatedAt || fee.createdAt,
          recordedBy: null,
          recordedByRole: "SYSTEM",
          studentNameSnapshot: studentName,
          feeTypeSnapshot: fee.type,
          notes: "Backfilled from legacy full payment (pre-installment ledger)",
        },
      });
      created++;
    }
    return { scanned: paid.length, txnsCreated: created, amountPaidFixed: amountFixed };
  },
};
