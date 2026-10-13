/** Honest client-side aggregations for dashboard charts — no invented series. */

export type ChartDatum = { name: string; value: number; fill?: string };

export function aggregateLogSeverity(logs: unknown[]): ChartDatum[] {
  let errors = 0;
  let warnings = 0;
  let info = 0;
  for (const raw of logs) {
    const level = String((raw as { level?: string })?.level || "").toUpperCase();
    if (level === "ERROR" || level === "CRITICAL") errors += 1;
    else if (level === "WARNING") warnings += 1;
    else if (level === "INFO") info += 1;
  }
  return [
    { name: "errors", value: errors, fill: "#f43f5e" },
    { name: "warnings", value: warnings, fill: "#f59e0b" },
    { name: "info", value: info, fill: "#3b82f6" },
  ].filter((d) => d.value > 0);
}

export function aggregateFeeStatus(fees: unknown[]): ChartDatum[] {
  const counts: Record<string, number> = {};
  for (const raw of fees) {
    const status = String((raw as { status?: string })?.status || "UNKNOWN").toUpperCase();
    counts[status] = (counts[status] || 0) + 1;
  }
  const colors: Record<string, string> = {
    PAID: "#10b981",
    PENDING: "#6366f1",
    OVERDUE: "#f43f5e",
    PARTIAL: "#f59e0b",
  };
  return Object.entries(counts).map(([status, value]) => ({
    name: status.toLowerCase(),
    value,
    fill: colors[status] || "#94a3b8",
  }));
}

export function aggregateWorkOrderStatus(orders: unknown[]): ChartDatum[] {
  const counts: Record<string, number> = {};
  for (const raw of orders) {
    const status = String((raw as { status?: string })?.status || "UNKNOWN").toUpperCase();
    counts[status] = (counts[status] || 0) + 1;
  }
  const colors: Record<string, string> = {
    OPEN: "#f59e0b",
    IN_PROGRESS: "#3b82f6",
    COMPLETED: "#10b981",
    CANCELLED: "#94a3b8",
  };
  return ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
    .filter((s) => (counts[s] || 0) > 0)
    .map((status) => ({
      name: status.toLowerCase().replace("_", " "),
      value: counts[status] || 0,
      fill: colors[status],
    }));
}

export function aggregateInventoryStock(items: unknown[]): ChartDatum[] {
  let low = 0;
  let ok = 0;
  for (const raw of items) {
    const qty = Number((raw as { quantity?: number })?.quantity ?? 0);
    const min = Number((raw as { minQuantity?: number })?.minQuantity ?? 0);
    if (qty <= min) low += 1;
    else ok += 1;
  }
  return [
    { name: "low", value: low, fill: "#f43f5e" },
    { name: "inStock", value: ok, fill: "#10b981" },
  ].filter((d) => d.value > 0);
}

export function attendanceByGradeLevelChart(attendance: unknown): ChartDatum[] {
  const rows = (attendance as {
    todayByGradeLevel?: Array<{
      name?: string;
      gradeLevelId?: string;
      present?: number;
      absent?: number;
    }>;
  })?.todayByGradeLevel;
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const colors = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#f43f5e", "#8b5cf6"];
  return rows
    .map((row, index) => ({
      name: String(row.name || row.gradeLevelId || "grade"),
      value: Number(row.present ?? 0),
      fill: colors[index % colors.length],
    }))
    .filter((d) => d.value > 0);
}

export function attendanceSnapshot(attendance: unknown): ChartDatum[] {
  const today = (attendance as { today?: { present?: number; absent?: number } })?.today;
  if (!today) return [];
  const present = Number(today.present ?? 0);
  const absent = Number(today.absent ?? 0);
  if (present === 0 && absent === 0) return [];
  return [
    { name: "present", value: present, fill: "#10b981" },
    { name: "absent", value: absent, fill: "#f43f5e" },
  ];
}

export function parentWeeklyAttendance(sessions: unknown[]): ChartDatum[] {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const byDay = new Map<string, { absent: number; late: number }>();

  for (const session of sessions) {
    const dateRaw = (session as { date?: string })?.date;
    if (!dateRaw) continue;
    const ts = new Date(dateRaw).getTime();
    if (ts < weekAgo) continue;
    const key = new Date(dateRaw).toLocaleDateString(undefined, {
      weekday: "short",
    });
    const bucket = byDay.get(key) || { absent: 0, late: 0 };
    for (const rec of (session as { records?: unknown[] })?.records || []) {
      const status = String((rec as { status?: string })?.status || "");
      if (status === "ABSENT") bucket.absent += 1;
      else if (status === "LATE") bucket.late += 1;
    }
    byDay.set(key, bucket);
  }

  return Array.from(byDay.entries()).map(([name, v]) => ({
    name,
    value: v.absent + v.late,
    fill: "#6366f1",
    absent: v.absent,
    late: v.late,
  })) as ChartDatum[];
}

export function schoolPopulationChart(
  students: number | null | undefined,
  teachers: number | null | undefined
): ChartDatum[] {
  const s = Number(students ?? 0);
  const t = Number(teachers ?? 0);
  if (s === 0 && t === 0) return [];
  return [
    { name: "students", value: s, fill: "#6366f1" },
    { name: "teachers", value: t, fill: "#10b981" },
  ];
}

export function platformSchoolStatusChart(stats: {
  activeSchools?: number;
  suspendedSchools?: number;
  totalSchools?: number;
}): ChartDatum[] {
  const active = Number(stats.activeSchools ?? 0);
  const suspended = Number(stats.suspendedSchools ?? 0);
  const total = Number(stats.totalSchools ?? 0);
  const other = Math.max(0, total - active - suspended);
  return [
    { name: "active", value: active, fill: "#10b981" },
    { name: "suspended", value: suspended, fill: "#f43f5e" },
    { name: "other", value: other, fill: "#94a3b8" },
  ].filter((d) => d.value > 0);
}

export function platformHeadcountChart(stats: {
  activeStudents?: number;
  totalStaff?: number;
}): ChartDatum[] {
  const students = Number(stats.activeStudents ?? 0);
  const staff = Number(stats.totalStaff ?? 0);
  if (students === 0 && staff === 0) return [];
  return [
    { name: "students", value: students, fill: "#6366f1" },
    { name: "staff", value: staff, fill: "#0ea5e9" },
  ];
}

export function setupProgressChart(done: number, remaining: number): ChartDatum[] {
  if (done === 0 && remaining === 0) return [];
  return [
    { name: "complete", value: done, fill: "#10b981" },
    { name: "remaining", value: remaining, fill: "#f59e0b" },
  ];
}
