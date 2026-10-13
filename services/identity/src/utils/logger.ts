import prisma from "../lib/prisma";
import {
  inferAuditCategory,
  normalizeAuditLevel,
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

function stringifyJson(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function tagsToString(tags: LogSystemEventExtras["tags"]): string | null {
  if (!tags) return null;
  if (Array.isArray(tags)) return tags.filter(Boolean).join(",");
  return String(tags);
}

/**
 * Write an immutable SystemLog row for Super Admin audit.
 * Backward-compatible positional signature; pass `extras` for rich metadata.
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

    await prisma.systemLog.create({
      data: {
        action,
        module: String(module || "SYSTEM").toUpperCase(),
        category: String(category).toUpperCase(),
        details,
        level: normalizeAuditLevel(level),
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
        schoolId,
        entityType: extras.entityType ?? null,
        entityId: extras.entityId ?? null,
        beforeValue: stringifyJson(extras.before),
        afterValue: stringifyJson(extras.after),
        sessionId: extras.sessionId ?? null,
        requestId:
          extras.requestId ??
          (req?.headers?.["x-request-id"] ? String(req.headers["x-request-id"]) : null),
        httpMethod: extras.httpMethod ?? (req?.method ? String(req.method) : null),
        endpoint: extras.endpoint ?? (req?.originalUrl || req?.url || null),
        statusCode: extras.statusCode ?? null,
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
