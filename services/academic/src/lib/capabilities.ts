/**
 * Capability checks for school-customized role permissions.
 * Prefer JWT `capabilities` when present; otherwise fall back to legacy role lists
 * and optionally resolve via Identity internal API.
 */
const IDENTITY_URL = process.env.IDENTITY_URL || process.env.MONOLITH_URL || "http://localhost:3011";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export type CapabilityActor = {
  id?: string;
  role: string;
  schoolId?: string | null;
  capabilities?: string[];
};

export async function actorHasCapability(
  actor: CapabilityActor,
  capabilityKey: string,
  legacyRoles: readonly string[]
): Promise<boolean> {
  if (actor.role === "SUPER_ADMIN") return true;
  if (Array.isArray(actor.capabilities)) {
    return actor.capabilities.includes(capabilityKey);
  }
  if (legacyRoles.includes(actor.role)) return true;

  if (actor.schoolId && actor.role) {
    try {
      const qs = new URLSearchParams({
        schoolId: String(actor.schoolId),
        role: actor.role,
      });
      const res = await fetch(`${IDENTITY_URL}/api/internal/capabilities?${qs}`, {
        headers: internalHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.capabilities) && data.capabilities.includes(capabilityKey);
      }
    } catch {
      /* fall through */
    }
  }
  return false;
}
