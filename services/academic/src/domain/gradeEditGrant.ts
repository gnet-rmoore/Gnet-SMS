/**
 * Grade edit grants — CA / Incomplete time-boxed teacher overrides.
 * Pure helpers are unit-testable without DB.
 */

export const GRADE_EDIT_GRANT_SCOPES = ["CA", "INCOMPLETE", "CA_AND_INCOMPLETE"] as const;
export type GradeEditGrantScope = (typeof GRADE_EDIT_GRANT_SCOPES)[number];

export const GRADE_EDIT_GRANTOR_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"] as const;

/** Default grant length and hard maximum (days). */
export const GRANT_DEFAULT_DAYS = 14;
export const GRANT_MAX_DAYS = 30;

const CA_TYPE_ALIASES = new Set([
  "CA",
  "C.A",
  "C.A.",
  "CONTINUOUS",
  "CONTINUOUS_ASSESSMENT",
  "CONTINUOUSASSESSMENT",
  "CASS",
]);

const CA_CODE_ALIASES = new Set(["CA", "C.A", "C.A.", "CASS", "CONT", "CONTINUOUS"]);

export function isGradeEditGrantScope(value: string | null | undefined): value is GradeEditGrantScope {
  return Boolean(value && (GRADE_EDIT_GRANT_SCOPES as readonly string[]).includes(value));
}

export function isGrantorRole(role: string | null | undefined): boolean {
  return Boolean(role && (GRADE_EDIT_GRANTOR_ROLES as readonly string[]).includes(role));
}

export function normalizeCaToken(raw: string | null | undefined): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

/** True when ExamComponent is Continuous Assessment (type or shortCode aliases). */
export function isContinuousAssessmentComponent(comp: {
  componentType?: string | null;
  shortCode?: string | null;
  label?: string | null;
}): boolean {
  const type = normalizeCaToken(comp.componentType);
  const code = normalizeCaToken(comp.shortCode);
  if (CA_TYPE_ALIASES.has(type) || type === "CA") return true;
  if (CA_CODE_ALIASES.has(code)) return true;
  // Liberian / free-text labels
  const label = normalizeCaToken(comp.label).replace(/_/g, " ");
  if (label.includes("CONTINUOUS") && label.includes("ASSESS")) return true;
  if (label === "CA" || label.startsWith("CA ")) return true;
  return false;
}

export function scopeCoversCa(scope: GradeEditGrantScope): boolean {
  return scope === "CA" || scope === "CA_AND_INCOMPLETE";
}

export function scopeCoversIncomplete(scope: GradeEditGrantScope): boolean {
  return scope === "INCOMPLETE" || scope === "CA_AND_INCOMPLETE";
}

export type GrantMatchContext = {
  classId: string;
  subjectId?: string | null;
  academicPeriodId?: string | null;
  examComponentId?: string | null;
  /** Whether the write targets a CA component */
  isCaComponent: boolean;
  /** Whether the existing/target entry is Incomplete (or request sets Incomplete) */
  isIncompleteTarget: boolean;
};

export type GrantRowLike = {
  id: string;
  scope: string;
  classId?: string | null;
  subjectId?: string | null;
  academicPeriodId?: string | null;
  examComponentId?: string | null;
  startsAt: Date | string;
  expiresAt: Date | string;
  revokedAt?: Date | string | null;
};

export function isGrantActive(grant: GrantRowLike, now = new Date()): boolean {
  if (grant.revokedAt) return false;
  const start = new Date(grant.startsAt).getTime();
  const end = new Date(grant.expiresAt).getTime();
  const t = now.getTime();
  return t >= start && t <= end;
}

export function grantMatchesContext(grant: GrantRowLike, ctx: GrantMatchContext, now = new Date()): boolean {
  if (!isGrantActive(grant, now)) return false;
  if (!isGradeEditGrantScope(grant.scope)) return false;

  if (grant.classId && grant.classId !== ctx.classId) return false;
  if (grant.subjectId && grant.subjectId !== ctx.subjectId) return false;
  if (grant.academicPeriodId && grant.academicPeriodId !== ctx.academicPeriodId) return false;
  if (grant.examComponentId && grant.examComponentId !== ctx.examComponentId) return false;

  const caOk = scopeCoversCa(grant.scope) && ctx.isCaComponent;
  const incOk = scopeCoversIncomplete(grant.scope) && ctx.isIncompleteTarget;
  return caOk || incOk;
}

export function findMatchingGrant(
  grants: GrantRowLike[],
  ctx: GrantMatchContext,
  now = new Date()
): GrantRowLike | null {
  for (const g of grants) {
    if (grantMatchesContext(g, ctx, now)) return g;
  }
  return null;
}

export function clampGrantExpiry(startsAt: Date, expiresAt: Date): Date {
  const maxMs = GRANT_MAX_DAYS * 86400000;
  const maxEnd = new Date(startsAt.getTime() + maxMs);
  if (expiresAt.getTime() > maxEnd.getTime()) return maxEnd;
  if (expiresAt.getTime() <= startsAt.getTime()) {
    return new Date(startsAt.getTime() + GRANT_DEFAULT_DAYS * 86400000);
  }
  return expiresAt;
}

export function defaultExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + GRANT_DEFAULT_DAYS * 86400000);
}
