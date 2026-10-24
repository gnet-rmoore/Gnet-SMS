/**
 * Optional starter pack after school provision (Phase A3).
 * Best-effort: failures are logged, provisioning still succeeds.
 * NOTE: This is NOT auto-invoked by default. Only call explicitly when user requests.
 */
const ACADEMIC_URL = process.env.ACADEMIC_URL || "http://localhost:3015";
const FINANCE_URL = process.env.FINANCE_URL || "http://localhost:3016";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) h["x-internal-token"] = INTERNAL_TOKEN;
  return h;
}

export async function seedStarterPack(schoolId: string) {
  // No automatic grade/class seeding; user must explicitly request seeding.
  try {
    await fetch(`${FINANCE_URL}/api/internal/fees`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        schoolId,
        studentId: `catalog:entrance:${schoolId}`,
        amount: 0,
        type: "ENTRANCE_CATALOG",
        status: "PENDING",
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      }),
    });
  } catch (err: any) {
    console.warn("[starter-pack] fee catalog seed skipped:", err.message);
  }
}
