const LIFECYCLE_URL = process.env.LIFECYCLE_URL || "http://localhost:3010";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

export async function notifyFeePaid(opts: {
  feeId: string;
  applicationId?: string | null;
}) {
  if (!opts.applicationId) return;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
    const res = await fetch(`${LIFECYCLE_URL}/api/internal/applications/fee-paid`, {
      method: "POST",
      headers,
      body: JSON.stringify(opts),
    });
    if (!res.ok) {
      console.warn("[finance] lifecycle fee-paid notify failed:", res.status, await res.text());
    }
  } catch (err: any) {
    console.warn("[finance] lifecycle fee-paid notify error:", err.message);
  }
}
