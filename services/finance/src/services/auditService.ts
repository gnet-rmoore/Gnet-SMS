import prisma from "../lib/prisma";

export type ActivityEvent = {
  id: string;
  occurredAt: string;
  schoolId: string;
  actorUserId?: string;
  actorEmail?: string;
  domain: "FINANCE" | "ACADEMIC" | "STAFF" | "OPS" | "IDENTITY";
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  level?: "INFO" | "WARN";
};

const ACTION_MAP: Record<string, string> = {
  PAYMENT: "fee_payment_recorded",
  INVOICE_CREATED: "fee_invoice_created",
  VOID: "fee_invoice_voided",
  WRITE_OFF: "fee_balance_written_off",
};

function buildTxnSummary(txn: {
  kind: string;
  amount: unknown;
  method?: string | null;
  studentNameSnapshot?: string | null;
  feeTypeSnapshot?: string | null;
  balanceAfter?: unknown;
  notes?: string | null;
}): string {
  const amt = Number(txn.amount || 0).toFixed(2);
  const student = txn.studentNameSnapshot || "Student";
  const feeType = txn.feeTypeSnapshot || "Fee";
  if (txn.kind === "PAYMENT") {
    return `$${amt} ${txn.method || "payment"} for ${student} (${feeType}); balance after $${Number(txn.balanceAfter || 0).toFixed(2)}`;
  }
  if (txn.kind === "INVOICE_CREATED") {
    return `Invoice $${amt} for ${student} — ${feeType}`;
  }
  if (txn.kind === "VOID") {
    return `Invoice voided for ${student} — ${feeType}`;
  }
  if (txn.kind === "WRITE_OFF") {
    return `$${amt} written off for ${student} — ${feeType}`;
  }
  return txn.notes || `${txn.kind} $${amt}`;
}

export const auditService = {
  async listEvents(query: {
    schoolId: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
    action?: string;
  }) {
    const schoolId = String(query.schoolId || "").trim();
    if (!schoolId) {
      throw Object.assign(new Error("schoolId is required"), { status: 400 });
    }
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 50));
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const fromDate = query.from ? new Date(query.from) : defaultFrom;
    const toDate = query.to ? new Date(query.to) : now;
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw Object.assign(new Error("Invalid from/to date"), { status: 400 });
    }

    const where: any = {
      schoolId,
      paidAt: { gte: fromDate, lte: toDate },
    };
    if (query.action) {
      const kind = Object.entries(ACTION_MAP).find(([, v]) => v === query.action)?.[0];
      if (kind) where.kind = kind;
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

    const items: ActivityEvent[] = txns.map((txn) => ({
      id: `finance:txn:${txn.id}`,
      occurredAt: txn.paidAt.toISOString(),
      schoolId: txn.schoolId,
      actorUserId: txn.recordedBy || undefined,
      domain: "FINANCE",
      action: ACTION_MAP[txn.kind] || `fee_${txn.kind.toLowerCase()}`,
      summary: buildTxnSummary(txn),
      entityType: "FeePaymentTxn",
      entityId: txn.id,
      level: txn.kind === "VOID" || txn.kind === "WRITE_OFF" ? "WARN" : "INFO",
    }));

    return { items, total, page, pageSize };
  },
};
