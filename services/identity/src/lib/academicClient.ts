const ACADEMIC_URL = process.env.ACADEMIC_URL || "http://localhost:3015";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

/**
 * `GET /api/students/:studentId/grades` lived in the monolith's userController
 * but returns GradeEntry data, which Academic now owns. Identity keeps the
 * client-facing route (frontend path stays identical) and proxies to Academic.
 */
export async function fetchStudentGrades(studentId: string, authHeader?: string) {
  const res = await fetch(`${ACADEMIC_URL}/api/students/${studentId}/grades`, {
    headers: authHeader ? { authorization: authHeader } : undefined,
  });
  if (!res.ok) {
    throw new Error(`Academic service returned ${res.status}`);
  }
  return res.json();
}

/** Public apply form — list grade levels without user JWT. */
export async function fetchSchoolGradeLevelsInternal(schoolId: string) {
  const res = await fetch(`${ACADEMIC_URL}/api/internal/schools/${schoolId}/grade-levels`, {
    headers: internalHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Academic grade-levels returned ${res.status}`);
  }
  return res.json();
}
