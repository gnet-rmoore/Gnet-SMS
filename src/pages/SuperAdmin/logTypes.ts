export interface LogEntry {
  id: string;
  action: string;
  module: string;
  category?: string;
  details: string;
  outcome?: string | null;
  changesSummary?: string | null;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  targetUserId?: string | null;
  targetUserEmail?: string | null;
  targetUserName?: string | null;
  targetUserRole?: string | null;
  authMethod?: string | null;
  correlationId?: string | null;
  dataSensitivity?: string | null;
  schoolId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  browser?: string | null;
  os?: string | null;
  deviceType?: string | null;
  country?: string | null;
  city?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  beforeValue?: string | null;
  afterValue?: string | null;
  httpMethod?: string | null;
  endpoint?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
  source?: string | null;
  errorMessage?: string | null;
  tags?: string | null;
  user?: { name: string; role: string; email?: string } | null;
  school?: { name: string; slug?: string } | null;
  createdAt: string;
  level: "INFO" | "WARNING" | "ERROR" | "CRITICAL" | string;
}

export const LEVEL_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  ERROR: "bg-orange-100 text-orange-700 border-orange-200",
  WARNING: "bg-amber-100 text-amber-700 border-amber-200",
  INFO: "bg-blue-100 text-blue-700 border-blue-200",
};

export const LEVEL_DOTS: Record<string, string> = {
  CRITICAL: "bg-red-500",
  ERROR: "bg-orange-500",
  WARNING: "bg-amber-500",
  INFO: "bg-blue-500",
};

export const OUTCOME_STYLES: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FAILURE: "bg-rose-100 text-rose-700 border-rose-200",
  DENIED: "bg-rose-100 text-rose-700 border-rose-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
};

export const SENSITIVITY_STYLES: Record<string, string> = {
  PUBLIC: "bg-slate-100 text-slate-600 border-slate-200",
  INTERNAL: "bg-sky-100 text-sky-700 border-sky-200",
  CONFIDENTIAL: "bg-indigo-100 text-indigo-700 border-indigo-200",
  PII: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  SECRET: "bg-red-100 text-red-700 border-red-200",
};

export function levelStyle(level: string): string {
  return LEVEL_STYLES[level] || LEVEL_STYLES.INFO;
}

export function outcomeStyle(outcome?: string | null): string {
  if (!outcome) return "bg-slate-100 text-slate-600 border-slate-200";
  return OUTCOME_STYLES[outcome] || "bg-slate-100 text-slate-600 border-slate-200";
}

export function sensitivityStyle(s: string): string {
  return SENSITIVITY_STYLES[s] || SENSITIVITY_STYLES.INTERNAL;
}

export function actorLabel(log: LogEntry, systemLabel: string): string {
  return (
    log.userName ||
    log.user?.name ||
    log.userEmail ||
    log.user?.email ||
    systemLabel
  );
}

export function targetLabel(log: LogEntry): string | null {
  const name = log.targetUserName || log.targetUserEmail;
  if (name) return name;
  if (log.targetUserEmail) return log.targetUserEmail;
  return null;
}

export function safeParseJson(value?: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export type FieldChange = { field: string; before: unknown; after: unknown };

const DIFF_IGNORE = /^(updatedAt|changedFields)$/i;

export function diffFields(before: unknown, after: unknown): FieldChange[] {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).filter(
    (k) => !DIFF_IGNORE.test(k)
  );
  const out: FieldChange[] = [];
  for (const k of keys) {
    if (JSON.stringify(b[k]) === JSON.stringify(a[k])) continue;
    out.push({ field: k, before: b[k], after: a[k] });
  }
  return out;
}

export function formatValue(v: unknown): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.round((then - now) / 1000);
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60) return rtf.format(diff, "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 604800) return rtf.format(Math.round(diff / 86400), "day");
  return new Date(iso).toLocaleDateString();
}

export function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
