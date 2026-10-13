import type { Request, Response } from "express";
import { authService } from "../services/authService";
import { logSystemEvent } from "../utils/logger";

async function auditAuth(
  req: Request,
  action: string,
  details: string,
  level: string,
  extras: Parameters<typeof logSystemEvent>[5] = {}
) {
  await logSystemEvent(action, "AUTH", details, level, req, {
    category: extras.category || "AUTH",
    ...extras,
  });
}

/** Ported from src/server/controllers/authController.ts */
export const authController = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const started = Date.now();
    try {
      const result = await authService.login(email, password);
      if ((result as any).mfaRequired) {
        await auditAuth(req, "login_mfa_pending", `MFA challenge issued for ${email}`, "INFO", {
          userEmail: email,
          statusCode: 200,
          durationMs: Date.now() - started,
          tags: ["auth", "mfa"],
        });
        return res.json(result);
      }
      await auditAuth(
        req,
        result.user.role === "SUPER_ADMIN" ? "sa_login_success" : "login_success",
        result.user.role === "SUPER_ADMIN"
          ? `Super Admin login: ${result.user.email}`
          : `School user login: ${result.user.email}`,
        "INFO",
        {
          userId: result.user.id,
          userName: result.user.name,
          userEmail: result.user.email,
          userRole: result.user.role,
          schoolId: result.school?.id ?? null,
          entityType: "User",
          entityId: result.user.id,
          statusCode: 200,
          durationMs: Date.now() - started,
          tags: ["auth", result.user.role === "SUPER_ADMIN" ? "super_admin" : "school"],
        }
      );
      res.json(result);
    } catch (err: any) {
      console.error("Login Error:", err);
      const status =
        err.status === 403 || err.code === "SCHOOL_SUSPENDED" || err.code === "ACCOUNT_INACTIVE"
          ? 403
          : err.code === "USE_SUPER_ADMIN_LOGIN" || err.status === 400
            ? 400
            : err.code === "MAINTENANCE_MODE" || err.status === 503
              ? 503
              : err.message === "Invalid credentials"
                ? 401
                : err.message?.includes("Database connection error")
                  ? 503
                  : typeof err.status === "number"
                    ? err.status
                    : 500;

      const action =
        err.message === "Invalid credentials"
          ? "login_failed"
          : err.code === "ACCOUNT_INACTIVE"
            ? "login_blocked_inactive"
            : err.code === "SCHOOL_SUSPENDED"
              ? "login_blocked_school"
              : err.code === "MAINTENANCE_MODE"
                ? "login_blocked_maintenance"
                : "login_error";

      await auditAuth(
        req,
        action,
        `Login attempt for ${String(email || "").toLowerCase()}: ${err.message}`,
        status === 401 || status === 403 ? "WARNING" : "ERROR",
        {
          category: status === 401 ? "SECURITY" : "AUTH",
          userEmail: email ? String(email).toLowerCase() : null,
          statusCode: status,
          durationMs: Date.now() - started,
          errorMessage: err.message,
          tags: ["auth", "school", action],
        }
      );

      if (err.code === "EMAIL_NOT_VERIFIED") {
        return res.status(403).json({ error: err.message, code: "EMAIL_NOT_VERIFIED" });
      }
      if (err.status === 403 || err.code === "SCHOOL_SUSPENDED" || err.code === "ACCOUNT_INACTIVE") {
        return res.status(403).json({
          error: err.message,
          code: err.code,
          schoolStatus: err.schoolStatus,
          schoolName: err.schoolName,
          schoolSlug: err.schoolSlug,
        });
      }
      if (err.code === "USE_SUPER_ADMIN_LOGIN" || err.status === 400) {
        return res.status(400).json({ error: err.message, code: err.code || "BAD_REQUEST" });
      }
      if (err.code === "MAINTENANCE_MODE" || err.status === 503) {
        return res.status(503).json({ error: err.message, code: err.code || "MAINTENANCE_MODE" });
      }
      if (err.message === "Invalid credentials") {
        return res.status(401).json({ error: err.message });
      }
      if (err.message?.includes("Database connection error")) {
        return res.status(503).json({ error: "Service Unavailable", message: err.message });
      }
      if (typeof err.status === "number" && err.status >= 400 && err.status < 600) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      res.status(500).json({ error: "Internal server error", details: err.message });
    }
  },

  async forgotPassword(req: Request, res: Response) {
    try {
      const { emailAuthService } = await import("../services/emailAuthService");
      const result = await emailAuthService.requestPasswordReset(req.body.email);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async resetPassword(req: Request, res: Response) {
    try {
      const { emailAuthService } = await import("../services/emailAuthService");
      await emailAuthService.resetPassword(req.body.token, req.body.password);
      res.json({ ok: true, message: "Password updated. You can sign in now." });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async verifyEmail(req: Request, res: Response) {
    try {
      const { emailAuthService } = await import("../services/emailAuthService");
      const result = await emailAuthService.verifyEmail(req.body.token);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async resendVerification(req: Request, res: Response) {
    try {
      const { emailAuthService } = await import("../services/emailAuthService");
      const email = String(req.body.email || "").toLowerCase().trim();
      const generic = {
        message: "If an account exists and is unverified, a verification email has been sent.",
      };
      const prisma = (await import("../lib/prisma")).default;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || user.emailVerifiedAt) {
        return res.json(generic);
      }
      await emailAuthService.sendVerificationEmail(user.id);
      res.json(generic);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async me(req: any, res: Response) {
    try {
      const result = await authService.sessionForUserId(req.user.id);
      res.json(result);
    } catch (err: any) {
      if (err.status === 403 || err.code === "SCHOOL_SUSPENDED" || err.code === "TRIAL_EXPIRED") {
        return res.status(403).json({
          error: err.message,
          code: err.code,
          schoolStatus: err.schoolStatus,
          schoolName: err.schoolName,
          schoolSlug: err.schoolSlug,
        });
      }
      res.status(err.status || 500).json({ error: err.message || "Failed to load session" });
    }
  },

  async logout(req: any, res: Response) {
    try {
      await auditAuth(
        req,
        "logout",
        `User logout: ${req.user?.email || req.user?.id || "unknown"}`,
        "INFO",
        {
          category: "SESSION",
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          schoolId: req.user?.schoolId ?? null,
          entityType: "User",
          entityId: req.user?.id,
          statusCode: 200,
          tags: ["auth", "session"],
        }
      );
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Logout failed" });
    }
  },

  async superAdminLogin(req: Request, res: Response) {
    const { email, password } = req.body;
    const started = Date.now();
    try {
      const result = await authService.superAdminLogin(email, password);
      if ((result as any).mfaRequired) {
        await auditAuth(req, "sa_login_mfa_pending", `SA MFA challenge for ${email}`, "INFO", {
          userEmail: email,
          statusCode: 200,
          durationMs: Date.now() - started,
          tags: ["auth", "mfa", "super_admin"],
        });
        return res.json(result);
      }
      await auditAuth(
        req,
        "sa_login_success",
        `Super Admin login: ${result.user.email}`,
        "INFO",
        {
          category: "SUPER_ADMIN",
          userId: result.user.id,
          userName: result.user.name,
          userEmail: result.user.email,
          userRole: "SUPER_ADMIN",
          entityType: "User",
          entityId: result.user.id,
          statusCode: 200,
          durationMs: Date.now() - started,
          tags: ["auth", "super_admin"],
        }
      );
      res.json(result);
    } catch (err: any) {
      const status =
        err.message === "Invalid super admin credentials"
          ? 401
          : err.code === "ACCOUNT_INACTIVE"
            ? 403
            : err.message?.includes("Database connection error")
              ? 503
              : 500;

      await auditAuth(
        req,
        status === 401 ? "sa_login_failed" : "sa_login_error",
        `Super Admin login attempt for ${String(email || "").toLowerCase()}: ${err.message}`,
        status === 401 || status === 403 ? "WARNING" : "ERROR",
        {
          category: "SECURITY",
          userEmail: email ? String(email).toLowerCase() : null,
          statusCode: status,
          durationMs: Date.now() - started,
          errorMessage: err.message,
          tags: ["auth", "super_admin"],
        }
      );

      if (err.message === "Invalid super admin credentials") {
        return res.status(401).json({ error: err.message });
      }
      if (err.message?.includes("Database connection error")) {
        return res.status(503).json({ error: "Service Unavailable", message: err.message });
      }
      console.error("Super Admin Login Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};
