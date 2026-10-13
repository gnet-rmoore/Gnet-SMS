/**
 * Thin HTTP client to Identity for uploader name enrichment + role fan-out.
 */
const IDENTITY_URL =
  process.env.IDENTITY_URL || process.env.MONOLITH_URL || "http://localhost:3011";
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
  schoolId?: string | null;
};

export type IdentitySchoolRef = {
  id: string;
  name?: string;
  slug?: string;
};

export async function getIdentitySchool(
  schoolId: string
): Promise<IdentitySchoolRef | null> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/schools/${schoolId}`, {
      headers: internalHeaders(),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as IdentitySchoolRef;
  } catch {
    return null;
  }
}

export async function getIdentityUser(id: string): Promise<IdentityUserRef | null> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/users/${id}`, {
      headers: internalHeaders(),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as IdentityUserRef;
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
