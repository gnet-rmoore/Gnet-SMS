/**
 * Shared plan entitlement helpers for microservices.
 * Canonical copy — synced to each service's src/lib/entitlements.ts for Docker builds.
 */

import type { Express, Request, Response, NextFunction } from "express";

export type EntitlementRule = {
  /** Path regex (use req.path — no query string). */
  pattern: RegExp;
  feature: string;
  /** When set, rule applies only to this HTTP method. */
  method?: string;
};

const IDENTITY_URL = process.env.IDENTITY_URL || "http://localhost:3011";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

const INVENTORY_ALSO_KEYS = ["library", "clinic", "cafeteria", "athletics", "hostel"];

const cache = new Map<string, { at: number; keys: string[] }>();
const TTL_MS = 60_000;

function internalHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (INTERNAL_TOKEN) h["x-internal-token"] = INTERNAL_TOKEN;
  return h;
}

export async function getSchoolEntitlements(schoolId: string): Promise<string[]> {
  const hit = cache.get(schoolId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.keys;
  try {
    const res = await fetch(`${IDENTITY_URL}/api/internal/schools/${schoolId}/entitlements`, {
      headers: internalHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const keys = Array.isArray(data?.entitlements) ? data.entitlements : [];
    cache.set(schoolId, { at: Date.now(), keys });
    return keys;
  } catch {
    return [];
  }
}

export function hasEntitlement(entitlements: string[], featureKey: string): boolean {
  if (featureKey === "inventory") {
    return (
      entitlements.includes("inventory") ||
      entitlements.some((k) => INVENTORY_ALSO_KEYS.includes(k))
    );
  }
  return entitlements.includes(featureKey);
}

export function requireFeature(featureKey: string) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role === "SUPER_ADMIN") return next();
      const schoolId = req.params.schoolId || req.user?.schoolId || req.resourceSchoolId;
      if (!schoolId) {
        return res.status(403).json({ error: "Forbidden: Tenant context required" });
      }
      const entitlements = await getSchoolEntitlements(String(schoolId));
      if (!hasEntitlement(entitlements, featureKey)) {
        return res.status(403).json({
          error: "This module is not enabled on your school's plan",
          code: "FEATURE_NOT_ENTITLED",
          feature: featureKey,
        });
      }
      next();
    } catch (err) {
      console.error("[entitlements] requireFeature error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

type JwtPayload = { role?: string; schoolId?: string | null };

export type EntitlementGateOptions = {
  rules: EntitlementRule[];
  /** Optional JWT decode — services pass their auth secret helpers. */
  decodeUser?: (req: Request) => JwtPayload | null;
};

function matchRule(rules: EntitlementRule[], path: string, method: string): EntitlementRule | null {
  for (const rule of rules) {
    if (rule.method && rule.method.toUpperCase() !== method.toUpperCase()) continue;
    if (rule.pattern.test(path)) return rule;
  }
  return null;
}

function extractSchoolId(req: any, path: string, user: JwtPayload | null): string | null {
  if (req.params?.schoolId) return String(req.params.schoolId);
  if (user?.schoolId) return String(user.schoolId);
  const m = /^\/api\/schools\/([^/]+)/.exec(path);
  return m ? m[1] : null;
}

export function createEntitlementGate(options: EntitlementGateOptions) {
  const { rules, decodeUser } = options;
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const path = req.path || "";
      if (path.startsWith("/health")) return next();
      if (path.startsWith("/api/internal/")) return next();
      if (path.startsWith("/api/public/")) return next();
      if (req.headers["x-internal-token"]) return next();

      const rule = matchRule(rules, path, req.method || "GET");
      if (!rule) return next();

      const user = req.user ?? decodeUser?.(req) ?? null;
      if (user?.role === "SUPER_ADMIN") return next();
      if (!user) return next();

      const schoolId = extractSchoolId(req, path, user);
      if (!schoolId) {
        return res.status(403).json({ error: "Forbidden: Tenant context required" });
      }

      const entitlements = await getSchoolEntitlements(schoolId);
      if (!hasEntitlement(entitlements, rule.feature)) {
        return res.status(403).json({
          error: "This module is not enabled on your school's plan",
          code: "FEATURE_NOT_ENTITLED",
          feature: rule.feature,
        });
      }
      return next();
    } catch (err) {
      console.error("[entitlements] gate error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

export function installEntitlementGate(app: Express, options: EntitlementGateOptions) {
  app.use(createEntitlementGate(options));
}
