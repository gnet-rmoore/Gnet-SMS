/**
 * Send transactional email through Identity's internal mail API.
 */
const IDENTITY_URL =
  process.env.IDENTITY_URL || process.env.MONOLITH_URL || "http://localhost:3011";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export type TransactionalEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendTransactionalEmail(
  input: TransactionalEmailInput
): Promise<{ ok: boolean; provider?: string }> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/mail/send`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[comms-mail] send failed:", res.status, detail.slice(0, 200));
      return { ok: false };
    }
    const data = (await res.json()) as { ok?: boolean; provider?: string };
    return { ok: data.ok !== false, provider: data.provider };
  } catch (err: any) {
    console.warn("[comms-mail] error:", err?.message || err);
    return { ok: false };
  }
}
