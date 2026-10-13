import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

/**
 * Phase 6 gateway — all /api traffic routes to extracted services.
 * Set DISABLE_MONOLITH=true (default in compose) to never fall back to sms-api.
 * Optional MONOLITH_URL is only used when DISABLE_MONOLITH is not true (emergency).
 */

type ServiceKey =
  | "identity"
  | "academic"
  | "classroom"
  | "lifecycle"
  | "staff"
  | "finance"
  | "ops"
  | "comms"
  | "campus";

const DISABLE_MONOLITH = process.env.DISABLE_MONOLITH !== "false";
const MONOLITH_URL = process.env.MONOLITH_URL || "";

const SERVICE_URLS: Record<ServiceKey, string> = {
  identity: process.env.IDENTITY_URL || "",
  academic: process.env.ACADEMIC_URL || "",
  classroom: process.env.CLASSROOM_URL || "",
  lifecycle: process.env.LIFECYCLE_URL || "",
  staff: process.env.STAFF_URL || "",
  finance: process.env.FINANCE_URL || "",
  ops: process.env.OPS_URL || "",
  comms: process.env.COMMS_URL || "",
  campus: process.env.CAMPUS_URL || "",
};

function urlFor(service: ServiceKey): string | null {
  const configured = SERVICE_URLS[service];
  if (configured && configured.length > 0) return configured;
  if (!DISABLE_MONOLITH && MONOLITH_URL) return MONOLITH_URL;
  return null;
}

function hasPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function hasAnyPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => hasPrefix(path, prefix));
}

function schoolSuffixSegment(rest: string): string {
  const segments = rest.split("/").filter(Boolean);
  return segments[0] ?? "";
}

const SCHOOL_SUFFIX_TO_SERVICE: Record<string, ServiceKey> = {
  "": "identity",
  staff: "identity",
  students: "identity",
  users: "identity",
  "role-audit": "identity",
  "role-capabilities": "identity",
  "admission-policy": "identity",
  "admission-background": "identity",
  setup: "identity",
  onboarding: "identity",
  stats: "identity",
  "guide-stats": "identity",
  entitlements: "identity",
  subscription: "identity",
  "api-keys": "identity",
  "receipt-template": "identity",
  subjects: "academic",
  "subject-offerings": "academic",
  "my-applications": "lifecycle",
  "grade-levels": "academic",
  divisions: "academic",
  syllabi: "academic",
  "lesson-plans": "academic",
  "lesson-plan-templates": "academic",
  "lesson-plan-syllabus-units": "academic",
  "grade-legends": "academic",
  calendar: "academic",
  "bell-schedules": "academic",
  "schedule-periods": "academic",
  timetable: "academic",
  exams: "academic",
  "online-exams": "academic",
  "exam-papers": "academic",
  grades: "academic",
  gradebook: "academic",
  promotion: "academic",
  "academic-years": "academic",
  "year-transition": "academic",
  classrooms: "classroom",
  applications: "lifecycle",
  "placement-summary": "lifecycle",
  attendance: "lifecycle",
  "leave-requests": "staff",
  "leave-balances": "staff",
  "leave-policies": "staff",
  "staff-tasks": "staff",
  "staff-attendance": "staff",
  payrolls: "staff",
  fees: "finance",
  "fee-templates": "finance",
  "fee-payment-txns": "finance",
  "fee-billing-settings": "finance",
  expenses: "finance",
  finance: "finance",
  receipts: "finance",
  vehicles: "ops",
  inventory: "ops",
  "work-orders": "ops",
  "security-logs": "ops",
  transport: "ops",
  library: "campus",
  clinic: "campus",
  counseling: "campus",
  athletics: "campus",
  hostel: "campus",
  cafeteria: "campus",
  "my-campus": "campus",
  announcements: "comms",
  documents: "comms",
  "notification-preferences": "comms",
  pta: "comms",
};

const SCHOOL_SUFFIX_RE = /^\/api\/schools\/([^/]+)((?:\/.*)?)$/;
const USER_PAYROLLS_RE = /^\/api\/users\/[^/]+\/payrolls(?:\/.*)?$/;

/** Resolve upstream for a request. null = no configured service (and no monolith). */
export function resolveUpstream(method: string, path: string): string | null {
  if (!hasPrefix(path, "/api")) return null;

  const m = method.toUpperCase();

  if (
    hasPrefix(path, "/api/auth") ||
    hasPrefix(path, "/api/auth/login") ||
    (m === "POST" && path === "/api/super-admin/auth/login")
  ) {
    return urlFor("identity");
  }

  if (USER_PAYROLLS_RE.test(path)) return urlFor("staff");

  if (
    hasAnyPrefix(path, [
      "/api/public/school-registrations",
      "/api/public/slug-available",
      "/api/public/invites",
      "/api/public/schools",
      "/api/public/resolve-host",
      "/api/public/domain-tls-ask",
      "/api/public/plans",
    ])
  ) {
    return urlFor("identity");
  }
  if (hasAnyPrefix(path, ["/api/public/applications"])) {
    return urlFor("lifecycle");
  }
  if (
    hasAnyPrefix(path, [
      "/api/public/fees",
      "/api/public/checkout",
      "/api/public/receipts",
      "/api/webhooks/stripe",
    ])
  ) {
    return urlFor("finance");
  }
  if (path === "/api/webhooks/platform-stripe" || hasPrefix(path, "/api/webhooks/platform-stripe")) {
    return urlFor("identity");
  }
  if (hasAnyPrefix(path, ["/api/public", "/api/users", "/api/parents", "/api/super-admin"])) {
    return urlFor("identity");
  }

  if (
    hasAnyPrefix(path, [
      "/api/subjects",
      "/api/subject-offerings",
      "/api/grade-levels",
      "/api/divisions",
      "/api/periods",
      "/api/exam-components",
      "/api/syllabi",
      "/api/lesson-plans",
      "/api/lesson-plan-templates",
      "/api/calendar",
      "/api/bell-schedules",
      "/api/schedule-periods",
      "/api/timetable-entries",
      "/api/exams",
      "/api/exam-attempts",
      "/api/exam-papers",
      "/api/grade-entries",
      "/api/students",
    ])
  ) {
    // /api/students/:id/grades|exam-attempts live on academic
    if (
      hasPrefix(path, "/api/students") &&
      (path.includes("/grades") || path.includes("/exam-attempts"))
    ) {
      return urlFor("academic") ?? urlFor("identity");
    }
    if (hasPrefix(path, "/api/students")) {
      return urlFor("identity");
    }
    return urlFor("academic");
  }

  if (hasPrefix(path, "/api/classrooms")) return urlFor("classroom");
  if (hasAnyPrefix(path, ["/api/posts", "/api/submissions", "/api/topics", "/api/comments"])) {
    return urlFor("classroom");
  }
  if (hasAnyPrefix(path, ["/api/applications", "/api/attendance"])) return urlFor("lifecycle");
  if (hasAnyPrefix(path, ["/api/leave-requests", "/api/staff-tasks", "/api/payrolls"])) {
    return urlFor("staff");
  }
  if (hasPrefix(path, "/api/fees") || path === "/api/my-fees" || path === "/api/my-fee-payment-txns") {
    return urlFor("finance");
  }
  if (hasPrefix(path, "/api/receipts") || hasPrefix(path, "/api/internal/receipts")) {
    return urlFor("finance");
  }
  if (hasAnyPrefix(path, ["/api/inventory", "/api/work-orders", "/api/vehicles", "/api/transport"])) {
    return urlFor("ops");
  }
  if (
    hasAnyPrefix(path, [
      "/api/library",
      "/api/hostel",
      "/api/athletics",
    ])
  ) {
    return urlFor("campus");
  }
  if (
    hasAnyPrefix(path, [
      "/api/announcements",
      "/api/documents",
      "/api/notifications",
      "/api/internal/notifications",
      "/api/pta",
    ])
  ) {
    return urlFor("comms");
  }

  const schoolMatch = SCHOOL_SUFFIX_RE.exec(path);
  if (schoolMatch) {
    const rest = schoolMatch[2] ?? "";
    const suffix = schoolSuffixSegment(rest);
    const service = SCHOOL_SUFFIX_TO_SERVICE[suffix];
    if (service) return urlFor(service);
  }

  if (!DISABLE_MONOLITH && MONOLITH_URL) return MONOLITH_URL;
  return null;
}

const PORT = Number(process.env.PORT) || 8081;
const IDENTITY_URL = process.env.IDENTITY_URL || "http://localhost:3011";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

async function applyApiKeyAuth(req: Request, res: Response): Promise<boolean> {
  const authHeader = req.headers.authorization;
  const hasJwt =
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ") &&
    !authHeader.includes("gnet_live_");
  if (hasJwt) return true;

  let rawKey = req.headers["x-api-key"] as string | undefined;
  if (!rawKey && typeof authHeader === "string" && authHeader.startsWith("Bearer gnet_live_")) {
    rawKey = authHeader.slice("Bearer ".length);
  }
  if (!rawKey) return true;

  const verifyRes = await fetch(`${IDENTITY_URL}/api/internal/api-keys/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(INTERNAL_TOKEN ? { "x-internal-token": INTERNAL_TOKEN } : {}),
    },
    body: JSON.stringify({ key: rawKey }),
  });
  if (!verifyRes.ok) {
    const body = await verifyRes.json().catch(() => ({}));
    res.status(verifyRes.status).json(body?.error ? body : { error: "Invalid API key" });
    return false;
  }
  const data = (await verifyRes.json()) as { accessToken?: string };
  if (!data.accessToken) {
    res.status(401).json({ error: "Invalid API key" });
    return false;
  }
  req.headers.authorization = `Bearer ${data.accessToken}`;
  return true;
}

function getCorsOrigin(): string | string[] | false {
  const raw = process.env.APP_URL || process.env.CORS_ORIGIN;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[CORS] APP_URL not set in production; defaulting to same-origin only");
      return false;
    }
    return ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080", "http://127.0.0.1:8080"];
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

const app = express();
const corsOrigin = getCorsOrigin();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (corsOrigin === false) {
    // same-origin
  } else if (typeof corsOrigin === "string") {
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);
    res.setHeader("Vary", "Origin");
  } else if (origin && corsOrigin.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else if (!origin && process.env.NODE_ENV !== "production") {
    res.setHeader("Access-Control-Allow-Origin", corsOrigin[0] ?? "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] || "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use((req, res, next) => {
  const existing = req.headers["x-request-id"];
  const requestId = (Array.isArray(existing) ? existing[0] : existing) || crypto.randomUUID();
  req.headers["x-request-id"] = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

app.get("/health/live", (_req, res) => {
  res.status(200).json({ status: "ok", phase: 6, monolith: !DISABLE_MONOLITH });
});

app.get("/health/ready", (_req, res) => {
  const missing = (Object.keys(SERVICE_URLS) as ServiceKey[]).filter((k) => !SERVICE_URLS[k]);
  if (DISABLE_MONOLITH && missing.length > 0) {
    res.status(503).json({
      status: "not_ready",
      reason: "missing_service_urls",
      missing,
    });
    return;
  }
  res.status(200).json({
    status: "ready",
    disableMonolith: DISABLE_MONOLITH,
    services: Object.fromEntries(
      (Object.keys(SERVICE_URLS) as ServiceKey[]).map((k) => [k, Boolean(SERVICE_URLS[k])])
    ),
  });
});

/** Gateway-owned health — no monolith. */
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    gateway: true,
    disableMonolith: DISABLE_MONOLITH,
    timestamp: new Date().toISOString(),
  });
});

function pathnameOf(req: Request): string {
  return (req.originalUrl || req.url).split("?")[0] ?? "";
}

app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
  const path = pathnameOf(req);
  if (path === "/api/health" || path.startsWith("/api/public/") || path.startsWith("/api/auth/")) {
    return next();
  }
  try {
    const ok = await applyApiKeyAuth(req, res);
    if (!ok) return;
    next();
  } catch (err) {
    console.error("[gateway] api key auth error:", err);
    res.status(503).json({ error: "API key verification unavailable" });
  }
});

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  if (pathnameOf(req) === "/api/health") return next();
  const target = resolveUpstream(req.method ?? "GET", pathnameOf(req));
  if (!target) {
    res.status(503).json({
      error: "No upstream service configured for this route",
      path: pathnameOf(req),
      hint: DISABLE_MONOLITH
        ? "Phase 6: monolith disabled — set the matching *_URL env var"
        : "Set MONOLITH_URL or the domain *_URL",
    });
    return;
  }
  (req as any).__upstream = target;
  next();
});

app.use(
  "/api",
  createProxyMiddleware<Request>({
    changeOrigin: true,
    pathRewrite: (path) => `/api${path.startsWith("/") ? path : `/${path}`}`,
    router: (req) => (req as any).__upstream,
    on: {
      proxyReq: (proxyReq, req) => {
        const requestId = req.headers["x-request-id"];
        if (requestId) proxyReq.setHeader("x-request-id", requestId);
      },
    },
  })
);

app.listen(PORT, () => {
  console.log(
    `[gateway] :${PORT} phase6 disableMonolith=${DISABLE_MONOLITH} services=${JSON.stringify(
      Object.fromEntries((Object.keys(SERVICE_URLS) as ServiceKey[]).map((k) => [k, Boolean(SERVICE_URLS[k])]))
    )}`
  );
});
