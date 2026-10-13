import { getNavSections, flattenNavSections } from "../constants/navByRole";
import { SCHOOL_ROLES, STAFF_ROLE_LABELS, type Role } from "../constants/roles";

export type RoleFeature = {
  /** Stable path key under /:slug/ (e.g. gradebook, staff-portal). */
  key: string;
  /** i18n key under nav namespace (e.g. items.dashboard). */
  labelKey: string;
  /** i18n key under nav namespace (e.g. sections.overview). */
  sectionKey: string;
};

const SLUG_PLACEHOLDER = "_school_";

/** Human labels for every school role (staff + student/parent). */
export const ALL_SCHOOL_ROLE_LABELS: Record<string, string> = {
  ...STAFF_ROLE_LABELS,
  STUDENT: "Student",
  PARENT: "Parent",
};

export function schoolRoleLabel(role: string): string {
  return ALL_SCHOOL_ROLE_LABELS[role] || role.replace(/_/g, " ");
}

/**
 * Features (sidebar destinations) a role can open — derived from live nav
 * so the Roles & Access UI stays honest with what users actually see.
 */
export function getFeaturesForRole(role: string): RoleFeature[] {
  if (!role || role === "SUPER_ADMIN") return [];
  const sections = getNavSections(role, SLUG_PLACEHOLDER);
  const out: RoleFeature[] = [];
  const seen = new Set<string>();

  for (const section of sections) {
    for (const item of section.items) {
      const parts = item.to.split("/").filter(Boolean);
      // `/_school_/dashboard` → dashboard; `/_school_/settings/academic-calendar` → settings/academic-calendar
      const key = parts[0] === SLUG_PLACEHOLDER ? parts.slice(1).join("/") : parts.join("/");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ key, labelKey: item.labelKey, sectionKey: section.labelKey });
    }
  }
  return out;
}

export function getFeatureCount(role: string): number {
  return getFeaturesForRole(role).length;
}

/** Roles School Admin may assign (mirrors Identity `SCHOOL_ASSIGNABLE_ROLES`). */
export const ASSIGNABLE_SCHOOL_ROLES: readonly string[] = SCHOOL_ROLES;

export function isAssignableSchoolRole(role: string): boolean {
  return ASSIGNABLE_SCHOOL_ROLES.includes(role as Role);
}

export type RoleCatalogEntry = {
  role: string;
  label: string;
  featureCount: number;
  features: RoleFeature[];
};

export function buildRoleCatalog(): RoleCatalogEntry[] {
  return ASSIGNABLE_SCHOOL_ROLES.map((role) => {
    const features = getFeaturesForRole(role);
    return {
      role,
      label: schoolRoleLabel(role),
      featureCount: features.length,
      features,
    };
  }).sort((a, b) => a.label.localeCompare(b.label));
}

/** Flattened nav item count helper (tests / debug). */
export function countNavItems(role: string): number {
  return flattenNavSections(getNavSections(role, SLUG_PLACEHOLDER)).length;
}
