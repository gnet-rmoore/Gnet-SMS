/**
 * Thin HTTP client to the Classroom service.
 *
 * examService.getTeacherClassrooms / getSubmissionsSummary / getExamGrades
 * used direct Prisma access to Classroom/ClassroomMember (`prisma.classroom.
 * findMany`, `prisma.classroomMember.findMany`). Academic doesn't own those
 * models anymore, so these now call Classroom's internal API.
 */
const CLASSROOM_URL = process.env.CLASSROOM_URL || process.env.MONOLITH_URL || "http://localhost:3014";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export type ClassroomRef = {
  id: string;
  name: string;
  schoolId: string;
  subjectId: string | null;
  gradeLevelId: string | null;
  ownerTeacherId: string;
  _count?: { members: number };
};

export async function getClassroomsByMember(
  userId: string,
  roles: string[] = ["TEACHER", "CO_TEACHER"],
  schoolId?: string
): Promise<ClassroomRef[]> {
  const params = new URLSearchParams({ userId, roles: roles.join(",") });
  if (schoolId) params.set("schoolId", schoolId);
  const res = await fetch(`${CLASSROOM_URL}/api/internal/classrooms?${params}`, { headers: internalHeaders() });
  if (!res.ok) throw new Error(`Classroom getClassroomsByMember failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getClassroomById(id: string): Promise<ClassroomRef | null> {
  const res = await fetch(`${CLASSROOM_URL}/api/internal/classrooms/${id}`, { headers: internalHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Classroom getClassroomById failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getClassroomMembers(classroomId: string, role?: string): Promise<{ userId: string; role: string }[]> {
  const qs = role ? `?role=${encodeURIComponent(role)}` : "";
  const res = await fetch(`${CLASSROOM_URL}/api/internal/classrooms/${classroomId}/members${qs}`, {
    headers: internalHeaders(),
  });
  if (!res.ok) throw new Error(`Classroom getClassroomMembers failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function countClassroomsBySubjectId(subjectId: string): Promise<number> {
  const params = new URLSearchParams({ subjectId });
  const res = await fetch(`${CLASSROOM_URL}/api/internal/classrooms/count?${params}`, {
    headers: internalHeaders(),
  });
  if (!res.ok) throw new Error(`Classroom countBySubjectId failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return Number(data.count) || 0;
}

export async function countClassroomsByGradeLevelId(gradeLevelId: string): Promise<number> {
  const params = new URLSearchParams({ gradeLevelId });
  const res = await fetch(`${CLASSROOM_URL}/api/internal/classrooms/count?${params}`, {
    headers: internalHeaders(),
  });
  if (!res.ok) throw new Error(`Classroom countByGradeLevelId failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return Number(data.count) || 0;
}

export async function listClassroomsBySchool(schoolId: string): Promise<ClassroomRef[]> {
  const res = await fetch(
    `${CLASSROOM_URL}/api/internal/schools/${encodeURIComponent(schoolId)}/classrooms`,
    { headers: internalHeaders() }
  );
  if (!res.ok) throw new Error(`Classroom listBySchool failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getClassroomsOwnedByTeacher(
  schoolId: string,
  ownerTeacherId: string
): Promise<ClassroomRef[]> {
  const params = new URLSearchParams({ ownerTeacherId });
  const res = await fetch(
    `${CLASSROOM_URL}/api/internal/schools/${encodeURIComponent(schoolId)}/classrooms/owned?${params}`,
    { headers: internalHeaders() }
  );
  if (!res.ok) {
    throw new Error(
      `Classroom getClassroomsOwnedByTeacher failed: ${res.status} ${await res.text()}`
    );
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function addClassroomMember(
  classroomId: string,
  userId: string,
  role = "STUDENT"
): Promise<void> {
  const res = await fetch(`${CLASSROOM_URL}/api/internal/classrooms/${encodeURIComponent(classroomId)}/members`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify({ userId, role }),
  });
  if (!res.ok) {
    throw new Error(`Classroom addMember failed: ${res.status} ${await res.text()}`);
  }
}

export async function removeClassroomMember(classroomId: string, userId: string): Promise<void> {
  const res = await fetch(
    `${CLASSROOM_URL}/api/internal/classrooms/${encodeURIComponent(classroomId)}/members/${encodeURIComponent(userId)}`,
    { method: "DELETE", headers: internalHeaders() }
  );
  if (res.status === 404) return;
  if (!res.ok) {
    throw new Error(`Classroom removeMember failed: ${res.status} ${await res.text()}`);
  }
}

export async function provisionSubjectRoomsForOffering(
  schoolId: string,
  data: {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    gradeLevelId: string;
  }
): Promise<{ created: unknown[]; updated: unknown[]; skipped: unknown[] }> {
  const res = await fetch(
    `${CLASSROOM_URL}/api/internal/schools/${encodeURIComponent(schoolId)}/classrooms/provision-offering`,
    {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) {
    console.error(`provisionSubjectRoomsForOffering failed: ${res.status} ${await res.text()}`);
    return { created: [], updated: [], skipped: [] };
  }
  return res.json();
}

export async function createClassroomMaterialPost(opts: {
  classroomId: string;
  authorId: string;
  title: string;
  body: string;
}): Promise<{ id: string; type: string; title: string }> {
  const res = await fetch(
    `${CLASSROOM_URL}/api/internal/classrooms/${opts.classroomId}/posts`,
    {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({
        authorId: opts.authorId,
        type: "MATERIAL",
        title: opts.title,
        body: opts.body,
      }),
    }
  );
  if (!res.ok) {
    throw Object.assign(
      new Error(`Failed to create classroom material: ${await res.text()}`),
      { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
    );
  }
  return res.json();
}
