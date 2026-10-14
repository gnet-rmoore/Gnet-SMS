/** Round money to cents for comparisons and storage. */
export function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function invoiceBalance(
  amount: number,
  amountPaid: number,
  status?: string
): number {
  if (status === "VOIDED" || status === "WRITTEN_OFF" || status === "PAID") {
    return 0;
  }
  return roundMoney(Math.max(0, Number(amount) - Number(amountPaid || 0)));
}

/** Legacy PAID rows may have amountPaid=0 before backfill. */
export function effectiveAmountPaid(fee: {
  amount: number;
  amountPaid?: number | null;
  status: string;
}): number {
  const paid = Number(fee.amountPaid || 0);
  if ((fee.status === "PAID" || fee.status === "WRITTEN_OFF") && paid <= 0) {
    return roundMoney(fee.amount);
  }
  return roundMoney(paid);
}

export function statusFromBalances(
  amount: number,
  amountPaid: number,
  currentStatus?: string
): "PENDING" | "PARTIAL" | "PAID" | "VOIDED" | "WRITTEN_OFF" {
  if (currentStatus === "VOIDED") return "VOIDED";
  if (currentStatus === "WRITTEN_OFF") return "WRITTEN_OFF";
  const billed = roundMoney(amount);
  const paid = roundMoney(amountPaid);
  if (paid <= 0) return "PENDING";
  if (paid + 0.001 >= billed) return "PAID";
  return "PARTIAL";
}

export function serializeFeeInvoice<T extends {
  amount: number;
  amountPaid?: number | null;
  status: string;
}>(fee: T): T & { amountPaid: number; balance: number; receiptCount: number | null } {
  const amountPaid = effectiveAmountPaid(fee);
  const balance = invoiceBalance(fee.amount, amountPaid, fee.status);
  const anyFee = fee as any;
  const receiptCount =
    typeof anyFee.receiptCount === "number"
      ? anyFee.receiptCount
      : typeof anyFee._count?.receipts === "number"
        ? anyFee._count.receipts
        : null;
  return { ...fee, amountPaid, balance, receiptCount };
}

export type InvoiceAmounts = {
  /** Net billed amount (always present, > 0). Balance/receipt math uses this. */
  amount: number;
  /** Gross amount before discount, or null when no discount applies. */
  originalAmount: number | null;
  /** Applied percentage discount, or null when no discount applies. */
  discountPercent: number | null;
};

/**
 * Reconcile amount / originalAmount / discountPercent server-side so stored money is
 * always consistent. Accepts any subset and returns the canonical triple.
 *
 * - `discountPercent` wins when supplied (> 0): net = base * (1 - pct/100), base = originalAmount ?? amount.
 * - `amount` + `originalAmount` with no percent: percent is derived.
 * - Only `amount`: no discount.
 * - Only `originalAmount`: treated as the net (no discount known).
 */
export function computeInvoiceAmounts(input: {
  amount?: number | string | null;
  originalAmount?: number | string | null;
  discountPercent?: number | string | null;
}): InvoiceAmounts {
  const hasAmount = input.amount !== undefined && input.amount !== null && input.amount !== "";
  const hasOriginal =
    input.originalAmount !== undefined && input.originalAmount !== null && input.originalAmount !== "";
  const hasPercent =
    input.discountPercent !== undefined &&
    input.discountPercent !== null &&
    input.discountPercent !== "";

  const amount = hasAmount ? Number(input.amount) : NaN;
  const original = hasOriginal ? Number(input.originalAmount) : NaN;
  const percent = hasPercent ? Number(input.discountPercent) : NaN;

  const pct = hasPercent && Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : null;
  if (pct !== null && pct > 0) {
    const base = hasOriginal && Number.isFinite(original) ? original : amount;
    if (!Number.isFinite(base) || base <= 0) {
      throw Object.assign(new Error("A positive amount is required to apply a discount"), {
        status: 400,
        code: "FEE_DISCOUNT_BASE_REQUIRED",
      });
    }
    const net = roundMoney(base * (1 - pct / 100));
    return {
      amount: net > 0 ? net : roundMoney(base),
      originalAmount: roundMoney(base),
      discountPercent: pct,
    };
  }

  if (hasAmount && hasOriginal && Number.isFinite(amount) && Number.isFinite(original) && original > amount) {
    const derived = roundMoney((1 - amount / original) * 100);
    return { amount: roundMoney(amount), originalAmount: roundMoney(original), discountPercent: derived };
  }

  const net = hasAmount ? amount : hasOriginal ? original : NaN;
  if (!Number.isFinite(net) || net <= 0) {
    throw Object.assign(new Error("A valid positive amount is required"), {
      status: 400,
      code: "FEE_INVALID_AMOUNT",
    });
  }
  return { amount: roundMoney(net), originalAmount: null, discountPercent: null };
}

export const DEFAULT_MIN_PAYMENT = 1;

export const PAYMENT_METHODS = [
  "CASH",
  "CHECK",
  "TRANSFER",
  "CARD",
  "OTHER",
  "CHECKOUT",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function normalizePaymentMethod(raw?: string | null): PaymentMethod {
  const m = String(raw || "CASH").toUpperCase();
  if ((PAYMENT_METHODS as readonly string[]).includes(m)) return m as PaymentMethod;
  return "OTHER";
}

/** Enforce school min unless paying the full remaining balance. */
export function assertMinPaymentAmount(
  payAmount: number,
  balance: number,
  minPayment: number
): void {
  const min = roundMoney(Math.max(0, minPayment));
  const pay = roundMoney(payAmount);
  const bal = roundMoney(balance);
  if (pay + 0.001 >= bal) return; // full balance always ok
  if (min > 0 && pay + 0.001 < min) {
    throw Object.assign(
      new Error(
        `Minimum payment is $${min.toFixed(2)}. Enter at least that amount, or pay the full remaining balance ($${bal.toFixed(2)}).`
      ),
      { status: 400, code: "FEE_PAYMENT_BELOW_MINIMUM" }
    );
  }
}
