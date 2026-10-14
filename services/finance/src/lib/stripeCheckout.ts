/**
 * Stripe checkout for entrance fees / fee installments.
 * When STRIPE_SECRET_KEY is unset, uses console/mock checkout (dev).
 */
import crypto from "node:crypto";

export type CheckoutSession = {
  id: string;
  url: string;
  provider: "stripe" | "console";
  feeId: string;
  amount: number;
};

const pendingSessions = new Map<
  string,
  { feeId: string; amount: number; createdAt: number }
>();

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function createEntranceCheckout(opts: {
  feeId: string;
  amount: number;
  currency?: string;
  applicationId?: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}): Promise<CheckoutSession> {
  const currency = (opts.currency || "usd").toLowerCase();
  const amountCents = Math.round(Number(opts.amount) * 100);
  const amount = Math.round(Number(opts.amount) * 100) / 100;

  if (stripeEnabled()) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: opts.successUrl,
        cancel_url: opts.cancelUrl,
        customer_email: opts.customerEmail || undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: amountCents,
              product_data: {
                name: "School fee payment",
                metadata: {
                  feeId: opts.feeId,
                  applicationId: opts.applicationId || "",
                  paymentAmount: String(amount),
                },
              },
            },
          },
        ],
        metadata: {
          feeId: opts.feeId,
          applicationId: opts.applicationId || "",
          paymentAmount: String(amount),
        },
      });
      return {
        id: session.id,
        url: session.url || opts.successUrl,
        provider: "stripe",
        feeId: opts.feeId,
        amount,
      };
    } catch (err: any) {
      console.error("[stripe] checkout failed, falling back to console:", err.message);
    }
  }

  const id = `cs_test_${crypto.randomBytes(12).toString("hex")}`;
  pendingSessions.set(id, { feeId: opts.feeId, amount, createdAt: Date.now() });
  const base = process.env.APP_URL?.split(",")[0]?.trim() || "http://localhost:8080";
  const returnTo = encodeURIComponent(opts.successUrl || "");
  const url = `${base}/checkout/mock?session_id=${id}&fee_id=${opts.feeId}&amount=${amount}&return_to=${returnTo}`;
  console.log(
    JSON.stringify({
      level: "info",
      service: "finance",
      event: "checkout.console",
      sessionId: id,
      feeId: opts.feeId,
      amount,
      url,
    })
  );
  return { id, url, provider: "console", feeId: opts.feeId, amount };
}

export function resolveConsoleSession(
  sessionId: string
): { feeId: string; amount: number } | null {
  const row = pendingSessions.get(sessionId);
  if (!row) return null;
  pendingSessions.delete(sessionId);
  return { feeId: row.feeId, amount: row.amount };
}

export async function verifyStripeWebhook(
  rawBody: Buffer | string,
  signature: string | undefined
): Promise<{
  feeId: string;
  applicationId?: string;
  amount?: number;
  sessionId?: string;
} | null> {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET || !signature) return null;
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  if (event.type !== "checkout.session.completed") return null;
  const session = event.data.object as any;
  const feeId = session.metadata?.feeId;
  if (!feeId) return null;
  const amountRaw = session.metadata?.paymentAmount;
  const amount = amountRaw != null ? Number(amountRaw) : undefined;
  return {
    feeId,
    applicationId: session.metadata?.applicationId,
    amount: Number.isFinite(amount) ? amount : undefined,
    // Real Stripe session id — used as the idempotency key on FeePaymentTxn.checkoutSessionId.
    sessionId: typeof session.id === "string" ? session.id : undefined,
  };
}
