/**
 * Internal service-to-service clients used to enrich school dashboard stats.
 * Each call is fail-soft: callers catch and fall back to `null` counts so a
 * slow/down sibling service never breaks the stats endpoint.
 */

const CLASSROOM_URL = process.env.CLASSROOM_URL || "http://localhost:3014";
const ACADEMIC_URL = process.env.ACADEMIC_URL || "http://localhost:3015";
const LIFECYCLE_URL = process.env.LIFECYCLE_URL || "http://localhost:3010";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export async function fetchClassroomCount(schoolId: string): Promise<number> {
  const res = await fetch(
    `${CLASSROOM_URL}/api/internal/classrooms/count?schoolId=${encodeURIComponent(schoolId)}`,
    { headers: internalHeaders() }
  );
  if (!res.ok) throw new Error(`Classroom count failed: ${res.status}`);
  const data = await res.json();
  return Number(data?.count) || 0;
}

export async function fetchExamCount(schoolId: string): Promise<number> {
  const res = await fetch(
    `${ACADEMIC_URL}/api/internal/schools/${encodeURIComponent(schoolId)}/stats`,
    { headers: internalHeaders() }
  );
  if (!res.ok) throw new Error(`Academic stats failed: ${res.status}`);
  const data = await res.json();
  return Number(data?.totalExams) || 0;
}

export async function fetchAdmissionStats(
  schoolId: string
): Promise<{ totalApplications: number; pendingApplications: number }> {
  const res = await fetch(
    `${LIFECYCLE_URL}/api/internal/schools/${encodeURIComponent(schoolId)}/admission-stats`,
    { headers: internalHeaders() }
  );
  if (!res.ok) throw new Error(`Admission stats failed: ${res.status}`);
  const data = await res.json();
  return {
    totalApplications: Number(data?.totalApplications) || 0,
    pendingApplications: Number(data?.pendingApplications) || 0,
  };
}
