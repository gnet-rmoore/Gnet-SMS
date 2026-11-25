const IDENTITY_URL =
  process.env.IDENTITY_URL || process.env.MONOLITH_URL || "http://localhost:3011";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

export type IdentityUserRef = {
  id: string;
  role: string;
  schoolId: string | null;
  isActive: boolean;
};

function internalHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export async function getIdentityUser(id: string): Promise<IdentityUserRef | null> {
  const response = await fetch(
    `${IDENTITY_URL}/api/internal/users/${encodeURIComponent(id)}`,
    { headers: internalHeaders() }
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw Object.assign(new Error(`Identity user lookup failed (${response.status})`), {
      status: response.status >= 500 ? 502 : response.status,
    });
  }

  const user = await response.json();
  if (
    !user ||
    typeof user.id !== "string" ||
    typeof user.role !== "string" ||
    typeof user.isActive !== "boolean" ||
    (user.schoolId !== null && typeof user.schoolId !== "string")
  ) {
    throw new Error("Identity returned an invalid user");
  }
  return user as IdentityUserRef;
}
