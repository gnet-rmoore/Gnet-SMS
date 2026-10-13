const IDENTITY_URL =
  process.env.IDENTITY_URL || process.env.MONOLITH_URL || "http://localhost:3011";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/mail/send`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      console.warn("[academic-mail] send failed:", res.status);
      return { ok: false };
    }
    const data = (await res.json()) as { ok?: boolean };
    return { ok: data.ok !== false };
  } catch (err: any) {
    console.warn("[academic-mail] error:", err?.message || err);
    return { ok: false };
  }
}
