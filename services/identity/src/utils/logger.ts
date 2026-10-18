import prisma from "../lib/prisma";
import {
  inferAuditCategory,
  normalizeAuditLevel,
  normalizeAuditOutcome,
  normalizeDataSensitivity,
  type AuditCategory,
} from "../domain/auditCategories";
import { clientIpFromReq, geoFromReq, parseUserAgent } from "./userAgent";

export type LogSystemEventExtras = {
  category?: AuditCategory | string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  schoolId?: string | null;
  /** Who/what the action was performed ON (actor ≠ target for admin operations). */
  targetUserId?: string | null;
  targetUserEmail?: string | null;
  targetUserName?: string | null;
  targetUserRole?: string | null;
  /** SUCCESS | FAILURE | PENDING | DENIED — inferred from statusCode when omitted. */
  outcome?: string | null;
  /** Human-readable change list; auto-derived from before/after when omitted. */
  changesSummary?: string | null;
  /** PASSWORD | TOTP | SMS | SSO | API_KEY | IMPLICIT */
  authMethod?: string | null;
  /** Links related events of one user journey. */
  correlationId?: string | null;
  /** PUBLIC | INTERNAL | CONFIDENTIAL | PII | SECRET — auto-detected as PII when omitted. */
  dataSensitivity?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  sessionId?: string | null;
  requestId?: string | null;
  httpMethod?: string | null;
  endpoint?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
  source?: string | null;
  errorMessage?: string | null;
  tags?: string[] | string | null;
};

const SENSITIVE_KEY_PATTERN =
  /pass(word|wd)?|secret|token|api[_-]?key|authorization|auth|credential|private[_-]?key|otp|pin|ssn|card|cvv|cookie|session[_-]?id/i;

const PII_KEY_PATTERN =
  /email|phone|mobile|address|dob|birth|national[_-]?id|id[_-]?number|passport|first[_-]?name|last[_-]?name|full[_-]?name/i;

const MAX_STRING_FIELD = 400;

function stringifyJson(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Deep-clone a value while replacing sensitive fields with "[REDACTED]".
 * Audit rows must never persist plaintext passwords, tokens, or secrets.
 */
export function redactSensitive(value: unknown, depth = 0): unknown {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => redactSensitive(v, depth + 1));
  if (typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(k)) {
      out[k] = v == null || v === "" ? v : "[REDACTED]";
    } else if (typeof v === "object") {
      out[k] = redactSensitive(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Detect whether a snapshot touches PII fields (email, phone, id numbers…). */
function containsPii(value: unknown, depth = 0): boolean {
  if (value == null || depth > 6) return false;
  if (Array.isArray(value)) return value.some((v) => containsPii(v, depth + 1));
  if (typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([k, v]) =>
    PII_KEY_PATTERN.test(k) || (typeof v === "object" && containsPii(v, depth + 1))
  );
}

function formatScalar(v: unknown): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "object") {
    try {
      const s = JSON.stringify(v);
      return s.length > MAX_STRING_FIELD ? `${s.slice(0, MAX_STRING_FIELD)}…` : s;
    } catch {
      return String(v);
    }
  }
  const s = String(v);
  return s.length > MAX_STRING_FIELD ? `${s.slice(0, MAX_STRING_FIELD)}…` : s;
}

/**
 * Build a human-readable change list ("field: old → new") by diffing two snapshots.
 * Ignores volatile fields (updatedAt, changedFields bookkeeping).
 */
export function summarizeChanges(before: unknown, after: unknown): string | null {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return null;
  const IGNORE = /^(updatedAt|changedFields)$/i;
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).filter(
    (k) => !IGNORE.test(k)
  );
  const parts: string[] = [];
  for (const k of keys) {
    const prev = b[k];
    const next = a[k];
    if (JSON.stringify(prev) === JSON.stringify(next)) continue;
    if (SENSITIVE_KEY_PATTERN.test(k) && (prev != null || next != null)) {
      parts.push(`${k}: changed`);
      continue;
    }
    parts.push(`${k}: ${formatScalar(prev)} → ${formatScalar(next)}`);
  }
  return parts.length ? parts.slice(0, 20).join("; ") : null;
}

function tagsToString(tags: LogSystemEventExtras["tags"]): string | null {
  if (!tags) return null;
  if (Array.isArray(tags)) return tags.filter(Boolean).join(",");
  return String(tags);
}

/**
 * Write an immutable SystemLog row for Super Admin audit.
 * Backward-compatible positional signature; pass `extras` for rich metadata.
 * Sensitive values are redacted and changes summarized automatically.
 */
export async function logSystemEvent(
  action: string,
  module: string,
  details: string,
  level: string = "INFO",
  req?: any,
  extras: LogSystemEventExtras = {}
) {
  try {
    const uaRaw = req?.headers?.["user-agent"] ? String(req.headers["user-agent"]) : extras.source ? null : "unknown";
    const parsed = parseUserAgent(uaRaw);
    const geo = geoFromReq(req);
    const ipAddress = clientIpFromReq(req) || "unknown";

    const userId = extras.userId !== undefined ? extras.userId : req?.user?.id || null;
    const schoolId =
      extras.schoolId !== undefined ? extras.schoolId : req?.user?.schoolId || null;
    const userName =
      extras.userName ??
      req?.user?.name ??
      (req?.user?.email ? String(req.user.email).split("@")[0] : null);
    const userEmail = extras.userEmail ?? req?.user?.email ?? null;
    const userRole = extras.userRole ?? req?.user?.role ?? null;

    const category =
      extras.category || inferAuditCategory(module, action);

    const statusCode = extras.statusCode ?? null;
    const outcome = normalizeAuditOutcome(extras.outcome, statusCode);

    const before = extras.before !== undefined ? redactSensitive(extras.before) : null;
    const after = extras.after !== undefined ? redactSensitive(extras.after) : null;

    const changesSummary =
      extras.changesSummary?.trim() || summarizeChanges(extras.before, extras.after);

    const dataSensitivity =
      normalizeDataSensitivity(extras.dataSensitivity) ??
      (containsPii(extras.before) || containsPii(extras.after) || /email|phone/i.test(details || "")
        ? "PII"
        : null);

    await prisma.systemLog.create({
      data: {
        action,
        module: String(module || "SYSTEM").toUpperCase(),
        category: String(category).toUpperCase(),
        details,
        level: normalizeAuditLevel(level),
        outcome,
        changesSummary,
        ipAddress,
        userAgent: uaRaw || null,
        browser: parsed.browser,
        os: parsed.os,
        deviceType: parsed.deviceType === "Unknown" ? null : parsed.deviceType,
        country: geo.country,
        city: geo.city,
        userId,
        userName,
        userEmail,
        userRole,
        targetUserId: extras.targetUserId ?? null,
        targetUserEmail: extras.targetUserEmail ?? null,
        targetUserName: extras.targetUserName ?? null,
        targetUserRole: extras.targetUserRole ?? null,
        authMethod: extras.authMethod ? String(extras.authMethod).toUpperCase() : null,
        correlationId: extras.correlationId ?? null,
        dataSensitivity,
        schoolId,
        entityType: extras.entityType ?? null,
        entityId: extras.entityId ?? null,
        beforeValue: stringifyJson(before),
        afterValue: stringifyJson(after),
        sessionId: extras.sessionId ?? null,
        requestId:
          extras.requestId ??
          (req?.headers?.["x-request-id"] ? String(req.headers["x-request-id"]) : null),
        httpMethod: extras.httpMethod ?? (req?.method ? String(req.method) : null),
        endpoint: extras.endpoint ?? (req?.originalUrl || req?.url || null),
        statusCode,
        durationMs: extras.durationMs ?? null,
        source: extras.source ?? "WEB",
        errorMessage: extras.errorMessage ?? null,
        tags: tagsToString(extras.tags),
      },
    });
  } catch (err) {
    console.error("Failed to log system event:", err);
  }
}
