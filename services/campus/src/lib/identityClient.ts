const IDENTITY_URL = process.env.IDENTITY_URL || "http://localhost:3011";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) h["x-internal-token"] = INTERNAL_TOKEN;
  return h;
}

export type IdentityUserRef = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

export async function getIdentityStudents(schoolId: string): Promise<IdentityUserRef[]> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/schools/${schoolId}/users?roles=STUDENT`, {
      headers: headers(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getIdentityStaff(schoolId: string): Promise<IdentityUserRef[]> {
  try {
    const res = await fetch(
      `${IDENTITY_URL}/api/internal/schools/${schoolId}/users?roles=TRANSPORTATION,MAINTENANCE,LIBRARIAN,NURSE,COUNSELOR,ATHLETICS_DIRECTOR,HOSTEL_WARDEN,CAFETERIA_MANAGER,TEACHER,SCHOOL_ADMIN,PRINCIPAL`,
      { headers: headers() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function nameMap(users: IdentityUserRef[]): Map<string, string> {
  return new Map(users.map((u) => [u.id, u.name || u.email || u.id]));
}

export async function assertParentLinked(parentId: string, studentId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${IDENTITY_URL}/api/internal/parents/${encodeURIComponent(parentId)}/students/${encodeURIComponent(studentId)}/assert-link`,
      { headers: headers() }
    );
    return res.status === 204;
  } catch {
    return false;
  }
}

export type ParentChildRef = { id: string; name: string; photoUrl?: string | null };

export async function getParentChildren(parentId: string): Promise<ParentChildRef[]> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/parents/${parentId}/children`, {
      headers: headers(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((c: any) => ({
      id: c.id || c.studentId,
      name: c.name || c.email || c.id,
      photoUrl: c.photoUrl ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getIdentityStudentName(
  schoolId: string,
  studentId: string
): Promise<string | null> {
  const students = await getIdentityStudents(schoolId);
  return nameMap(students).get(studentId) ?? null;
}
