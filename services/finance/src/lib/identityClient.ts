/**
 * Thin HTTP client to the Identity service.
 *
 * financeService.sendReminder used `fee.student.name` via a cross-domain
 * Prisma include — Finance doesn't own User, so this calls Identity instead.
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
  schoolId?: string | null;
  gradeLevelId?: string | null;
  feeCohort?: string | null;
  role?: string;
  signatureUrl?: string | null;
};

export type IdentitySchoolRef = {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  brandColor?: string | null;
  defaultLocale?: string | null;
  receiptTemplate?: string | null;
  receiptTemplates?: unknown;
  receiptTemplatesByRole?: unknown;
  documentSignatories?: unknown;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  timezone?: string | null;
};

export async function getIdentityUser(id: string): Promise<IdentityUserRef | null> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/users/${id}`, { headers: internalHeaders() });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getIdentitySchool(id: string): Promise<IdentitySchoolRef | null> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/schools/${id}`, {
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

/** Students in a school, optionally filtered by grade / cohort. */
export async function listIdentityStudents(
  schoolId: string,
  opts?: { gradeLevelId?: string; feeCohort?: string }
): Promise<IdentityUserRef[]> {
  try {
    const q = new URLSearchParams();
    if (opts?.gradeLevelId) q.set("gradeLevelId", opts.gradeLevelId);
    if (opts?.feeCohort && opts.feeCohort !== "ALL") q.set("feeCohort", opts.feeCohort);
    const qs = q.toString();
    const res = await fetch(
      `${IDENTITY_URL}/api/internal/schools/${schoolId}/students${qs ? `?${qs}` : ""}`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : Array.isArray(rows?.items) ? rows.items : [];
  } catch {
    return [];
  }
}

/** Linked students for a parent (Identity ParentStudent join). */
export async function getParentChildrenIds(parentId: string): Promise<string[]> {
  try {
    const res = await fetch(
      `${IDENTITY_URL}/api/internal/parents/${parentId}/children`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return [];
    const children = await res.json();
    if (!Array.isArray(children)) return [];
    return children.map((c: { id?: string }) => c.id).filter(Boolean) as string[];
  } catch {
    return [];
  }
}

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
