import type { Request, Response } from "express";
import { receiptService, type ReceiptType } from "../services/receiptService";

const ISSUE_TYPES: ReceiptType[] = ["FEE_PAYMENT", "PAYSLIP", "EXPENSE", "TRANSACTION"];

/** Roles allowed to read every receipt in the school. */
const FULL_RECEIPT_ACCESS = new Set([
  "SCHOOL_ADMIN",
  "ACCOUNTANT",
  "PRINCIPAL",
  "REGISTRAR",
  "VPA",
  "IT_ADMIN",
]);

/**
 * Resolve the set of receipt `sourceId`s a non-staff caller may read.
 * `undefined` = unrestricted (staff); an array (possibly empty) = hard ownership filter.
 */
async function receiptScopeSourceIds(
  schoolId: string,
  user: any
): Promise<string[] | undefined> {
  if (!user || FULL_RECEIPT_ACCESS.has(user.role)) return undefined;
  if (user.role === "STUDENT") {
    return receiptService.getFeeReceiptSourceIds(schoolId, [user.id], user.id);
  }
  if (user.role === "PARENT") {
    const { getParentChildrenIds } = await import("../lib/identityClient");
    const children = await getParentChildrenIds(user.id);
    return receiptService.getFeeReceiptSourceIds(schoolId, children, user.id);
  }
  // Teachers & other roles have no fee receipts of their own.
  return [];
}

function mapReceipt(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    schoolId: r.schoolId,
    type: r.type,
    sourceType: r.sourceType,
    sourceId: r.sourceId,
    receiptNumber: r.receiptNumber,
    status: r.status,
    issuedAt: r.issuedAt,
    voidedAt: r.voidedAt,
    voidReason: r.voidReason,
    payeeName: r.payeeName,
    payerName: r.payerName,
    currency: r.currency,
    amount: r.amount,
    lineItems: typeof r.lineItems === "string" ? JSON.parse(r.lineItems) : r.lineItems,
    payloadHash: r.payloadHash,
    verifyCode: r.verifyCode,
    fileUrl: r.fileUrl,
    issuedBy: r.issuedBy,
    supersedesId: r.supersedesId,
  };
}

/** Simple in-memory rate limit for public verify (per IP). */
const verifyHits = new Map<string, { count: number; resetAt: number }>();
function rateLimitVerify(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const row = verifyHits.get(ip);
  if (!row || now > row.resetAt) {
    verifyHits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (row.count >= limit) return false;
  row.count += 1;
  return true;
}

export const receiptController = {
  async list(req: Request, res: Response) {
    try {
      const schoolId = req.params.schoolId;
      const sourceIds = await receiptScopeSourceIds(schoolId, (req as any).user);
      const rows = await receiptService.list(schoolId, {
        type: req.query.type as string | undefined,
        sourceId: req.query.sourceId as string | undefined,
        status: req.query.status as string | undefined,
        sourceIds,
      });
      res.json(rows.map(mapReceipt));
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list receipts" });
    }
  },

  async issue(req: Request, res: Response) {
    const user = (req as any).user;
    const schoolId = req.params.schoolId;
    const type = String(req.body?.type || "") as ReceiptType;
    const sourceId = String(req.body?.sourceId || "");
    if (!ISSUE_TYPES.includes(type) || !sourceId) {
      return res.status(400).json({ error: "type and sourceId are required" });
    }
    try {
      let receipt;
      if (type === "FEE_PAYMENT") {
        receipt = await receiptService.issueForFeePayment(sourceId, user?.id);
      } else if (type === "EXPENSE") {
        receipt = await receiptService.issueForExpense(sourceId, user?.id);
      } else if (type === "TRANSACTION") {
        const amount = Number(req.body?.amount);
        if (!Number.isFinite(amount)) {
          return res.status(400).json({ error: "amount is required for TRANSACTION" });
        }
        receipt = await receiptService.issue({
          schoolId,
          type: "TRANSACTION",
          sourceType: String(req.body?.sourceType || "Transaction"),
          sourceId,
          payeeName: String(req.body?.payeeName || "Payee"),
          payerName: String(req.body?.payerName || "Payer"),
          amount,
          currency: req.body?.currency || "USD",
          lineItems: Array.isArray(req.body?.lineItems)
            ? req.body.lineItems
            : [{ label: "Transaction", amount }],
          sourceRef: String(req.body?.sourceRef || sourceId.slice(0, 8).toUpperCase()),
          issuedBy: user?.id || null,
          title: "Transaction Receipt",
          paymentMethod: req.body?.paymentMethod ? String(req.body.paymentMethod) : null,
          paidAt: req.body?.paidAt ? new Date(req.body.paidAt) : null,
          studentName: req.body?.studentName ? String(req.body.studentName) : null,
          categoryLabel: req.body?.categoryLabel ? String(req.body.categoryLabel) : null,
          periodLabel: req.body?.periodLabel ? String(req.body.periodLabel) : null,
          balanceBefore: Number.isFinite(Number(req.body?.balanceBefore))
            ? Number(req.body.balanceBefore)
            : null,
          balanceAfter: Number.isFinite(Number(req.body?.balanceAfter))
            ? Number(req.body.balanceAfter)
            : null,
          placeOfIssue: req.body?.placeOfIssue ? String(req.body.placeOfIssue) : null,
          note: req.body?.note ? String(req.body.note) : null,
        });
      } else if (type === "PAYSLIP") {
        const receipt = await receiptService.issueForPayslip({
          schoolId,
          payrollId: sourceId,
          staffName: String(req.body?.staffName || "Staff"),
          schoolName: req.body?.schoolName,
          month: Number(req.body?.month),
          year: Number(req.body?.year),
          basicSalary: Number(req.body?.basicSalary || 0),
          allowances: Number(req.body?.allowances || 0),
          deductions: Number(req.body?.deductions || 0),
          netSalary: Number(req.body?.netSalary),
          currency: req.body?.currency,
          issuedBy: user?.id || null,
        });
        if (receipt.schoolId !== schoolId) {
          return res.status(403).json({ error: "Receipt school mismatch" });
        }
        return res.status(201).json(mapReceipt(receipt));
      } else {
        return res.status(400).json({ error: "Unsupported receipt type" });
      }
      if (receipt.schoolId !== schoolId) {
        return res.status(403).json({ error: "Receipt school mismatch" });
      }
      res.status(201).json(mapReceipt(receipt));
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to issue receipt" });
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const receipt = await receiptService.getById(req.params.id);
      if (!receipt) return res.status(404).json({ error: "Receipt not found" });
      const sourceIds = await receiptScopeSourceIds(receipt.schoolId, (req as any).user);
      if (sourceIds !== undefined && !sourceIds.includes(receipt.sourceId)) {
        return res.status(404).json({ error: "Receipt not found" });
      }
      res.json(mapReceipt(receipt));
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch receipt" });
    }
  },

  async download(req: Request, res: Response) {
    try {
      let receipt = await receiptService.getById(req.params.id);
      if (!receipt) return res.status(404).json({ error: "Receipt not found" });
      const sourceIds = await receiptScopeSourceIds(receipt.schoolId, (req as any).user);
      if (sourceIds !== undefined && !sourceIds.includes(receipt.sourceId)) {
        return res.status(404).json({ error: "Receipt not found" });
      }
      // Re-render with current template + school header (logo, address, brand color)
      // so design updates apply without void/reissue. Snapshot amounts/hash stay intact.
      try {
        receipt = await receiptService.refreshPdf(receipt.id);
      } catch (err: any) {
        console.warn("[finance] receipt PDF refresh:", err?.message || err);
      }
      const target = await receiptService.getDownloadTarget(receipt);
      if (target.kind === "redirect" && target.url) {
        return res.redirect(302, target.url);
      }
      if (target.kind === "buffer" && target.buffer) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="receipt-${receipt.receiptNumber}.pdf"`
        );
        return res.send(target.buffer);
      }
      return res.status(404).json({ error: "Receipt PDF not available" });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to download receipt" });
    }
  },

  async voidReceipt(req: Request, res: Response) {
    try {
      const receipt = await receiptService.voidReceipt(
        req.params.id,
        req.body?.reason ? String(req.body.reason) : undefined
      );
      res.json(mapReceipt(receipt));
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to void receipt" });
    }
  },

  async reissue(req: Request, res: Response) {
    const user = (req as any).user;
    try {
      const existing = await receiptService.getById(req.params.id);
      if (!existing) return res.status(404).json({ error: "Receipt not found" });
      if (existing.status === "ISSUED") {
        await receiptService.voidReceipt(existing.id, "Reissued");
      }
      let receipt;
      if (existing.type === "FEE_PAYMENT") {
        receipt = await receiptService.issueForFeePayment(existing.sourceId, user?.id, existing.id);
      } else if (existing.type === "EXPENSE") {
        receipt = await receiptService.issueForExpense(existing.sourceId, user?.id, existing.id);
      } else {
        return res.status(400).json({ error: `Reissue not supported for type ${existing.type}` });
      }
      res.status(201).json(mapReceipt(receipt));
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to reissue receipt" });
    }
  },

  async issueInternal(req: Request, res: Response) {
    try {
      const type = String(req.body?.type || "") as ReceiptType;
      if (type === "PAYSLIP") {
        const receipt = await receiptService.issueForPayslip({
          schoolId: String(req.body.schoolId),
          payrollId: String(req.body.payrollId || req.body.sourceId),
          staffName: String(req.body.staffName || "Staff"),
          schoolName: req.body.schoolName,
          month: Number(req.body.month),
          year: Number(req.body.year),
          basicSalary: Number(req.body.basicSalary || 0),
          allowances: Number(req.body.allowances || 0),
          deductions: Number(req.body.deductions || 0),
          netSalary: Number(req.body.netSalary),
          currency: req.body.currency,
          issuedBy: req.body.issuedBy || "system",
        });
        return res.status(201).json(mapReceipt(receipt));
      }
      if (type === "FEE_PAYMENT") {
        const receipt = await receiptService.issueForFeePayment(
          String(req.body.sourceId),
          req.body.issuedBy
        );
        return res.status(201).json(mapReceipt(receipt));
      }
      if (type === "EXPENSE") {
        const receipt = await receiptService.issueForExpense(
          String(req.body.sourceId),
          req.body.issuedBy
        );
        return res.status(201).json(mapReceipt(receipt));
      }
      return res.status(400).json({ error: "Unsupported internal issue type" });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to issue receipt" });
    }
  },

  async voidBySourceInternal(req: Request, res: Response) {
    try {
      const type = String(req.body?.type || "") as ReceiptType;
      const schoolId = String(req.body?.schoolId || "");
      const sourceId = String(req.body?.sourceId || req.body?.payrollId || "");
      if (!schoolId || !sourceId || !type) {
        return res.status(400).json({ error: "schoolId, type, and sourceId are required" });
      }
      const receipt = await receiptService.voidIssuedBySource(
        schoolId,
        type,
        sourceId,
        req.body?.reason ? String(req.body.reason) : undefined
      );
      if (!receipt) return res.json({ ok: true, voided: false });
      return res.json({ ok: true, voided: true, receipt: mapReceipt(receipt) });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to void receipt" });
    }
  },

  async verify(req: Request, res: Response) {
    const ip = String(req.ip || req.headers["x-forwarded-for"] || "unknown");
    if (!rateLimitVerify(ip)) {
      return res.status(429).json({ error: "Too many verification requests" });
    }
    try {
      const result = await receiptService.verify(String(req.params.code || ""));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Verification failed" });
    }
  },

  async listTemplates(_req: Request, res: Response) {
    try {
      res.json(receiptService.listTemplates());
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list receipt templates" });
    }
  },

  async preview(req: Request, res: Response) {
    try {
      const schoolId = String(req.params.schoolId || "");
      const templateId = String(req.query.templateId || req.query.template || "MINIMAL_LINE");
      const rawLogo = req.query.logoUrl ? String(req.query.logoUrl) : undefined;
      const logoUrl =
        rawLogo && !rawLogo.startsWith("data:") && rawLogo.length <= 2048 ? rawLogo : undefined;
      const previewOpts = {
        schoolName: req.query.schoolName ? String(req.query.schoolName) : undefined,
        schoolAddress: req.query.schoolAddress ? String(req.query.schoolAddress) : undefined,
        logoUrl,
        brandColor: req.query.brandColor ? String(req.query.brandColor) : undefined,
      };
      const result = await receiptService.previewDocument(schoolId, templateId, previewOpts);
      if (result.contentType === "application/pdf") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'inline; filename="receipt-preview.pdf"');
      } else {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
      }
      res.send(result.body);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to preview receipt template" });
    }
  },
};
