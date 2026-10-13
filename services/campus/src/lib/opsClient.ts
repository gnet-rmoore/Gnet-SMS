const OPS_URL = process.env.OPS_URL || "http://localhost:3012";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) h["x-internal-token"] = INTERNAL_TOKEN;
  return h;
}

export type FamilyTransportSummary = {
  routeName: string;
  status: string;
  assignedStop: { name: string; pickupTime: string | null } | null;
  stops: { name: string; pickupTime: string | null; sortOrder: number }[];
  vehicle: { plateNumber: string; model: string } | null;
} | null;

export async function getStudentTransportSummary(
  schoolId: string,
  studentId: string
): Promise<FamilyTransportSummary> {
  try {
    const res = await fetch(
      `${OPS_URL}/api/internal/schools/${schoolId}/students/${studentId}/transport-summary`,
      { headers: headers() }
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = await res.json();
    return data?.transport ?? data ?? null;
  } catch {
    return null;
  }
}
