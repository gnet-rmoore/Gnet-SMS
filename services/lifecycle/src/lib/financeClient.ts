import crypto from "node:crypto";

const FINANCE_URL = process.env.FINANCE_URL || "http://localhost:3016";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) h["x-internal-token"] = INTERNAL_TOKEN;
  return h;
}

export async function createEntranceFee(data: {
  schoolId: string;
  studentId?: string | null;
  applicationId: string;
  amount: number;
  dueDate?: string;
}) {
  const res = await fetch(`${FINANCE_URL}/api/internal/fees`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      schoolId: data.schoolId,
      studentId: data.studentId || `application:${data.applicationId}`,
      applicationId: data.applicationId,
      amount: data.amount,
      type: "ENTRANCE",
      status: "PENDING",
      dueDate: data.dueDate || new Date(Date.now() + 14 * 86400000).toISOString(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Finance createEntranceFee failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function getFee(feeId: string) {
  const res = await fetch(`${FINANCE_URL}/api/internal/fees/${feeId}`, {
    headers: headers(),
  });
  if (!res.ok) return null;
  return res.json();
}

/** Relink an application-scoped (placeholder) entrance fee onto the enrolled student. */
export async function linkFeeToStudent(feeId: string, studentId: string) {
  const res = await fetch(`${FINANCE_URL}/api/internal/fees/${feeId}/link-student`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ studentId }),
  });
  if (!res.ok) {
    throw new Error(`Finance linkFeeToStudent failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Latest issued payment receipt for a fee (public status surfacing). */
export async function getFeeReceipt(feeId: string) {
  const res = await fetch(`${FINANCE_URL}/api/internal/fees/${feeId}/receipt`, {
    headers: headers(),
  });
  if (!res.ok) return null;
  return res.json();
}

export function randomPassword(): string {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
}
