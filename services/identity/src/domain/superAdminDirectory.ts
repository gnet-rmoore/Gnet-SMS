/**
 * Super Admin school directory helpers — role buckets for headcount + lists.
 * Defaults from docs/SUPER_ADMIN_PLATFORM_PLAN.md §9.
 */

export const DIRECTORY_STUDENT_ROLE = "STUDENT";
export const DIRECTORY_PARENT_ROLE = "PARENT";

/** Staff = school users who are neither students nor parents (nor platform SA). */
export function isStaffDirectoryRole(role: string): boolean {
  return Boolean(role) && role !== DIRECTORY_STUDENT_ROLE && role !== DIRECTORY_PARENT_ROLE && role !== "SUPER_ADMIN";
}

export type SchoolHeadcounts = {
  studentCount: number;
  staffCount: number;
  parentCount: number;
  userCount: number;
};

export function emptyHeadcounts(): SchoolHeadcounts {
  return { studentCount: 0, staffCount: 0, parentCount: 0, userCount: 0 };
}

/** Aggregate groupBy({ schoolId, role }) rows into per-school headcounts. */
export function headcountsFromRoleGroups(
  rows: Array<{ schoolId: string | null; role: string; _count: { _all: number } | number }>
): Map<string, SchoolHeadcounts> {
  const map = new Map<string, SchoolHeadcounts>();
  for (const row of rows) {
    if (!row.schoolId) continue;
    const n = typeof row._count === "number" ? row._count : row._count._all;
    let bucket = map.get(row.schoolId);
    if (!bucket) {
      bucket = emptyHeadcounts();
      map.set(row.schoolId, bucket);
    }
    bucket.userCount += n;
    if (row.role === DIRECTORY_STUDENT_ROLE) bucket.studentCount += n;
    else if (row.role === DIRECTORY_PARENT_ROLE) bucket.parentCount += n;
    else if (isStaffDirectoryRole(row.role)) bucket.staffCount += n;
  }
  return map;
}

export type DirectoryListKind = "students" | "staff" | "parents";

export function rolesForDirectoryKind(kind: DirectoryListKind): string[] | "staff" {
  if (kind === "students") return [DIRECTORY_STUDENT_ROLE];
  if (kind === "parents") return [DIRECTORY_PARENT_ROLE];
  return "staff";
}
