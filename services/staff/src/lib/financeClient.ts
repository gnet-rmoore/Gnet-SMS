/**
 * Staff → Finance internal client (payslip receipts).
 */
const FINANCE_URL = process.env.FINANCE_URL || "http://localhost:3016";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export async function issuePayslipReceipt(payload: {
  schoolId: string;
  payrollId: string;
  staffName: string;
  schoolName?: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  currency?: string;
  issuedBy?: string;
}): Promise<{ id: string; receiptNumber: string } | null> {
  try {
    const res = await fetch(`${FINANCE_URL}/api/internal/receipts/issue`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({ type: "PAYSLIP", ...payload }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[staff] issuePayslipReceipt failed:", res.status, text);
      return null;
    }
    return res.json();
  } catch (err: any) {
    console.warn("[staff] issuePayslipReceipt error:", err?.message || err);
    return null;
  }
}

/** Void issued payslip when payroll is marked unpaid (mistake correction). */
export async function voidPayslipReceipt(payload: {
  schoolId: string;
  payrollId: string;
  reason?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${FINANCE_URL}/api/internal/receipts/void-by-source`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({
        type: "PAYSLIP",
        schoolId: payload.schoolId,
        sourceId: payload.payrollId,
        payrollId: payload.payrollId,
        reason: payload.reason || "Payroll marked unpaid",
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[staff] voidPayslipReceipt failed:", res.status, text);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[staff] voidPayslipReceipt error:", err?.message || err);
    return false;
  }
}

const IDENTITY_URL = process.env.IDENTITY_URL || "http://localhost:3011";

export async function getIdentityUserName(userId: string): Promise<string> {
  try {
    const headers: Record<string, string> = {};
    if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
    const res = await fetch(`${IDENTITY_URL}/api/internal/users/${userId}`, { headers });
    if (!res.ok) return "Staff";
    const user = await res.json();
    return user?.name || "Staff";
  } catch {
    return "Staff";
  }
}

export async function getIdentitySchoolName(schoolId: string): Promise<string> {
  try {
    const headers: Record<string, string> = {};
    if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
    const res = await fetch(`${IDENTITY_URL}/api/internal/schools/${schoolId}`, { headers });
    if (!res.ok) return "School";
    const school = await res.json();
    return school?.name || "School";
  } catch {
    return "School";
  }
}
