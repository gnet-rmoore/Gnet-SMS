/**
 * Thin HTTP client to the Identity service.
 *
 * Enrollment (AdmissionApplication.status -> ENROLLED) used to create User /
 * ParentStudent rows directly in the monolith (see src/server/services/admissionService.ts).
 * Lifecycle does NOT own the User table, so it now calls Identity's internal API
 * instead of writing those rows itself.
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
  email: string;
  name: string;
  role: string;
  schoolId: string | null;
};

/** Find-or-create a user in Identity (idempotent by email). Used on ENROLLED transition. */
export async function findOrCreateIdentityUser(data: {
  email: string;
  name: string;
  role: string;
  schoolId: string;
  password?: string;
  mustChangePassword?: boolean;
  sendWelcomeEmail?: boolean;
  dob?: string | Date | null;
  gender?: string | null;
  address?: string | null;
  phone?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  gradeLevelId?: string | null;
  feeCohort?: string | null;
}): Promise<IdentityUserRef & { created?: boolean }> {
  const res = await fetch(`${IDENTITY_URL}/api/internal/users/find-or-create`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify({
      ...data,
      mustChangePassword: data.mustChangePassword !== false,
      sendWelcomeEmail: data.sendWelcomeEmail !== false,
    }),
  });
  if (!res.ok) {
    throw new Error(`Identity findOrCreateUser failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Create a ParentStudent link in Identity (idempotent). */
export async function linkParentStudent(parentId: string, studentId: string): Promise<void> {
  const res = await fetch(`${IDENTITY_URL}/api/internal/parent-links`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify({ parentId, studentId }),
  });
  if (!res.ok) {
    throw new Error(`Identity linkParentStudent failed: ${res.status} ${await res.text()}`);
  }
}

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

export async function getSchoolStudentTotal(schoolId: string): Promise<number> {
  try {
    const res = await fetch(
      `${IDENTITY_URL}/api/internal/schools/${schoolId}/students?page=1&pageSize=1`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    if (data && typeof data.total === "number") return data.total;
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

export async function getSchoolAdmissionPolicy(schoolId: string): Promise<{
  schoolId: string;
  status: string;
  admissionPolicy: {
    publicApplyEnabled: boolean;
    returningApplyEnabled: boolean;
    requireEntranceFee: boolean;
    requiredDocTypes: string[];
    requireClassroomOnEnroll: boolean;
    entranceFeeAmount: number;
    applyBackgroundUrl?: string;
  };
} | null> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/schools/${schoolId}/admission-policy`, {
      headers: internalHeaders(),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function verifyReturningStudent(
  schoolId: string,
  identifier: { idNumber?: string | null; email?: string | null },
  dob?: string | null
): Promise<{
  id: string;
  name: string;
  email: string;
  studentIdNumber: string | null;
  gradeLevelId: string | null;
  parentName: string | null;
  parentPhone: string | null;
  phone: string | null;
  gender: string | null;
  address: string | null;
  feeCohort: string | null;
}> {
  const res = await fetch(
    `${IDENTITY_URL}/api/internal/schools/${schoolId}/students/verify-returning`,
    {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({
        idNumber: identifier?.idNumber ?? null,
        email: identifier?.email ?? null,
        dob: dob || null,
      }),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || "Could not verify returning student"), {
      status: res.status,
      code: body.code,
    });
  }
  return res.json();
}

/** Soft-fail map of userId → user ref. */
export async function getIdentityUsersMap(
  ids: string[]
): Promise<Record<string, IdentityUserRef>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out: Record<string, IdentityUserRef> = {};
  await Promise.all(
    unique.map(async (id) => {
      const user = await getIdentityUser(id);
      if (user) out[id] = user;
    })
  );
  return out;
}

/** Child user ids linked to a parent (Identity ParentStudent). */
export async function getParentChildIds(parentId: string): Promise<string[]> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/parents/${parentId}/children`, {
      headers: internalHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .map((row: any) => row.studentId || row.student?.id || row.id)
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Parent user ids linked to a student (Identity ParentStudent). */
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
      .filter(Boolean);
  } catch {
    return [];
  }
}

export type IdentitySchoolRef = {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  trialEndsAt?: string | null;
  defaultLocale?: string;
  timezone: string;
  country?: string;
  admissionPolicy?: any;
  payrollAttendanceRules?: {
    enabled?: boolean;
    graceMinutes?: number;
    deductionPerMissingDay?: number;
    deductionPerLate?: number;
    blockNonInstructionalRollCall?: boolean;
    publishRollCallToCalendar?: boolean;
  };
};

export async function getIdentitySchool(schoolId: string): Promise<IdentitySchoolRef | null> {
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/schools/${schoolId}`, {
      headers: internalHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Assert school accepts public applications (status + policy). */
export async function assertPublicApplyAllowed(
  schoolId: string,
  applicantType: "NEW" | "RETURNING" = "NEW"
): Promise<{
  school: IdentitySchoolRef;
  policy: any;
}> {
  const school = await getIdentitySchool(schoolId);
  if (!school) {
    throw Object.assign(new Error("School not found"), { status: 404 });
  }
  if (!["ACTIVE", "TRIAL"].includes(String(school.status || ""))) {
    throw Object.assign(new Error("School is not accepting applications"), { status: 403 });
  }
  if (school.status === "TRIAL" && school.trialEndsAt) {
    const ends = new Date(String(school.trialEndsAt));
    if (!Number.isNaN(ends.getTime()) && ends.getTime() < Date.now()) {
      throw Object.assign(new Error("This school's trial has ended"), {
        status: 403,
        code: "TRIAL_EXPIRED",
      });
    }
  }
  const { parseAdmissionPolicy } = await import("../domain/admissionPolicy");
  const policy = parseAdmissionPolicy(school.admissionPolicy);
  if (!policy.publicApplyEnabled) {
    throw Object.assign(new Error("Online applications are disabled for this school"), {
      status: 403,
      code: "PUBLIC_APPLY_DISABLED",
    });
  }
  if (applicantType === "RETURNING" && !policy.returningApplyEnabled) {
    throw Object.assign(new Error("Returning student re-registration is disabled"), {
      status: 403,
      code: "RETURNING_APPLY_DISABLED",
    });
  }
  try {
    const entRes = await fetch(`${IDENTITY_URL}/api/internal/schools/${schoolId}/entitlements`, {
      headers: internalHeaders(),
    });
    if (entRes.ok) {
      const data = await entRes.json();
      const keys: string[] = Array.isArray(data?.entitlements) ? data.entitlements : [];
      if (!keys.includes("admissions")) {
        throw Object.assign(new Error("Admissions is not enabled on this school's plan"), {
          status: 403,
          code: "FEATURE_NOT_ENTITLED",
          feature: "admissions",
        });
      }
    }
  } catch (err: any) {
    if (err.code === "FEATURE_NOT_ENTITLED") throw err;
  }
  return { school, policy };
}

export async function lookupSchoolUserByEmail(
  schoolId: string,
  email: string
): Promise<IdentityUserRef | null> {
  try {
    const res = await fetch(
      `${IDENTITY_URL}/api/internal/schools/${schoolId}/users/lookup?email=${encodeURIComponent(email)}`,
      { headers: internalHeaders() }
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getUsersByRoles(
  schoolId: string,
  roles: string[]
): Promise<IdentityUserRef[]> {
  try {
    const res = await fetch(
      `${IDENTITY_URL}/api/internal/schools/${schoolId}/users?roles=${encodeURIComponent(roles.join(","))}`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
