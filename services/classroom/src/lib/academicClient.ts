/**
 * Thin HTTP client to the Academic service for subject offerings / catalog names.
 */
const ACADEMIC_URL = process.env.ACADEMIC_URL || process.env.MONOLITH_URL || "http://localhost:3015";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export type SubjectRef = { id: string; name: string; code?: string };
export type GradeLevelRef = { id: string; name: string };
export type SubjectOfferingRef = {
  id: string;
  subjectId: string;
  gradeLevelId: string;
  subject?: SubjectRef;
  gradeLevel?: GradeLevelRef;
};

export async function fetchSubjectOfferings(
  schoolId: string,
  gradeLevelId?: string
): Promise<SubjectOfferingRef[]> {
  const qs = new URLSearchParams();
  if (gradeLevelId) qs.set("gradeLevelId", gradeLevelId);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await fetch(
    `${ACADEMIC_URL}/api/internal/schools/${encodeURIComponent(schoolId)}/subject-offerings${suffix}`,
    { headers: internalHeaders() }
  );
  if (!res.ok) {
    console.error(`fetchSubjectOfferings failed: ${res.status} ${await res.text()}`);
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
