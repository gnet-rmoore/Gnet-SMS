/** Fire-and-forget in-app notification create via Comms internal API. */

const COMMS_URL = process.env.COMMS_URL || "http://localhost:3017";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) h["x-internal-token"] = INTERNAL_TOKEN;
  return h;
}

export type NotifyInAppInput = {
  schoolId: string;
  userId: string;
  eventKey: string;
  title: string;
  body: string;
  href?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function notifyInApp(input: NotifyInAppInput): Promise<void> {
  try {
    const res = await fetch(`${COMMS_URL}/api/internal/notifications`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      console.warn(
        "[academic notifyInApp] failed:",
        res.status,
        await res.text().catch(() => "")
      );
    }
  } catch (err: any) {
    console.warn("[academic notifyInApp] error:", err?.message || err);
  }
}

export async function notifyInAppMany(inputs: NotifyInAppInput[]): Promise<void> {
  if (!inputs.length) return;
  try {
    const res = await fetch(`${COMMS_URL}/api/internal/notifications`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({ notifications: inputs }),
    });
    if (!res.ok) {
      console.warn(
        "[academic notifyInAppMany] failed:",
        res.status,
        await res.text().catch(() => "")
      );
    }
  } catch (err: any) {
    console.warn("[academic notifyInAppMany] error:", err?.message || err);
  }
}
