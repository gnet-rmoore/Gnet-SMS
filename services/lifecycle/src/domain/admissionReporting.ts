/** Pure helpers for admissions funnel / CSV (no Prisma). */

export const FUNNEL_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "WAITLISTED",
  "APPROVED",
  "FEE_PENDING",
  "DOCS_PENDING",
  "ENROLLED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export type FunnelStatus = (typeof FUNNEL_STATUSES)[number];

export function countByStatus(applications: { status?: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of FUNNEL_STATUSES) counts[s] = 0;
  for (const app of applications) {
    const status = String(app.status || "PENDING");
    counts[status] = (counts[status] || 0) + 1;
  }
  return counts;
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function applicationsToCsv(
  applications: Array<Record<string, any>>,
  columns: Array<{ key: string; header: string }> = [
    { key: "applicationNumber", header: "Application #" },
    { key: "studentName", header: "Student" },
    { key: "parentName", header: "Guardian" },
    { key: "studentEmail", header: "Student Email" },
    { key: "parentEmail", header: "Guardian Email" },
    { key: "parentPhone", header: "Guardian Phone" },
    { key: "gradeLevelName", header: "Grade" },
    { key: "status", header: "Status" },
    { key: "source", header: "Source" },
    { key: "appliedAt", header: "Applied At" },
  ]
): string {
  const header = columns.map((c) => csvEscape(c.header)).join(",");
  const rows = applications.map((app) =>
    columns
      .map((c) => {
        let v = app[c.key];
        if (c.key === "appliedAt" && v) {
          try {
            v = new Date(v).toISOString();
          } catch {
            /* keep raw */
          }
        }
        if (c.key === "gradeLevelName" && !v && app.gradeLevel?.name) v = app.gradeLevel.name;
        return csvEscape(v);
      })
      .join(",")
  );
  return [header, ...rows].join("\n");
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

/** In-memory IP rate limit for public apply. Returns true if allowed. */
export function allowPublicApply(ip: string, limit = 15, windowMs = 60_000): boolean {
  const key = ip || "unknown";
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Test helper */
export function _resetPublicApplyRateLimit() {
  rateBuckets.clear();
}
