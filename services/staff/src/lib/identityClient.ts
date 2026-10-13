const IDENTITY_URL = process.env.IDENTITY_URL || "http://localhost:3011";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) h["x-internal-token"] = INTERNAL_TOKEN;
  return h;
}

export type SchoolRef = {
  id: string;
  timezone?: string;
  payrollAttendanceRules?: {
    enabled?: boolean;
    graceMinutes?: number;
    deductionPerMissingDay?: number;
    deductionPerLate?: number;
  };
};

export type IdentityUserRef = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

export async function getIdentitySchool(schoolId: string): Promise<SchoolRef | null> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/schools/${schoolId}`, {
      headers: headers(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
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
      { headers: headers() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getIdentityUser(id: string): Promise<IdentityUserRef | null> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/users/${id}`, {
      headers: headers(),
    });
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
