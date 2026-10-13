/**
 * Thin HTTP client to Academic (divisions + grade levels) for fee eligibility.
 */
const ACADEMIC_URL =
  process.env.ACADEMIC_URL || process.env.MONOLITH_URL || "http://localhost:3015";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export type AcademicGradeLevel = {
  id: string;
  name: string;
  schoolId: string;
  divisionId?: string | null;
};

export type AcademicDivision = {
  id: string;
  name: string;
  schoolId: string;
  code?: string | null;
  sortOrder?: number;
};

export async function getGradeLevel(
  schoolId: string,
  gradeLevelId: string
): Promise<AcademicGradeLevel | null> {
  try {
    const res = await fetch(
      `${ACADEMIC_URL}/api/internal/schools/${schoolId}/grade-levels/${gradeLevelId}`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function listGradeLevels(schoolId: string): Promise<AcademicGradeLevel[]> {
  try {
    const res = await fetch(
      `${ACADEMIC_URL}/api/internal/schools/${schoolId}/grade-levels`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function getDivision(
  schoolId: string,
  divisionId: string
): Promise<AcademicDivision | null> {
  try {
    const res = await fetch(
      `${ACADEMIC_URL}/api/internal/schools/${schoolId}/divisions/${divisionId}`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function listDivisions(schoolId: string): Promise<AcademicDivision[]> {
  try {
    const res = await fetch(
      `${ACADEMIC_URL}/api/internal/schools/${schoolId}/divisions`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/** Grade level IDs belonging to a division. */
export async function gradeLevelIdsForDivision(
  schoolId: string,
  divisionId: string
): Promise<string[]> {
  const grades = await listGradeLevels(schoolId);
  return grades.filter((g) => g.divisionId === divisionId).map((g) => g.id);
}
