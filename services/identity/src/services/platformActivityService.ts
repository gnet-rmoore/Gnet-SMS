import prisma from "../lib/prisma";
import { assertSaCapability, type SaCapability, normalizeSaPlatformRole } from "../domain/saCapabilities";

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";
const SERVICE_URLS = {
  FINANCE: process.env.FINANCE_URL || "http://localhost:3016",
  ACADEMIC: process.env.ACADEMIC_URL || "http://localhost:3015",
  STAFF: process.env.STAFF_URL || "http://localhost:3013",
  OPS: process.env.OPS_URL || "http://localhost:3012",
} as const;

export type ActivityEvent = {
  id: string;
  occurredAt: string;
  schoolId: string;
  actorUserId?: string;
  actorEmail?: string;
  domain: "FINANCE" | "ACADEMIC" | "STAFF" | "OPS" | "IDENTITY";
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  level?: "INFO" | "WARN";
};

type Actor = { id: string; role: string; schoolId?: string | null; platformRole?: string | null };

const cache = new Map<string, { at: number; items: ActivityEvent[] }>();
const CACHE_MS = 30_000;

async function requireAuditRead(actor: Actor) {
  assertSaCapability(normalizeSaPlatformRole(actor.platformRole), "audit.read" as SaCapability);
}

async function fetchDomainEvents(
  baseUrl: string,
  params: URLSearchParams
): Promise<ActivityEvent[]> {
  try {
    const res = await fetch(`${baseUrl}/api/internal/audit/events?${params}`, {
      headers: INTERNAL_TOKEN ? { "x-internal-token": INTERNAL_TOKEN } : {},
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

function systemLogToActivity(row: {
  id: string;
  createdAt: Date;
  schoolId: string | null;
  userId: string | null;
  action: string;
  details: string;
  level: string;
  user?: { email?: string | null } | null;
}): ActivityEvent {
  return {
    id: `identity:log:${row.id}`,
    occurredAt: row.createdAt.toISOString(),
    schoolId: row.schoolId || "platform",
    actorUserId: row.userId || undefined,
    actorEmail: row.user?.email || undefined,
    domain: "IDENTITY",
    action: row.action,
    summary: row.details,
    entityType: "SystemLog",
    entityId: row.id,
    level: row.level === "ERROR" || row.level === "CRITICAL" ? "WARN" : "INFO",
  };
}

function buildParams(query: {
  schoolId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (query.schoolId) params.set("schoolId", query.schoolId);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  params.set("page", String(query.page || 1));
  params.set("pageSize", String(query.pageSize || 50));
  return params;
}

export const platformActivityService = {
  async listActivity(
    actor: Actor,
    query: {
      schoolId?: string;
      from?: string;
      to?: string;
      domain?: string;
      page?: number;
      pageSize?: number;
    }
  ) {
    await requireAuditRead(actor);
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 50));
    const domainFilter = String(query.domain || "").toUpperCase();
    const cacheKey = JSON.stringify({ ...query, page, pageSize });
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_MS) {
      const paged = hit.items.slice(0, pageSize);
      return { items: paged, total: hit.items.length, page, pageSize, note: NOTE };
    }

    const items: ActivityEvent[] = [];
    const params = buildParams({ ...query, page, pageSize });

    if (!domainFilter || domainFilter === "IDENTITY") {
      const where: any = {};
      if (query.schoolId) where.schoolId = query.schoolId;
      if (query.from || query.to) {
        where.createdAt = {};
        if (query.from) where.createdAt.gte = new Date(query.from);
        if (query.to) where.createdAt.lte = new Date(query.to);
      }
      const logs = await prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pageSize,
        include: { user: { select: { email: true } } },
      });
      items.push(...logs.map(systemLogToActivity));
    }

    const domainFetches: Array<[keyof typeof SERVICE_URLS, ActivityEvent["domain"]]> = [
      ["FINANCE", "FINANCE"],
      ["ACADEMIC", "ACADEMIC"],
      ["STAFF", "STAFF"],
      ["OPS", "OPS"],
    ];
    if (query.schoolId) {
      for (const [key, label] of domainFetches) {
        if (domainFilter && domainFilter !== label) continue;
        items.push(...(await fetchDomainEvents(SERVICE_URLS[key], params)));
      }
    }

    items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    cache.set(cacheKey, { at: Date.now(), items });

    return {
      items: items.slice(0, pageSize),
      total: items.length,
      page,
      pageSize,
      note: NOTE,
    };
  },

  async exportCsv(
    actor: Actor,
    query: { schoolId?: string; from?: string; to?: string; domain?: string }
  ) {
    const result = await this.listActivity(actor, { ...query, page: 1, pageSize: 500 });
    const header = "occurredAt,domain,action,schoolId,actorUserId,summary\n";
    const rows = result.items.map((e) =>
      [
        e.occurredAt,
        e.domain,
        e.action,
        e.schoolId,
        e.actorUserId || "",
        `"${String(e.summary).replace(/"/g, '""')}"`,
      ].join(",")
    );
    return header + rows.join("\n");
  },
};

const NOTE =
  "Money and grade details stay in domain services; this view shows who did what and when.";
