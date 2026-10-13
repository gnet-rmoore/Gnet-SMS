/**
 * Platform SaaS checkout for school subscriptions (Identity).
 * When STRIPE_SECRET_KEY is set, uses Stripe Checkout; otherwise console/mock.
 */
import crypto from "node:crypto";

export type PlatformCheckoutSession = {
  id: string;
  url: string;
  provider: "stripe" | "console";
  schoolId: string;
  planCode: string;
  amountUsd: number;
};

const pendingSessions = new Map<
  string,
  { schoolId: string; planCode: string; amountUsd: number; createdAt: number }
>();

export function platformStripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function createPlatformCheckout(opts: {
  schoolId: string;
  planCode: string;
  amountUsd: number;
  schoolName: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}): Promise<PlatformCheckoutSession> {
  const amountUsd = Math.round(Number(opts.amountUsd) * 100) / 100;
  const amountCents = Math.round(amountUsd * 100);

  if (platformStripeEnabled() && amountCents > 0) {
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
              currency: "usd",
              unit_amount: amountCents,
              product_data: {
                name: `Gnet SMS — ${opts.planCode} (${opts.schoolName})`,
                metadata: {
                  schoolId: opts.schoolId,
                  planCode: opts.planCode,
                  kind: "platform_subscription",
                },
              },
            },
          },
        ],
        metadata: {
          schoolId: opts.schoolId,
          planCode: opts.planCode,
          kind: "platform_subscription",
          amountUsd: String(amountUsd),
        },
      });
      return {
        id: session.id,
        url: session.url || opts.successUrl,
        provider: "stripe",
        schoolId: opts.schoolId,
        planCode: opts.planCode,
        amountUsd,
      };
    } catch (err: any) {
      console.error("[platform-stripe] checkout failed, falling back to console:", err.message);
    }
  }

  const id = `pcs_test_${crypto.randomBytes(12).toString("hex")}`;
  pendingSessions.set(id, {
    schoolId: opts.schoolId,
    planCode: opts.planCode,
    amountUsd,
    createdAt: Date.now(),
  });
  const base = process.env.APP_URL?.split(",")[0]?.trim() || "http://localhost:8080";
  const returnTo = encodeURIComponent(opts.successUrl || "");
  const url = `${base}/checkout/mock?session_id=${id}&school_id=${opts.schoolId}&amount=${amountUsd}&return_to=${returnTo}&kind=platform`;
  console.log(
    JSON.stringify({
      level: "info",
      service: "identity",
      event: "platform_checkout.console",
      sessionId: id,
      schoolId: opts.schoolId,
      planCode: opts.planCode,
      amountUsd,
      url,
    })
  );
  return {
    id,
    url,
    provider: "console",
    schoolId: opts.schoolId,
    planCode: opts.planCode,
    amountUsd,
  };
}

export function resolvePlatformConsoleSession(
  sessionId: string
): { schoolId: string; planCode: string; amountUsd: number } | null {
  const row = pendingSessions.get(sessionId);
  if (!row) return null;
  pendingSessions.delete(sessionId);
  return { schoolId: row.schoolId, planCode: row.planCode, amountUsd: row.amountUsd };
}

/** Peek without consuming (for webhook/idempotent complete). */
export function peekPlatformConsoleSession(
  sessionId: string
): { schoolId: string; planCode: string; amountUsd: number } | null {
  const row = pendingSessions.get(sessionId);
  if (!row) return null;
  return { schoolId: row.schoolId, planCode: row.planCode, amountUsd: row.amountUsd };
}

export async function verifyPlatformStripeWebhook(
  rawBody: Buffer | string,
  signature: string | undefined
): Promise<{ schoolId: string; planCode: string; amountUsd?: number } | null> {
  if (!platformStripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET || !signature) return null;
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  if (event.type !== "checkout.session.completed") return null;
  const session = event.data.object as {
    metadata?: { schoolId?: string; planCode?: string; kind?: string; amountUsd?: string };
  };
  if (session.metadata?.kind !== "platform_subscription") return null;
  const schoolId = session.metadata?.schoolId;
  const planCode = session.metadata?.planCode;
  if (!schoolId || !planCode) return null;
  return {
    schoolId,
    planCode,
    amountUsd: session.metadata.amountUsd ? Number(session.metadata.amountUsd) : undefined,
  };
}
