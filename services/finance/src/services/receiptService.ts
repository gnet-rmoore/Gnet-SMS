import crypto from "node:crypto";
import prisma from "../lib/prisma";
import { getIdentitySchool, getIdentityUser } from "../lib/identityClient";
import {
  isOfficialSignatureDataUrl,
  parseDocumentSignatories,
} from "../lib/documentSignatories";
import { renderReceiptDocument, renderReceiptPreviewHtml } from "../lib/receiptRender";
import {
  RECEIPT_TEMPLATES,
  resolveReceiptTemplateId,
  isHtmlReceiptTemplate,
  parseReceiptTemplatesByRole,
  resolveReceiptTemplateForIssue,
  type ReceiptTemplateId,
} from "../lib/receiptTemplateRegistry";
import { monroviaAcademySampleInput } from "../lib/receiptContext";
import { putReceiptPdf, getReceiptPdfSignedUrl, getReceiptPdfObject, storageEnabled } from "../lib/receiptStorage";
import { resolveReceiptLocale, tReceipt, type AppLocale } from "../i18n/receiptChrome";

export type ReceiptType = "FEE_PAYMENT" | "PAYSLIP" | "EXPENSE" | "TRANSACTION";

export type IssueReceiptInput = {
  schoolId: string;
  type: ReceiptType;
  sourceType: string;
  sourceId: string;
  payeeName: string;
  payerName: string;
  currency?: string;
  amount: number;
  lineItems: Array<{ label: string; amount: number }>;
  sourceRef: string;
  issuedBy?: string | null;
  title?: string;
  supersedesId?: string | null;
  paymentMethod?: string | null;
  paidAt?: Date | null;
  studentName?: string | null;
  categoryLabel?: string | null;
  periodLabel?: string | null;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
  placeOfIssue?: string | null;
  note?: string | null;
  cashierName?: string | null;
  copyLabel?: string | null;
};

let warnedMissingHmacSecret = false;

function hmacSecret() {
  if (process.env.RECEIPT_HMAC_SECRET) return process.env.RECEIPT_HMAC_SECRET;
  if (!warnedMissingHmacSecret) {
    warnedMissingHmacSecret = true;
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[finance] SECURITY: RECEIPT_HMAC_SECRET is unset in production — falling back to " +
          "JWT_ACCESS_SECRET/dev secret. Set RECEIPT_HMAC_SECRET to a dedicated random value; " +
          "rotating it will invalidate existing receipt verification signatures."
      );
    }
  }
  return process.env.JWT_ACCESS_SECRET || "dev-receipt-hmac-change-me";
}

async function resolveAuthorizedSigner(opts: {
  school: Awaited<ReturnType<typeof getIdentitySchool>>;
  issuedBy?: string | null;
}): Promise<{
  signatureUrl: string | null;
  name: string | null;
  title: string;
}> {
  const map = parseDocumentSignatories(opts.school?.documentSignatories);
  const accountantId = map.accountant?.userId;
  const principalId = map.principal?.userId;
  let user = accountantId ? await getIdentityUser(accountantId) : null;
  let title = "Accountant";
  if (!user && principalId) {
    user = await getIdentityUser(principalId);
    title = "School Principal";
  }
  if (!user && opts.issuedBy) {
    user = await getIdentityUser(opts.issuedBy);
    title = user?.role === "ACCOUNTANT" ? "Accountant" : "Authorized signature";
  }
  return {
    signatureUrl: isOfficialSignatureDataUrl(user?.signatureUrl),
    name: user?.name || null,
    title,
  };
}

function appBaseUrl() {
  return (process.env.APP_URL || "http://localhost:8080").split(",")[0].trim();
}

function canonicalPayload(parts: Record<string, unknown>) {
  return JSON.stringify(parts, Object.keys(parts).sort());
}

function signVerify(schoolId: string, verifyCode: string, payloadHash: string) {
  return crypto
    .createHmac("sha256", hmacSecret())
    .update(`${schoolId}:${verifyCode}:${payloadHash}`)
    .digest("hex");
}

function titleForType(type: ReceiptType, locale: AppLocale) {
  switch (type) {
    case "FEE_PAYMENT":
      return tReceipt(locale, "officialFeeReceipt");
    case "PAYSLIP":
      return tReceipt(locale, "officialPayslip");
    case "EXPENSE":
      return tReceipt(locale, "expenseReceipt");
    case "TRANSACTION":
      return tReceipt(locale, "transactionReceipt");
    default:
      return tReceipt(locale, "officialReceipt");
  }
}

async function nextReceiptNumber(schoolId: string): Promise<string> {
  const year = new Date().getFullYear();
  const row = await prisma.receiptCounter.upsert({
    where: { schoolId_year: { schoolId, year } },
    create: { schoolId, year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  const school = await getIdentitySchool(schoolId);
  const prefix = (school?.slug || "SMS").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "SMS";
  return `${prefix}-${year}-${String(row.lastValue).padStart(6, "0")}`;
}

function publicDto(receipt: any, sigValid: boolean) {
  return {
    valid: sigValid && receipt.status === "ISSUED",
    status: receipt.status,
    receiptNumber: receipt.receiptNumber,
    type: receipt.type,
    issuedAt: receipt.issuedAt,
    amount: receipt.amount,
    currency: receipt.currency,
    payerName: receipt.payerName,
    payeeName: receipt.payeeName,
    payloadHash: receipt.payloadHash,
    lineItems: JSON.parse(receipt.lineItems || "[]"),
    branding: receipt.branding ? JSON.parse(receipt.branding) : null,
    signatureValid: sigValid,
  };
}

export const receiptService = {
  async findIssued(schoolId: string, type: string, sourceId: string) {
    return prisma.receipt.findFirst({
      where: { schoolId, type, sourceId, status: "ISSUED" },
      orderBy: { issuedAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.receipt.findUnique({ where: { id } });
  },

  async list(
    schoolId: string,
    opts?: { type?: string; sourceId?: string; status?: string; sourceIds?: string[] }
  ) {
    // `sourceIds` is a hard ownership filter (fee receipts belong to the caller's payments).
    // An explicitly empty array must match nothing rather than fall through to "all".
    if (opts?.sourceIds && opts.sourceIds.length === 0) return [];
    return prisma.receipt.findMany({
      where: {
        schoolId,
        ...(opts?.type ? { type: opts.type } : {}),
        ...(opts?.sourceId ? { sourceId: opts.sourceId } : {}),
        ...(opts?.status ? { status: opts.status } : {}),
        ...(opts?.sourceIds ? { sourceId: { in: opts.sourceIds } } : {}),
      },
      orderBy: { issuedAt: "desc" },
      take: 200,
    });
  },

  /**
   * Source ids of fee receipts a student/parent may see: payment txns for the caller's own/
   * children's invoices, plus anything the caller personally paid for.
   */
  async getFeeReceiptSourceIds(
    schoolId: string,
    studentIds: string[],
    payerUserId?: string
  ): Promise<string[]> {
    const or: any[] = [];
    if (studentIds.length) or.push({ studentId: { in: studentIds } });
    if (payerUserId) or.push({ payerUserId });
    if (!or.length) return [];
    const txns = await prisma.feePaymentTxn.findMany({
      where: { schoolId, kind: "PAYMENT", OR: or },
      select: { id: true },
    });
    return txns.map((t) => t.id);
  },

  async issue(input: IssueReceiptInput) {
    const existing = await this.findIssued(input.schoolId, input.type, input.sourceId);
    if (existing && !input.supersedesId) {
      return existing;
    }

    const school = await getIdentitySchool(input.schoolId);
    const locale = resolveReceiptLocale(school?.defaultLocale);
    const signer = await resolveAuthorizedSigner({
      school,
      issuedBy: input.issuedBy,
    });
    const byRole = parseReceiptTemplatesByRole(
      school?.receiptTemplatesByRole,
      school?.receiptTemplates,
      school?.receiptTemplate
    );
    const receiptTemplate = resolveReceiptTemplateForIssue(
      input.type,
      byRole,
      school?.receiptTemplates,
      school?.receiptTemplate
    );
    const branding = {
      name: school?.name || "School",
      logoUrl: school?.logoUrl || null,
      address: school?.address || null,
      contactEmail: school?.contactEmail || null,
      contactPhone: school?.contactPhone || null,
      brandColor: school?.brandColor || "#2563EB",
      slug: school?.slug || null,
      locale,
      receiptTemplate,
      schoolTimezone: school?.timezone || null,
      authorizedSignerName: signer.name,
      authorizedSignerTitle: signer.title,
      meta: {
        paymentMethod: input.paymentMethod || null,
        paidAt: input.paidAt ? input.paidAt.toISOString() : null,
        studentName: input.studentName || null,
        categoryLabel: input.categoryLabel || null,
        periodLabel: input.periodLabel || null,
        balanceBefore: typeof input.balanceBefore === "number" ? input.balanceBefore : null,
        balanceAfter: typeof input.balanceAfter === "number" ? input.balanceAfter : null,
        placeOfIssue: input.placeOfIssue || null,
        note: input.note || null,
        cashierName: input.cashierName || null,
        copyLabel: input.copyLabel || null,
        sourceRef: input.sourceRef,
      },
    };

    const verifyCode = crypto.randomBytes(16).toString("hex");
    const receiptNumber = await nextReceiptNumber(input.schoolId);
    const issuedAt = new Date();
    const currency = input.currency || "USD";
    const lineItems = input.lineItems?.length
      ? input.lineItems
      : [{ label: titleForType(input.type, locale), amount: input.amount }];

    const canonical = canonicalPayload({
      schoolId: input.schoolId,
      type: input.type,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      receiptNumber,
      amount: input.amount,
      currency,
      payerName: input.payerName,
      payeeName: input.payeeName,
      lineItems,
      issuedAt: issuedAt.toISOString(),
    });
    const payloadHash = crypto.createHash("sha256").update(canonical).digest("hex");
    const verifySig = signVerify(input.schoolId, verifyCode, payloadHash);
    const verifyUrl = `${appBaseUrl()}/verify/receipt/${verifyCode}`;

    const pdf = await renderReceiptDocument(receiptTemplate, {
      title: input.title || titleForType(input.type, locale),
      receiptNumber,
      issuedAt,
      schoolName: branding.name,
      schoolAddress: branding.address,
      schoolEmail: branding.contactEmail,
      schoolPhone: branding.contactPhone,
      schoolLogoUrl: branding.logoUrl,
      brandColor: branding.brandColor,
      payerName: input.payerName,
      payeeName: input.payeeName,
      currency,
      amount: input.amount,
      lineItems,
      sourceRef: input.sourceRef,
      payloadHash,
      verifyUrl,
      status: "ISSUED",
      locale,
      authorizedSignatureUrl: signer.signatureUrl,
      authorizedSignerName: signer.name,
      authorizedSignerTitle: signer.title,
      schoolTimezone: school?.timezone || null,
      paymentMethod: input.paymentMethod || null,
      paidAt: input.paidAt || null,
      studentName: input.studentName || null,
      categoryLabel: input.categoryLabel || null,
      periodLabel: input.periodLabel || null,
      balanceBefore: typeof input.balanceBefore === "number" ? input.balanceBefore : null,
      balanceAfter: typeof input.balanceAfter === "number" ? input.balanceAfter : null,
      placeOfIssue: input.placeOfIssue || null,
      note: input.note || null,
      cashierName: input.cashierName || null,
      copyLabel: input.copyLabel || null,
    });

    const receiptId = crypto.randomUUID();
    const stored = await putReceiptPdf({
      schoolId: input.schoolId,
      receiptId,
      pdf,
    });

    const receipt = await prisma.receipt.create({
      data: {
        id: receiptId,
        schoolId: input.schoolId,
        type: input.type,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        receiptNumber,
        status: "ISSUED",
        issuedAt,
        payeeName: input.payeeName,
        payerName: input.payerName,
        currency,
        amount: input.amount,
        lineItems: JSON.stringify(lineItems),
        branding: JSON.stringify(branding),
        payloadHash,
        verifyCode,
        verifySig,
        storageKey: stored.storageKey,
        fileUrl: stored.fileUrl,
        pdfBase64: storageEnabled() ? null : pdf.toString("base64"),
        issuedBy: input.issuedBy || null,
        supersedesId: input.supersedesId || null,
      },
    });

    return receipt;
  },

  async voidReceipt(id: string, reason?: string) {
    const existing = await prisma.receipt.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error("Receipt not found"), { status: 404 });
    }
    if (existing.status !== "ISSUED") {
      throw Object.assign(new Error("Only issued receipts can be voided"), { status: 409 });
    }
    return prisma.receipt.update({
      where: { id },
      data: {
        status: "VOIDED",
        voidedAt: new Date(),
        voidReason: reason || null,
      },
    });
  },

  /** Void the issued receipt for a source (e.g. payroll payslip), if any. */
  async voidIssuedBySource(
    schoolId: string,
    type: ReceiptType,
    sourceId: string,
    reason?: string
  ) {
    const existing = await this.findIssued(schoolId, type, sourceId);
    if (!existing) return null;
    return this.voidReceipt(existing.id, reason);
  },

  async verify(code: string) {
    const receipt = await prisma.receipt.findUnique({ where: { verifyCode: code } });
    if (!receipt) {
      return { valid: false, status: "NOT_FOUND", signatureValid: false };
    }
    const expected = signVerify(receipt.schoolId, receipt.verifyCode, receipt.payloadHash);
    const a = Buffer.from(expected);
    const b = Buffer.from(receipt.verifySig);
    const sigValid = a.length === b.length && crypto.timingSafeEqual(a, b);
    return publicDto(receipt, sigValid);
  },

  async getDownloadTarget(receipt: {
    id: string;
    storageKey: string | null;
    fileUrl: string | null;
    pdfBase64: string | null;
  }): Promise<{ kind: "redirect" | "buffer"; url?: string; buffer?: Buffer }> {
    if (receipt.pdfBase64) {
      return { kind: "buffer", buffer: Buffer.from(receipt.pdfBase64, "base64") };
    }
    if (receipt.storageKey && !receipt.storageKey.startsWith("local://")) {
      const buf = await getReceiptPdfObject(receipt.storageKey);
      if (buf) return { kind: "buffer", buffer: buf };
      const signed = await getReceiptPdfSignedUrl(receipt.storageKey);
      if (signed) return { kind: "redirect", url: signed };
      if (receipt.fileUrl && receipt.fileUrl.startsWith("http")) {
        return { kind: "redirect", url: receipt.fileUrl };
      }
    }
    throw Object.assign(new Error("Receipt PDF not available"), { status: 404 });
  },

  /**
   * Re-render PDF from the immutable receipt snapshot using the current template.
   * Does not change receipt number, verify code, or payload hash — only the PDF bytes.
   * Optionally refreshes school logo/address/contact/brand from Identity into branding
   * so header fields are complete when the school profile was incomplete at first issue.
   */
  async refreshPdf(receiptId: string) {
    const receipt = await prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt) {
      throw Object.assign(new Error("Receipt not found"), { status: 404 });
    }

    let branding: {
      name?: string;
      logoUrl?: string | null;
      address?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      brandColor?: string | null;
      slug?: string | null;
      locale?: string | null;
      receiptTemplate?: ReceiptTemplateId | string | null;
      schoolTimezone?: string | null;
      meta?: {
        paymentMethod?: string | null;
        paidAt?: string | null;
        studentName?: string | null;
        categoryLabel?: string | null;
        periodLabel?: string | null;
        balanceBefore?: number | null;
        balanceAfter?: number | null;
        placeOfIssue?: string | null;
        note?: string | null;
        cashierName?: string | null;
        copyLabel?: string | null;
        sourceRef?: string | null;
      } | null;
    } = {};
    try {
      branding = receipt.branding ? JSON.parse(receipt.branding) : {};
    } catch {
      branding = {};
    }

    const school = await getIdentitySchool(receipt.schoolId);
    const locale = resolveReceiptLocale(branding.locale ?? school?.defaultLocale);
    const signer = await resolveAuthorizedSigner({
      school,
      issuedBy: receipt.issuedBy,
    });
    // Fill gaps from live school profile (never wipe snapshot values that exist)
    branding = {
      name: branding.name || school?.name || "School",
      logoUrl: branding.logoUrl || school?.logoUrl || null,
      address: branding.address || school?.address || null,
      contactEmail: branding.contactEmail || school?.contactEmail || null,
      contactPhone: branding.contactPhone || school?.contactPhone || null,
      brandColor: branding.brandColor || school?.brandColor || "#2563EB",
      slug: branding.slug || school?.slug || null,
      locale: branding.locale || locale,
      schoolTimezone: branding.schoolTimezone || school?.timezone || null,
      meta: branding.meta ?? null,
      receiptTemplate: branding.receiptTemplate,
    };

    // Prefer live brand assets for header presentation (name/logo/address/contact/color)
    if (school) {
      branding = {
        ...branding,
        name: school.name || branding.name,
        logoUrl: school.logoUrl ?? branding.logoUrl,
        address: school.address ?? branding.address,
        contactEmail: school.contactEmail ?? branding.contactEmail,
        contactPhone: school.contactPhone ?? branding.contactPhone,
        brandColor: school.brandColor || branding.brandColor || "#2563EB",
        slug: school.slug || branding.slug,
        locale: branding.locale || resolveReceiptLocale(school.defaultLocale),
        schoolTimezone: school.timezone || branding.schoolTimezone || null,
      };
    }

    let lineItems: Array<{ label: string; amount: number }> = [];
    try {
      lineItems = JSON.parse(receipt.lineItems || "[]");
    } catch {
      lineItems = [{ label: titleForType(receipt.type as ReceiptType, locale), amount: receipt.amount }];
    }

    const byRole = parseReceiptTemplatesByRole(
      school?.receiptTemplatesByRole,
      school?.receiptTemplates,
      school?.receiptTemplate
    );
    const receiptTemplate = resolveReceiptTemplateId(
      branding.receiptTemplate ??
        resolveReceiptTemplateForIssue(
          receipt.type,
          byRole,
          school?.receiptTemplates,
          school?.receiptTemplate
        )
    );

    const verifyUrl = `${appBaseUrl()}/verify/receipt/${receipt.verifyCode}`;
    const meta = branding.meta || {};
    const pdf = await renderReceiptDocument(receiptTemplate, {
      title: titleForType(receipt.type as ReceiptType, locale),
      receiptNumber: receipt.receiptNumber,
      issuedAt: receipt.issuedAt,
      schoolName: branding.name || "School",
      schoolAddress: branding.address,
      schoolEmail: branding.contactEmail,
      schoolPhone: branding.contactPhone,
      schoolLogoUrl: branding.logoUrl,
      brandColor: branding.brandColor,
      payerName: receipt.payerName,
      payeeName: receipt.payeeName,
      currency: receipt.currency,
      amount: receipt.amount,
      lineItems,
      sourceRef:
        meta.sourceRef ||
        `${receipt.sourceType} ${receipt.sourceId.slice(0, 8).toUpperCase()}`,
      payloadHash: receipt.payloadHash,
      verifyUrl,
      status: receipt.status,
      locale,
      authorizedSignatureUrl: signer.signatureUrl,
      authorizedSignerName: signer.name,
      authorizedSignerTitle: signer.title,
      schoolTimezone: branding.schoolTimezone || school?.timezone || null,
      paymentMethod: meta.paymentMethod,
      paidAt: meta.paidAt ? new Date(meta.paidAt) : null,
      studentName: meta.studentName,
      categoryLabel: meta.categoryLabel,
      periodLabel: meta.periodLabel,
      balanceBefore: typeof meta.balanceBefore === "number" ? meta.balanceBefore : null,
      balanceAfter: typeof meta.balanceAfter === "number" ? meta.balanceAfter : null,
      placeOfIssue: meta.placeOfIssue,
      note: meta.note,
      cashierName: meta.cashierName,
      copyLabel: meta.copyLabel,
    });

    const stored = await putReceiptPdf({
      schoolId: receipt.schoolId,
      receiptId: receipt.id,
      pdf,
    });

    return prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        branding: JSON.stringify({ ...branding, receiptTemplate }),
        storageKey: stored.storageKey,
        fileUrl: stored.fileUrl,
        pdfBase64: storageEnabled() ? null : pdf.toString("base64"),
      },
    });
  },

  /**
   * Resolve a fee receipt source to the canonical settlement unit: a single PAYMENT txn.
   * Accepts either a `FeePaymentTxn.id` or a `FeePayment.id`.
   * - txn id → itself (must be a PAYMENT).
   * - invoice id → its sole PAYMENT txn; errors when 0 or >1 exist (one receipt per payment).
   */
  async resolveFeePaymentTxnId(sourceId: string): Promise<string> {
    const txn = await prisma.feePaymentTxn.findUnique({ where: { id: sourceId } });
    if (txn) {
      if (txn.kind !== "PAYMENT") {
        throw Object.assign(new Error("Only payment transactions issue receipts"), { status: 409 });
      }
      return txn.id;
    }
    const fee = await prisma.feePayment.findUnique({ where: { id: sourceId } });
    if (!fee) throw Object.assign(new Error("Fee not found"), { status: 404 });
    const payments = await prisma.feePaymentTxn.findMany({
      where: { feePaymentId: fee.id, kind: "PAYMENT" },
      orderBy: { paidAt: "asc" },
      select: { id: true },
    });
    if (payments.length === 0) {
      throw Object.assign(new Error("No payments recorded on this invoice yet"), {
        status: 409,
        code: "FEE_NO_PAYMENTS",
      });
    }
    if (payments.length > 1) {
      throw Object.assign(
        new Error("This invoice has multiple payments; issue a receipt per payment transaction"),
        { status: 409, code: "FEE_PER_TXN_RECEIPTS" }
      );
    }
    return payments[0].id;
  },

  /** Issue a fee receipt for a payment txn or a single-payment invoice (one receipt per payment). */
  async issueForFeePayment(sourceIdOrTxnId: string, issuedBy?: string | null, supersedesId?: string | null) {
    const txnId = await this.resolveFeePaymentTxnId(sourceIdOrTxnId);
    return this.issueForFeePaymentTxn(txnId, issuedBy, supersedesId);
  },

  /** Issue receipt for a single installment / payment txn. */
  async issueForFeePaymentTxn(txnId: string, issuedBy?: string | null, supersedesId?: string | null) {
    const txn = await prisma.feePaymentTxn.findUnique({ where: { id: txnId } });
    if (!txn) throw Object.assign(new Error("Payment not found"), { status: 404 });
    if (txn.kind !== "PAYMENT") {
      throw Object.assign(new Error("Only payment transactions issue receipts"), { status: 409 });
    }
    const fee = await prisma.feePayment.findUnique({ where: { id: txn.feePaymentId } });
    if (!fee) throw Object.assign(new Error("Fee not found"), { status: 404 });
    const student =
      txn.studentNameSnapshot ||
      (await getIdentityUser(fee.studentId))?.name ||
      "Student";
    const school = await getIdentitySchool(fee.schoolId);
    const payer = txn.payerNameSnapshot || student;
    const cashier = txn.recordedBy ? (await getIdentityUser(txn.recordedBy))?.name || null : null;
    return this.issue({
      schoolId: fee.schoolId,
      type: "FEE_PAYMENT",
      sourceType: "FEE_PAYMENT_TXN",
      sourceId: txn.id,
      payeeName: school?.name || "School",
      payerName: payer,
      amount: txn.amount,
      currency: "USD",
      lineItems: [
        { label: `${fee.type} — this payment`, amount: txn.amount },
        { label: "Previous balance owing", amount: txn.balanceBefore },
        { label: "Balance owing after payment", amount: txn.balanceAfter },
        { label: "Invoice billed total", amount: txn.billedAmount ?? fee.amount },
      ],
      sourceRef: `Pay ${txn.id.slice(0, 8).toUpperCase()} · Inv ${fee.id.slice(0, 8).toUpperCase()}`,
      issuedBy: issuedBy || null,
      supersedesId: supersedesId || null,
      paymentMethod: txn.method || null,
      paidAt: txn.paidAt || null,
      studentName: student,
      categoryLabel: txn.feeTypeSnapshot || fee.templateNameSnapshot || fee.type || null,
      periodLabel: fee.schoolYearKey || null,
      note: txn.notes || null,
      cashierName: cashier,
    });
  },

  async issueForExpense(expenseId: string, issuedBy?: string | null, supersedesId?: string | null) {
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) throw Object.assign(new Error("Expense not found"), { status: 404 });
    if (expense.status !== "APPROVED") {
      throw Object.assign(new Error("Expense must be APPROVED to issue a receipt"), {
        status: 409,
      });
    }
    const school = await getIdentitySchool(expense.schoolId);
    const cashier = issuedBy ? (await getIdentityUser(issuedBy))?.name || null : null;
    return this.issue({
      schoolId: expense.schoolId,
      type: "EXPENSE",
      sourceType: "Expense",
      sourceId: expense.id,
      payeeName: expense.title,
      payerName: school?.name || "School",
      amount: expense.amount,
      currency: "USD",
      lineItems: [{ label: `${expense.category}: ${expense.title}`, amount: expense.amount }],
      sourceRef: `Expense ${expense.id.slice(0, 8).toUpperCase()}`,
      issuedBy: issuedBy || null,
      supersedesId: supersedesId || null,
      paidAt: expense.date || null,
      categoryLabel: expense.category || null,
      note: expense.notes || null,
      cashierName: cashier,
    });
  },

  async issueForPayslip(data: {
    schoolId: string;
    payrollId: string;
    staffName: string;
    schoolName?: string;
    month: number;
    year: number;
    basicSalary: number;
    allowances: number;
    deductions: number;
    netSalary: number;
    currency?: string;
    issuedBy?: string | null;
  }) {
    const monthName = new Date(data.year, data.month - 1, 1).toLocaleString("default", {
      month: "long",
    });
    const cashier = data.issuedBy ? (await getIdentityUser(data.issuedBy))?.name || null : null;
    return this.issue({
      schoolId: data.schoolId,
      type: "PAYSLIP",
      sourceType: "Payroll",
      sourceId: data.payrollId,
      payeeName: data.staffName,
      payerName: data.schoolName || "School",
      amount: data.netSalary,
      currency: data.currency || "USD",
      lineItems: [
        { label: "Basic salary", amount: data.basicSalary },
        { label: "Allowances", amount: data.allowances },
        { label: "Deductions", amount: -Math.abs(data.deductions) },
        { label: "Net pay", amount: data.netSalary },
      ],
      sourceRef: `Payroll ${monthName} ${data.year}`,
      issuedBy: data.issuedBy || null,
      categoryLabel: "Payroll",
      periodLabel: `${monthName} ${data.year}`,
      cashierName: cashier,
    });
  },

  listTemplates() {
    return RECEIPT_TEMPLATES;
  },

  async previewDocument(
    schoolId: string,
    templateId: ReceiptTemplateId | string | null | undefined,
    opts?: PreviewSampleOpts
  ): Promise<{ contentType: "text/html" | "application/pdf"; body: string | Buffer }> {
    const sample = await buildPreviewSample(schoolId, opts);
    const resolved = resolveReceiptTemplateId(templateId);
    if (isHtmlReceiptTemplate(resolved)) {
      const html = await renderReceiptPreviewHtml(templateId, sample);
      return { contentType: "text/html", body: html };
    }
    const pdf = await renderReceiptDocument("PDFKIT_DEFAULT", sample);
    return { contentType: "application/pdf", body: pdf };
  },
};

type PreviewSampleOpts = {
  schoolName?: string;
  schoolAddress?: string | null;
  schoolEmail?: string | null;
  schoolPhone?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
  locale?: string | null;
};

async function buildPreviewSample(schoolId: string, opts?: PreviewSampleOpts) {
  const school = await getIdentitySchool(schoolId);
  return monroviaAcademySampleInput({
    schoolName: opts?.schoolName || school?.name || "Monrovia Academy",
    schoolAddress: opts?.schoolAddress ?? school?.address ?? undefined,
    schoolEmail: opts?.schoolEmail ?? school?.contactEmail ?? undefined,
    schoolPhone: opts?.schoolPhone ?? school?.contactPhone ?? undefined,
    schoolLogoUrl: opts?.logoUrl ?? school?.logoUrl ?? "",
    brandColor: opts?.brandColor ?? school?.brandColor ?? "#2563EB",
    locale: opts?.locale ?? school?.defaultLocale ?? "en",
    schoolTimezone: school?.timezone ?? "UTC",
  });
}
