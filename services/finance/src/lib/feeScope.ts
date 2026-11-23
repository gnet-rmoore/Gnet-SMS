/** Fee template scope + student eligibility helpers (Finance). */

export type FeeScopeMode = "SCHOOL" | "GRADE" | "DIVISION" | "CLASS";
export type FeeCohort = "ALL" | "NEW" | "RETURNING";

export type FeeTemplateScope = {
  scopeMode: FeeScopeMode;
  gradeLevelId?: string | null;
  classroomId?: string | null;
  divisionId?: string | null;
  cohort?: FeeCohort | string | null;
  schoolYearKey?: string | null;
  name?: string;
};

export type StudentFeeProfile = {
  id: string;
  name?: string;
  schoolId?: string | null;
  gradeLevelId?: string | null;
  classroomId?: string | null;
  feeCohort?: string | null;
  /** Resolved from Academic GradeLevel.divisionId */
  divisionId?: string | null;
  gradeLevelName?: string | null;
  divisionName?: string | null;
};

export function normalizeCohort(raw?: string | null): FeeCohort {
  const v = String(raw || "ALL").toUpperCase();
  if (v === "NEW" || v === "RETURNING") return v;
  return "ALL";
}

export function normalizeScopeMode(raw?: string | null): FeeScopeMode {
  const v = String(raw || "SCHOOL").toUpperCase();
  if (v === "GRADE" || v === "DIVISION" || v === "CLASS") return v;
  return "SCHOOL";
}

export function scopeSnapshotJson(scope: FeeTemplateScope): string {
  return JSON.stringify({
    scopeMode: normalizeScopeMode(scope.scopeMode),
    gradeLevelId: scope.gradeLevelId || null,
    classroomId: scope.classroomId || null,
    divisionId: scope.divisionId || null,
    cohort: normalizeCohort(scope.cohort),
    schoolYearKey: scope.schoolYearKey || null,
    name: scope.name || null,
  });
}

export function parseScopeSnapshot(raw?: string | null): FeeTemplateScope | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    return {
      scopeMode: normalizeScopeMode(p.scopeMode),
      gradeLevelId: p.gradeLevelId || null,
      classroomId: p.classroomId || null,
      divisionId: p.divisionId || null,
      cohort: normalizeCohort(p.cohort),
      schoolYearKey: p.schoolYearKey || null,
      name: p.name || null,
    };
  } catch {
    return null;
  }
}

export type EntranceFeeTemplateRef = {
  id?: string;
  name?: string;
  scopeMode?: string | null;
  classroomId?: string | null;
  gradeLevelId?: string | null;
  divisionId?: string | null;
  cohort?: string | null;
  schoolYearKey?: string | null;
  active?: boolean;
};

/** Entrance fee scope precedence: CLASS > GRADE > DIVISION > SCHOOL. */
export function pickEntranceFeeTemplate<T extends EntranceFeeTemplateRef>(
  templates: T[],
  context: {
    classroomId?: string | null;
    gradeLevelId?: string | null;
    divisionId?: string | null;
    cohort?: string | null;
  }
): T | null {
  const cohort = normalizeCohort(context.cohort);
  const tiers: Array<(template: T) => boolean> = [
    (t) =>
      normalizeScopeMode(t.scopeMode) === "CLASS" &&
      !!context.classroomId &&
      t.classroomId === context.classroomId,
    (t) =>
      normalizeScopeMode(t.scopeMode) === "GRADE" &&
      !!context.gradeLevelId &&
      t.gradeLevelId === context.gradeLevelId,
    (t) =>
      normalizeScopeMode(t.scopeMode) === "DIVISION" &&
      !!context.divisionId &&
      t.divisionId === context.divisionId,
    (t) => normalizeScopeMode(t.scopeMode) === "SCHOOL",
  ];

  for (const matchesScope of tiers) {
    const candidates = templates.filter(
      (t) =>
        t.active !== false &&
        matchesScope(t) &&
        (cohort === "ALL" ||
          normalizeCohort(t.cohort) === "ALL" ||
          normalizeCohort(t.cohort) === cohort)
    );
    if (!candidates.length) continue;
    const exact = candidates.find((t) => normalizeCohort(t.cohort) === cohort);
    if (exact) return exact;
    return candidates.find((t) => normalizeCohort(t.cohort) === "ALL") || candidates[0];
  }
  return null;
}

function cohortLabel(c: FeeCohort): string {
  if (c === "NEW") return "New students";
  if (c === "RETURNING") return "Returning students";
  return "All cohorts";
}

/**
 * Returns null if eligible; otherwise a human-readable mismatch message.
 */
export function feeScopeMismatchMessage(
  scope: FeeTemplateScope,
  student: StudentFeeProfile
): string | null {
  const mode = normalizeScopeMode(scope.scopeMode);
  const cohort = normalizeCohort(scope.cohort);

  if (mode === "SCHOOL") {
    if (scope.schoolYearKey && student.schoolId === undefined) {
      /* ignore */
    }
    return null;
  }

  if (mode === "GRADE") {
    if (!scope.gradeLevelId) {
      return "This fee template is missing a grade level.";
    }
    if (!student.gradeLevelId) {
      return `This fee is for a specific grade. Student ${student.name || student.id} has no grade level assigned.`;
    }
    if (student.gradeLevelId !== scope.gradeLevelId) {
      return `This fee is for grade ${scope.name || scope.gradeLevelId} (${cohortLabel(cohort)}). Selected student is ${student.gradeLevelName || student.gradeLevelId} (${cohortLabel(normalizeCohort(student.feeCohort))}). Transaction rejected.`;
    }
  }

  if (mode === "CLASS") {
    if (!scope.classroomId) {
      return "This fee template is missing a classroom.";
    }
    if (!student.classroomId) {
      return `This fee is for a specific class. Student ${student.name || student.id} has no classroom assigned.`;
    }
    if (student.classroomId !== scope.classroomId) {
      return `This fee is for class ${scope.name || scope.classroomId} (${cohortLabel(cohort)}). Selected student is in class ${student.classroomId} (${cohortLabel(normalizeCohort(student.feeCohort))}). Transaction rejected.`;
    }
  }

  if (mode === "DIVISION") {
    if (!scope.divisionId) {
      return "This fee template is missing a division.";
    }
    if (!student.divisionId) {
      return `This fee is for a school division. Student ${student.name || student.id} has no division (assign their grade to a division).`;
    }
    if (student.divisionId !== scope.divisionId) {
      return `This fee is for ${scope.name || "a division"} (${cohortLabel(cohort)}). Selected student is in ${student.divisionName || student.divisionId} (${cohortLabel(normalizeCohort(student.feeCohort))}). Transaction rejected.`;
    }
  }

  if (cohort !== "ALL") {
    const sc = normalizeCohort(student.feeCohort);
    if (sc !== cohort) {
      return `This fee is for ${cohortLabel(cohort)}. Selected student is marked ${cohortLabel(sc)}. Transaction rejected.`;
    }
  }

  return null;
}

export function assertFeeScopeEligible(
  scope: FeeTemplateScope,
  student: StudentFeeProfile
): void {
  const msg = feeScopeMismatchMessage(scope, student);
  if (msg) {
    throw Object.assign(new Error(msg), {
      status: 409,
      code: "FEE_SCOPE_MISMATCH",
    });
  }
}

/** Phase C: student no longer matches snapshot used at invoice create. */
export function staleScopeMismatchMessage(
  snapshot: FeeTemplateScope,
  student: StudentFeeProfile
): string | null {
  return feeScopeMismatchMessage(snapshot, student);
}
