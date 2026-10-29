/**
 * Thin HTTP client to the Finance service for per‑school financial‑status look‑ups.
 * Uses the same internal‑token pattern as identityClient / classroomClient.
 */
const FINANCE_URL = process.env.FINANCE_URL || process.env.MONOLITH_URL || "http://localhost:3016";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export async function getSchoolFinancialStatus(schoolId: string) {
  const res = await fetch(`${FINANCE_URL}/api/internal/schools/${schoolId}/financial-status`, {
    headers: internalHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Finance status fetch failed: ${res.status} ${txt}`);
  }
  return res.json() as Promise<{
    studentId: string;
    outstanding: number;
    eligible: boolean;
  }[]>;
}