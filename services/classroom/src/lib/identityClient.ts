/**
 * Thin HTTP client to the Identity service.
 *
 * classroomService used `prisma.user.findUnique` to verify a user has role
 * TEACHER before assigning them as ownerTeacher/co-teacher. Classroom doesn't
 * own User, so this now calls Identity's internal API instead.
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
  role: string;
  schoolId: string | null;
  photoUrl?: string | null;
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

export function toAuthorRef(user: IdentityUserRef | null | undefined, fallbackId: string) {
  if (!user) {
    return { id: fallbackId, name: "Unknown", email: "", photoUrl: null as string | null };
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    photoUrl: user.photoUrl ?? null,
  };
}

/** Returns linked student ids for a parent (empty if none / Identity down). */
export async function getParentChildIds(parentId: string): Promise<string[]> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/parents/${parentId}/children`, {
      headers: internalHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data) ? data : data?.children || data?.students || [];
    return list.map((s: any) => s.id || s.studentId).filter(Boolean);
  } catch {
    return [];
  }
}

export async function assertParentOfStudent(parentId: string, studentId: string): Promise<boolean> {
  const ids = await getParentChildIds(parentId);
  return ids.includes(studentId);
}
