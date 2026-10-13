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
}>(fee: T): T & { amountPaid: number; balance: number } {
  const amountPaid = effectiveAmountPaid(fee);
  const balance = invoiceBalance(fee.amount, amountPaid, fee.status);
  return { ...fee, amountPaid, balance };
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
