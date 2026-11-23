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

export type EntranceFeeResolution = {
  applied: boolean;
  fee?: any;
  reason?: "DISABLED" | "NO_TEMPLATE" | "EXISTING";
};

/** Ask Finance to resolve the correct entrance fee (template, cohort, duplicates). */
export async function resolveEntranceFee(data: {
  schoolId: string;
  applicationId: string;
  gradeLevelId: string;
  classroomId?: string | null;
  divisionId?: string | null;
  cohort?: string | null;
}): Promise<EntranceFeeResolution> {
  const res = await fetch(`${FINANCE_URL}/api/internal/entrance-fees/resolve`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      schoolId: data.schoolId,
      applicationId: data.applicationId,
      gradeLevelId: data.gradeLevelId,
      classroomId: data.classroomId || null,
      divisionId: data.divisionId || undefined,
      cohort: data.cohort || undefined,
    }),
  });
  if (!res.ok) {
    throw new Error(`Finance resolveEntranceFee failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Resolve billing through Finance first. A flat fee is only raised when the caller supplied
 * an explicit amount and Finance did not resolve/apply a fee of its own.
 */
export async function resolveOrCreateEntranceFee(data: {
  schoolId: string;
  applicationId: string;
  gradeLevelId: string;
  classroomId?: string | null;
  divisionId?: string | null;
  cohort?: string | null;
  studentId?: string | null;
  amount?: number | null;
  dueDate?: string;
}): Promise<any | null> {
  let resolution: EntranceFeeResolution | null = null;
  try {
    resolution = await resolveEntranceFee(data);
  } catch (err: any) {
    console.warn("[lifecycle] entrance fee resolution failed:", err?.message || err);
  }
  if (resolution?.applied || resolution?.reason === "EXISTING") return resolution.fee ?? null;

  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return createEntranceFee({
    schoolId: data.schoolId,
    applicationId: data.applicationId,
    studentId: data.studentId,
    amount,
    dueDate: data.dueDate,
  });
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
