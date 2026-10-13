const ACADEMIC_URL = process.env.ACADEMIC_URL || "http://localhost:3015";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) h["x-internal-token"] = INTERNAL_TOKEN;
  return h;
}

export type InstructionalDay = {
  date: string;
  instructional: boolean;
  reason?: string | null;
  title?: string | null;
};

export async function getInstructionalDays(
  schoolId: string,
  from: string,
  to: string
): Promise<InstructionalDay[]> {
  try {
    const qs = new URLSearchParams({ from, to });
    const res = await fetch(
      `${ACADEMIC_URL}/api/internal/schools/${schoolId}/instructional-days?${qs}`,
      { headers: headers() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.days) ? data.days : Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
