const CLASSROOM_URL = process.env.CLASSROOM_URL || "http://localhost:3014";
const ACADEMIC_URL = process.env.ACADEMIC_URL || "http://localhost:3015";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) h["x-internal-token"] = INTERNAL_TOKEN;
  return h;
}

export async function listSchoolClassrooms(schoolId: string): Promise<ClassroomRef[]> {
  try {
    const res = await fetch(`${CLASSROOM_URL}/api/internal/schools/${schoolId}/classrooms`, {
      headers: headers(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as ClassroomRef[]) : [];
  } catch {
    return [];
  }
}

export async function listClassroomMembers(
  classroomId: string
): Promise<Array<{ userId: string; role: string }>> {
  try {
    const res = await fetch(`${CLASSROOM_URL}/api/internal/classrooms/${classroomId}/members`, {
      headers: headers(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Student userIds placed in at least one homeroom (non-subject) class group. */
export async function getHomeroomPlacedStudentIds(schoolId: string): Promise<Set<string>> {
  const classrooms = await listSchoolClassrooms(schoolId);
  const homerooms = classrooms.filter((c) => !c.subjectId);
  const placed = new Set<string>();
  await Promise.all(
    homerooms.map(async (room) => {
      const members = await listClassroomMembers(room.id);
      for (const m of members) {
        if (m.role === "STUDENT" && m.userId) placed.add(m.userId);
      }
    })
  );
  return placed;
}

export async function addClassroomMember(classroomId: string, userId: string, role = "STUDENT") {
  const res = await fetch(`${CLASSROOM_URL}/api/internal/classrooms/${classroomId}/members`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ userId, role }),
  });
  if (!res.ok) {
    throw new Error(`Classroom addMember failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export type ClassroomRef = {
  id: string;
  name: string;
  schoolId?: string;
  classCode?: string | null;
  ownerTeacherId?: string | null;
  gradeLevelId?: string | null;
  subjectId?: string | null;
};

export async function getTeacherClassrooms(
  userId: string,
  schoolId: string
): Promise<ClassroomRef[]> {
  const query = new URLSearchParams({
    userId,
    schoolId,
    roles: "TEACHER,CO_TEACHER",
  });
  const res = await fetch(`${CLASSROOM_URL}/api/internal/classrooms?${query}`, {
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load teacher classroom scope: ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Classroom service returned an invalid teacher scope");
  }
  return data as ClassroomRef[];
}

export async function fetchGradeLevelsForSchool(
  schoolId: string
): Promise<Array<{ id: string; name: string }>> {
  try {
    const res = await fetch(`${ACADEMIC_URL}/api/internal/schools/${schoolId}/grade-levels`, {
      headers: headers(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object" && Array.isArray((data as { items?: unknown[] }).items)
        ? (data as { items: unknown[] }).items
        : (data as { gradeLevels?: unknown[] })?.gradeLevels || [];
    return list
      .map((row) => ({
        id: String((row as { id?: string }).id || ""),
        name: String((row as { name?: string }).name || ""),
      }))
      .filter((row) => row.id && row.name);
  } catch {
    return [];
  }
}

export type NextGradeResolution = {
  gradeLevelId: string | null;
  locked: boolean;
  outcome: string;
  allowReturn?: boolean;
};

/** Resolve a returning student's promotion-aware next grade via the Academic service. */
export async function resolveStudentNextGrade(
  schoolId: string,
  studentUserId: string,
  currentGradeLevelId?: string | null
): Promise<NextGradeResolution | null> {
  try {
    const query = currentGradeLevelId
      ? `?gradeLevelId=${encodeURIComponent(currentGradeLevelId)}`
      : "";
    const res = await fetch(
      `${ACADEMIC_URL}/api/internal/schools/${schoolId}/promotion/students/${studentUserId}/next-grade${query}`,
      { headers: headers() }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<NextGradeResolution> | null;
    if (!data) return null;
    return {
      gradeLevelId: data.gradeLevelId ?? null,
      locked: Boolean(data.locked),
      outcome: String(data.outcome || "UNKNOWN"),
      allowReturn: data.allowReturn !== false,
    };
  } catch {
    return null;
  }
}

export async function getClassroomById(id: string): Promise<ClassroomRef | null> {
  try {
    const res = await fetch(`${CLASSROOM_URL}/api/internal/classrooms/${id}`, {
      headers: headers(),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** True if user is owner or TEACHER/CO_TEACHER member of the classroom. */
export async function assertClassroomTeacherAccess(
  classroomId: string,
  userId: string
): Promise<boolean> {
  const classroom = await getClassroomById(classroomId);
  if (!classroom) return false;
  if (classroom.ownerTeacherId === userId) return true;
  try {
    const res = await fetch(
      `${CLASSROOM_URL}/api/internal/classrooms/${classroomId}/members`,
      { headers: headers() }
    );
    if (!res.ok) return false;
    const members = (await res.json()) as Array<{ userId: string; role: string }>;
    return members.some(
      (m) => m.userId === userId && ["TEACHER", "CO_TEACHER"].includes(m.role)
    );
  } catch {
    return false;
  }
}

export async function getClassroomsMap(
  ids: string[]
): Promise<Record<string, ClassroomRef>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out: Record<string, ClassroomRef> = {};
  await Promise.all(
    unique.map(async (id) => {
      const classroom = await getClassroomById(id);
      if (classroom) out[id] = classroom;
    })
  );
  return out;
}

export async function checkInstructionalDay(
  schoolId: string,
  date: string
): Promise<{ instructional: boolean; reason?: string | null; title?: string | null } | null> {
  try {
    const res = await fetch(
      `${ACADEMIC_URL}/api/internal/schools/${schoolId}/instructional-day?date=${encodeURIComponent(date)}`,
      { headers: headers() }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function upsertAttendanceCalendarEvent(payload: {
  schoolId: string;
  attendanceId: string;
  classroomName: string;
  date: string;
  presentCount: number;
  absentCount: number;
  createdById?: string;
}): Promise<void> {
  try {
    const res = await fetch(
      `${ACADEMIC_URL}/api/internal/schools/${payload.schoolId}/calendar/attendance-event`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      console.warn(
        "[lifecycle] upsertAttendanceCalendarEvent failed:",
        res.status,
        await res.text().catch(() => "")
      );
    }
  } catch (err: any) {
    console.warn("[lifecycle] upsertAttendanceCalendarEvent error:", err?.message || err);
  }
}
