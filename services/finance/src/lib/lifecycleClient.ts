const LIFECYCLE_URL = process.env.LIFECYCLE_URL || "http://localhost:3010";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export async function notifyFeePaid(opts: {
  feeId: string;
  applicationId?: string | null;
}): Promise<boolean> {
  if (!opts.applicationId) return false;
  const delays = [0, 250, 750, 2000];
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) await new Promise((r) => setTimeout(r, delays[attempt]));
    try {
      const res = await fetch(`${LIFECYCLE_URL}/api/internal/applications/fee-paid`, {
        method: "POST",
        headers: internalHeaders(),
        body: JSON.stringify(opts),
      });
      if (res.ok) return true;
      const body = await res.text().catch(() => "");
      console.warn(
        `[finance] lifecycle fee-paid notify failed (attempt ${attempt + 1}/${delays.length}):`,
        res.status,
        body
      );
      // 4xx (except 408/429) won't succeed on retry — stop early.
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        return false;
      }
    } catch (err: any) {
      console.warn(
        `[finance] lifecycle fee-paid notify error (attempt ${attempt + 1}/${delays.length}):`,
        err?.message || err
      );
    }
  }
  return false;
}

/**
 * Validate a public applicant's status token against Lifecycle and confirm the token's
 * application is the one linked to the given fee. Used to authorize public entrance-fee
 * checkout without exposing fee ids.
 */
export async function verifyApplicationFeeAccess(
  applicationId: string,
  token: string,
  feeId: string
): Promise<boolean> {
  if (!applicationId || !token) return false;
  try {
    const res = await fetch(
      `${LIFECYCLE_URL}/api/public/applications/${encodeURIComponent(applicationId)}/status?token=${encodeURIComponent(token)}`
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { feePaymentId?: string | null; id?: string };
    return Boolean(data && data.id === applicationId && data.feePaymentId === feeId);
  } catch (err: any) {
    console.warn("[finance] lifecycle application token verify error:", err?.message || err);
    return false;
  }
}
