import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

/**
 * Canonical auth middleware — single source of truth for all services.
 * Imported via relative path from each service's src/middleware/auth.ts.
 */

function assertSecretsInProduction() {
  if (process.env.NODE_ENV === "production") {
    if (!process.env.JWT_ACCESS_SECRET || !process.env.SUPER_ADMIN_JWT_SECRET) {
      throw new Error(
        "FATAL: JWT_ACCESS_SECRET and SUPER_ADMIN_JWT_SECRET must be set in production"
      );
    }
  }
}
assertSecretsInProduction();

export const getJwtAccessSecret = (): string => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_ACCESS_SECRET is required in production");
  }
  console.warn("[AUTH] Using insecure development JWT_ACCESS_SECRET fallback");
  return "dev-only-insecure-secret-change-me";
};

export const getSuperAdminJwtSecret = (): string => {
  const secret = process.env.SUPER_ADMIN_JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SUPER_ADMIN_JWT_SECRET is required in production");
  }
  console.warn("[AUTH] Using insecure development SUPER_ADMIN_JWT_SECRET fallback");
  return "dev-only-insecure-secret-change-me-super-admin";
};

export const ACCESS_TOKEN_TTL = "8h";

export const authenticate = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, getJwtAccessSecret()) as any;
    req.user = decoded;
    return next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    try {
      const decoded = jwt.verify(token, getSuperAdminJwtSecret()) as any;
      if (decoded.role !== "SUPER_ADMIN") {
        return res.status(401).json({ error: "Invalid token" });
      }
      req.user = decoded;
      return next();
    } catch (superErr: any) {
      if (superErr.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token expired" });
      }
      console.error("Authentication failed:", superErr.message);
      return res.status(401).json({ error: "Invalid token" });
    }
  }
};

export const authenticateSuperAdmin = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, getSuperAdminJwtSecret()) as any;
    if (decoded.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Forbidden: Super Admin access required" });
    }
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    console.error("Super Admin authentication failed:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const requireTenant = (req: any, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role === "SUPER_ADMIN") return next();

  const schoolId = req.params.schoolId || req.query.schoolId || req.body?.schoolId;
  if (!schoolId) return res.status(403).json({ error: "Forbidden: Tenant context required" });
  if (user.schoolId !== schoolId) {
    return res.status(403).json({ error: "Forbidden: Cross-tenant access is prohibited" });
  }
  next();
};

export const requireSchoolMembership = (req: any, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role === "SUPER_ADMIN") return next();
  if (!user.schoolId) return res.status(403).json({ error: "Forbidden: Tenant context required" });
  next();
};

export const requireResourceTenant = (
  loadSchoolId: (req: any) => Promise<string | null | undefined>
) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      if (user.role === "SUPER_ADMIN") return next();

      const resourceSchoolId = await loadSchoolId(req);
      if (!resourceSchoolId) return res.status(404).json({ error: "Resource not found" });
      if (user.schoolId !== resourceSchoolId) {
        return res.status(403).json({ error: "Forbidden: Cross-tenant access is prohibited" });
      }
      req.resourceSchoolId = resourceSchoolId;
      next();
    } catch (err) {
      console.error("requireResourceTenant error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
};

export const requireRoles = (allowedRoles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role === "API_CLIENT") {
      if (req.method !== "GET") {
        return res.status(403).json({ error: "API keys are read-only" });
      }
      return next();
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
    }
    next();
  };
};

/** Prefer JWT capabilities; fall back to legacy role allow-list. */
export const requireCapability = (capabilityKey: string, legacyRoles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role === "SUPER_ADMIN") return next();
    if (Array.isArray(user.capabilities)) {
      if (!user.capabilities.includes(capabilityKey)) {
        return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
      }
      return next();
    }
    if (!legacyRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
    }
    next();
  };
};

export const requireSelfOrRoles = (allowedRoles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role === "SUPER_ADMIN") return next();

    const targetUserId =
      req.params.userId || req.params.studentId || req.params.parentId ||
      req.query.userId || req.query.studentId || req.body?.userId;

    if (targetUserId && user.id === targetUserId) return next();
    if (req.params.parentId && user.id === req.params.parentId) return next();
    if (allowedRoles.includes(user.role)) return next();

    return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
  };
};

/** Internal service-to-service calls. No user-facing secret. */
export const authenticateInternal = (req: any, res: Response, next: NextFunction) => {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return res.status(500).json({ error: "INTERNAL_SERVICE_TOKEN not configured" });
    }
    return next(); // dev convenience only
  }
  if (req.headers["x-internal-token"] !== expected) {
    return res.status(401).json({ error: "Unauthorized (internal)" });
  }
  next();
};
