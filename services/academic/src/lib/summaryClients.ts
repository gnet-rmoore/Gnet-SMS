/**
 * Internal clients to the Lifecycle (attendance) and Campus (discipline)
 * services for Promotion Statement enrichment. Fail-soft: a missing service
 * yields empty data rather than failing the whole statement.
 */
const LIFECYCLE_URL = process.env.LIFECYCLE_URL || process.env.MONOLITH_URL || "http://localhost:3010";
const CAMPUS_URL = process.env.CAMPUS_URL || process.env.MONOLITH_URL || "http://localhost:3018";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function internalHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) headers["x-internal-token"] = INTERNAL_TOKEN;
  return headers;
}

export type AttendanceSummaryRow = {
  studentUserId: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
  attendanceRate: number;
};

export async function getAttendanceSummary(
  schoolId: string,
  opts: { from?: string | null; to?: string | null } = {}
): Promise<AttendanceSummaryRow[]> {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  const qs = params.toString();
  try {
    const res = await fetch(
      `${LIFECYCLE_URL}/api/internal/schools/${encodeURIComponent(schoolId)}/attendance/summary${
        qs ? `?${qs}` : ""
      }`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export type DisciplineSummary = {
  suspendedStudentIds: string[];
  suspendedStudents: Array<{ studentUserId: string; count: number; days: number }>;
  suspendedCount: number;
  totalSuspensionDays: number;
};

export async function getDisciplineSummary(
  schoolId: string,
  opts: { from?: string | null; to?: string | null } = {}
): Promise<DisciplineSummary> {
  const empty: DisciplineSummary = {
    suspendedStudentIds: [],
    suspendedStudents: [],
    suspendedCount: 0,
    totalSuspensionDays: 0,
  };
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  const qs = params.toString();
  try {
    const res = await fetch(
      `${CAMPUS_URL}/api/internal/schools/${encodeURIComponent(schoolId)}/discipline/summary${
        qs ? `?${qs}` : ""
      }`,
      { headers: internalHeaders() }
    );
    if (!res.ok) return empty;
    const data = await res.json();
    return { ...empty, ...data };
  } catch {
    return empty;
  }
}
