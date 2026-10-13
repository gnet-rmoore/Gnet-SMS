const IDENTITY_URL = process.env.IDENTITY_URL || "http://localhost:3011";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export type SchoolQuotas = {
  maxStudents: number | null;
  maxStaff: number | null;
  maxStorageMb: number | null;
};

export async function getSchoolQuotas(schoolId: string): Promise<SchoolQuotas | null> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/schools/${schoolId}/quotas`, {
      headers: internalHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function bytesFromFileUrl(fileUrl: string): number {
  const raw = String(fileUrl || "").trim();
  if (!raw.startsWith("data:")) return 0;
  const comma = raw.indexOf(",");
  if (comma < 0) return 0;
  const base64 = raw.slice(comma + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}
