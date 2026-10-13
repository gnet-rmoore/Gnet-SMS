/**
 * Thin HTTP client to the Staff service.
 *
 * financeService.getFinanceSummary used `prisma.payroll` directly for its
 * cash-flow totals — Staff owns Payroll now, so this calls its internal API.
 */
const STAFF_URL = process.env.STAFF_URL || process.env.MONOLITH_URL || "http://localhost:3013";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export type PayrollRef = { id: string; schoolId: string; status: string; netSalary: number; month: number; year: number };

export async function getPayrolls(schoolId: string): Promise<PayrollRef[]> {
  const res = await fetch(`${STAFF_URL}/api/internal/payrolls?schoolId=${encodeURIComponent(schoolId)}`, {
    headers: internalHeaders(),
  });
  if (!res.ok) throw new Error(`Staff getPayrolls failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
}
