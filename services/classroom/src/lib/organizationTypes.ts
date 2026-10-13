/** Class-group instructional organization (homerooms only; subjectId null). */
export const ORGANIZATION_TYPES = ["SELF_CONTAINED", "DEPARTMENTALIZED", "MIXED"] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

/** Member roles that teach / assist in a classroom (not students). */
export const CLASSROOM_STAFF_ROLES = ["TEACHER", "CO_TEACHER", "ASSISTANT"] as const;

export function isOrganizationType(value: unknown): value is OrganizationType {
  return typeof value === "string" && (ORGANIZATION_TYPES as readonly string[]).includes(value);
}

export function normalizeOrganizationType(
  value: unknown,
  fallback: OrganizationType | null = null
): OrganizationType | null {
  if (isOrganizationType(value)) return value;
  return fallback;
}

/**
 * Infer organization from staffing when the field was never set.
 * Empty subject rooms → SELF_CONTAINED (homeroom-first setup).
 */
export function inferOrganizationType(
  ownerTeacherId: string | null | undefined,
  subjectOwnerIds: Array<string | null | undefined>
): OrganizationType {
  const owners = subjectOwnerIds.filter((id): id is string => Boolean(id));
  if (owners.length === 0) return "SELF_CONTAINED";
  const primary = ownerTeacherId || "";
  const allPrimary = owners.every((id) => id === primary);
  if (allPrimary) return "SELF_CONTAINED";
  const nonePrimary = primary ? owners.every((id) => id !== primary) : true;
  if (nonePrimary) return "DEPARTMENTALIZED";
  return "MIXED";
}

export function resolveOrganizationType(
  stored: string | null | undefined,
  ownerTeacherId: string | null | undefined,
  subjectOwnerIds: Array<string | null | undefined>
): OrganizationType {
  if (isOrganizationType(stored)) return stored;
  return inferOrganizationType(ownerTeacherId, subjectOwnerIds);
}
