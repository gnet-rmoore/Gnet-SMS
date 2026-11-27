import { resolveOrganizationType } from "./organizationTypes";

export function autoProvisionTeacherId(
  storedOrganizationType: string | null | undefined,
  ownerTeacherId: string | null | undefined,
  subjectOwnerIds: Array<string | null | undefined>
): string | null {
  const orgType = resolveOrganizationType(storedOrganizationType, ownerTeacherId, subjectOwnerIds);
  return orgType === "DEPARTMENTALIZED" ? null : ownerTeacherId || null;
}

export function requiresDistinctSpecialist(
  storedOrganizationType: string | null | undefined,
  ownerTeacherId: string | null | undefined,
  subjectOwnerIds: Array<string | null | undefined>
): boolean {
  return (
    resolveOrganizationType(storedOrganizationType, ownerTeacherId, subjectOwnerIds) ===
    "DEPARTMENTALIZED"
  );
}
