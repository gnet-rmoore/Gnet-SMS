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
  isActive?: boolean;
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

export async function getIdentityUsersByRolesPage(
  schoolId: string,
  roles: string[],
  paging: { limit: number; offset: number }
): Promise<IdentityUserRef[]> {
  const cleaned = [...new Set(roles.map((r) => String(r || "").trim()).filter(Boolean))];
  if (!schoolId || cleaned.length === 0) return [];

  const qs = new URLSearchParams({
    roles: cleaned.join(","),
    limit: String(paging.limit),
    offset: String(paging.offset),
  });
  const res = await fetch(
    `${IDENTITY_URL}/api/internal/schools/${schoolId}/users?${qs}`,
    { headers: internalHeaders() }
  );
  if (!res.ok) {
    throw Object.assign(new Error(`Identity user lookup failed (${res.status})`), {
      status: res.status >= 500 ? 502 : res.status,
    });
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Identity returned an invalid user list");
  }
  return data as IdentityUserRef[];
}

export async function getIdentityUsersByRolesAll(
  schoolId: string,
  roles: string[],
  pageSize = 500
): Promise<IdentityUserRef[]> {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 500) {
    throw new Error("Identity user page size must be between 1 and 500");
  }

  const users: IdentityUserRef[] = [];
  let offset = 0;
  while (true) {
    const page = await getIdentityUsersByRolesPage(schoolId, roles, {
      limit: pageSize,
      offset,
    });
    users.push(...page);
    if (page.length < pageSize) return users;
    offset += page.length;
  }
}

export async function getIdentityParentsForSchoolPage(
  schoolId: string,
  paging: { limit: number; offset: number }
): Promise<IdentityUserRef[]> {
  const qs = new URLSearchParams({
    limit: String(paging.limit),
    offset: String(paging.offset),
  });
  const res = await fetch(
    `${IDENTITY_URL}/api/internal/schools/${schoolId}/parents?${qs}`,
    { headers: internalHeaders() }
  );
  if (!res.ok) {
    throw Object.assign(new Error(`Identity parent lookup failed (${res.status})`), {
      status: res.status >= 500 ? 502 : res.status,
    });
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Identity returned an invalid parent list");
  }
  return data as IdentityUserRef[];
}

export async function getIdentityParentsForSchoolAll(
  schoolId: string,
  pageSize = 500
): Promise<IdentityUserRef[]> {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 500) {
    throw new Error("Identity parent page size must be between 1 and 500");
  }

  const parents: IdentityUserRef[] = [];
  let offset = 0;
  while (true) {
    const page = await getIdentityParentsForSchoolPage(schoolId, {
      limit: pageSize,
      offset,
    });
    parents.push(...page);
    if (page.length < pageSize) return parents;
    offset += page.length;
  }
}

export async function getIdentityParentForSchool(
  schoolId: string,
  parentId: string
): Promise<IdentityUserRef | null> {
  const res = await fetch(
    `${IDENTITY_URL}/api/internal/schools/${schoolId}/parents/${parentId}`,
    { headers: internalHeaders() }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw Object.assign(new Error(`Identity parent lookup failed (${res.status})`), {
      status: res.status >= 500 ? 502 : res.status,
    });
  }
  const parent = await res.json();
  if (!parent || typeof parent.id !== "string" || parent.role !== "PARENT") {
    throw new Error("Identity returned an invalid parent");
  }
  return parent as IdentityUserRef;
}
