/**
 * Thin HTTP client to the Identity service for user name/email enrichment.
 */
const IDENTITY_URL = process.env.IDENTITY_URL || process.env.MONOLITH_URL || "http://localhost:3011";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export type IdentityUserRef = {
  id: string;
  name: string;
  email: string;
  role?: string;
  photoUrl?: string | null;
};

export async function getIdentityUser(id: string): Promise<IdentityUserRef | null> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/users/${id}`, {
      headers: internalHeaders(),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getIdentityUsersByIds(
  ids: string[]
): Promise<Map<string, IdentityUserRef>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, IdentityUserRef>();
  await Promise.all(
    unique.map(async (id) => {
      const user = await getIdentityUser(id);
      if (user) map.set(id, user);
    })
  );
  return map;
}

export async function getIdentityUsersByRoles(
  schoolId: string,
  roles: string[]
): Promise<IdentityUserRef[]> {
  const cleaned = [...new Set(roles.map((r) => String(r || "").trim()).filter(Boolean))];
  if (!schoolId || cleaned.length === 0) return [];
  try {
    const qs = new URLSearchParams({ roles: cleaned.join(",") });
    const res = await fetch(
      `${IDENTITY_URL}/api/internal/schools/${schoolId}/users?${qs}`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Returns false on a missing link or unavailable Identity service (fail closed). */
export async function assertParentLinked(parentId: string, studentId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${IDENTITY_URL}/api/internal/parents/${encodeURIComponent(parentId)}/students/${encodeURIComponent(studentId)}/assert-link`,
      { headers: internalHeaders() }
    );
    return res.status === 204;
  } catch {
    return false;
  }
}

export { assertTeacherClassAccess } from "./gradeAccess";

/** Linked parent ids for a student (Identity ParentStudent join). */
export async function getStudentParentIds(studentId: string): Promise<string[]> {
  try {
    const res = await fetch(
      `${IDENTITY_URL}/api/internal/students/${encodeURIComponent(studentId)}/parents`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .map((row: any) => (typeof row === "string" ? row : row.parentId || row.id))
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

export async function getSchoolGradebookConfig(schoolId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${IDENTITY_URL}/api/internal/schools/${encodeURIComponent(schoolId)}`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return null;
    const school = await res.json();
    return typeof school?.gradebookConfig === "string" ? school.gradebookConfig : null;
  } catch {
    return null;
  }
}

export type SchoolLocality = {
  country: string | null;
  region: string | null;
  holidayEnabled: boolean;
  holidayTypes: string[] | null;
};

/** Residence locality + holiday display preferences for a school. */
export async function getSchoolLocality(schoolId: string): Promise<SchoolLocality | null> {
  try {
    const res = await fetch(
      `${IDENTITY_URL}/api/internal/schools/${encodeURIComponent(schoolId)}`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return null;
    const school = await res.json();
    const holidayTypes = Array.isArray(school?.holidayTypes)
      ? school.holidayTypes.filter((t: unknown) => typeof t === "string")
      : null;
    return {
      country: typeof school?.country === "string" ? school.country : null,
      region: typeof school?.region === "string" ? school.region : null,
      holidayEnabled: school?.holidayEnabled !== false,
      holidayTypes,
    };
  } catch {
    return null;
  }
}

/** Children linked to a parent (Identity ParentStudent join). */
export async function getParentChildren(parentId: string): Promise<{ id: string }[]> {
  try {
    const res = await fetch(
      `${IDENTITY_URL}/api/internal/parents/${encodeURIComponent(parentId)}/children`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .map((row: any) => ({ id: typeof row === "string" ? row : row.id }))
      .filter((r) => r.id);
  } catch {
    return [];
  }
}

export type IdentityStudentRef = {
  id: string;
  name?: string;
  email?: string;
  gender?: string | null;
  gradeLevelId?: string | null;
  feeCohort?: string | null;
  isActive?: boolean;
};

export async function listIdentityStudents(schoolId: string): Promise<IdentityStudentRef[]> {
  const res = await fetch(`${IDENTITY_URL}/api/internal/schools/${encodeURIComponent(schoolId)}/students`, {
    headers: internalHeaders(),
  });
  if (!res.ok) throw new Error(`Identity list students failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
}

export async function patchIdentityUserPlacement(
  userId: string,
  patch: { gradeLevelId?: string | null; feeCohort?: string | null }
): Promise<void> {
  const res = await fetch(`${IDENTITY_URL}/api/internal/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: internalHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Identity patch user failed: ${res.status} ${await res.text()}`);
  }
}
