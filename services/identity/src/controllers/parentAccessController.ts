import type { Request, Response } from "express";
import { parentAccessService } from "../services/parentAccessService";
import { logSystemEvent } from "../utils/logger";
import {
  assertSaCapability,
  normalizeSaPlatformRole,
} from "../domain/saCapabilities";
import { canManageParentAccess } from "../domain/parentAccess";
import { assertCanResetParentPassword } from "../domain/passwordResetPolicy";

function errorStatus(err: any): number {
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 600) return err.status;
  return 500;
}

function sendError(res: Response, err: any) {
  return res.status(errorStatus(err)).json({
    error: err?.message || "Parent access request failed",
    code: err?.code || "PARENT_ACCESS_FAILED",
  });
}

function audit(
  req: Request,
  action: string,
  details: string,
  level: string,
  extras: Parameters<typeof logSystemEvent>[5] = {}
) {
  return logSystemEvent(action, "AUTH", details, level, req, {
    category: extras.category || "SECURITY",
    ...extras,
  });
}

async function assertSchoolManager(req: any, schoolId: string) {
  if (!canManageParentAccess(req.user, schoolId)) {
    throw Object.assign(new Error("Forbidden: Insufficient privileges"), {
      code: "FORBIDDEN",
      status: 403,
    });
  }
}

async function assertTargetParent(req: any, userId: string) {
  const schoolId = String(req.user?.schoolId || "");
  await assertSchoolManager(req, schoolId);
  await parentAccessService.assertParentInSchool(userId, schoolId);
  return schoolId;
}

function assertSa(req: any) {
  assertSaCapability(normalizeSaPlatformRole(req.user?.platformRole), "users.parent_access.manage");
}

export const parentAccessController = {
  async submitPhoneRequest(req: any, res: Response) {
    try {
      const result = await parentAccessService.submitPhoneLoginRequest(
        req.user.id,
        String(req.body?.schoolSlug || ""),
        String(req.body?.phone || "")
      );
      await audit(req, "parent_phone_login_requested", "Parent phone sign-in requested", "INFO", {
        userId: req.user.id,
        userEmail: req.user.email,
        outcome: "SUCCESS",
        schoolId: result.schoolId,
        dataSensitivity: "PII",
        tags: ["parent", "phone"],
      });
      return res.status(201).json(result);
    } catch (err: any) {
      return sendError(res, err);
    }
  },

  async myStatus(req: any, res: Response) {
    try {
      return res.json(await parentAccessService.selfStatus(req.user.id));
    } catch (err: any) {
      return sendError(res, err);
    }
  },

  async sendVerificationCode(req: any, res: Response) {
    try {
      const result = await parentAccessService.sendPhoneVerificationCode(
        req.user.id,
        String(req.params.id || "")
      );
      await audit(req, "parent_phone_verification_code_sent", "Parent phone verification code sent", "INFO", {
        userId: req.user.id,
        userEmail: req.user.email,
        outcome: "SUCCESS",
        dataSensitivity: "PII",
        tags: ["parent", "phone"],
      });
      return res.json(result);
    } catch (err: any) {
      return sendError(res, err);
    }
  },

  async verifyPhone(req: any, res: Response) {
    try {
      const result = await parentAccessService.verifyPhoneRequest(
        req.user.id,
        String(req.params.id || ""),
        String(req.body?.code || "")
      );
      await audit(req, "parent_phone_verified", "Parent phone number verified", "INFO", {
        userId: req.user.id,
        userEmail: req.user.email,
        outcome: "SUCCESS",
        schoolId: result.schoolId,
        tags: ["parent", "phone"],
      });
      return res.json(result);
    } catch (err: any) {
      return sendError(res, err);
    }
  },

  async listRequests(req: any, res: Response) {
    try {
      return res.json(
        await parentAccessService.listRequests(
          String(req.params.schoolId || ""),
          req.query.status ? String(req.query.status) : undefined
        )
      );
    } catch (err: any) {
      return sendError(res, err);
    }
  },

  async approveRequest(req: any, res: Response) {
    try {
      const id = String(req.params.id || "");
      const existing = await parentAccessService.listRequestsByIds([id]);
      const target = existing[0];
      if (!target) throw Object.assign(new Error("Request not found"), { code: "NOT_FOUND", status: 404 });
      await assertSchoolManager(req, target.schoolId);
      const result = await parentAccessService.approvePhoneRequest(
        id,
        req.user.id,
        req.body?.reviewNote ? String(req.body.reviewNote) : undefined
      );
      await audit(req, "parent_phone_login_enabled", "Parent phone sign-in enabled", "INFO", {
        userId: req.user.id,
        userEmail: req.user.email,
        targetUserId: target.parentId,
        outcome: "SUCCESS",
        schoolId: target.schoolId,
        tags: ["parent", "phone"],
      });
      return res.json(result);
    } catch (err: any) {
      return sendError(res, err);
    }
  },

  async rejectRequest(req: any, res: Response) {
    try {
      const id = String(req.params.id || "");
      const existing = await parentAccessService.listRequestsByIds([id]);
      const target = existing[0];
      if (!target) throw Object.assign(new Error("Request not found"), { code: "NOT_FOUND", status: 404 });
      await assertSchoolManager(req, target.schoolId);
      const result = await parentAccessService.rejectPhoneRequest(
        id,
        req.user.id,
        req.body?.reviewNote ? String(req.body.reviewNote) : undefined
      );
      await audit(req, "parent_phone_login_rejected", "Parent phone sign-in request rejected", "INFO", {
        userId: req.user.id,
        userEmail: req.user.email,
        targetUserId: target.parentId,
        outcome: "SUCCESS",
        schoolId: target.schoolId,
        tags: ["parent", "phone"],
      });
      return res.json(result);
    } catch (err: any) {
      return sendError(res, err);
    }
  },

  async listDirectory(req: any, res: Response) {
    try {
      return res.json(
        await parentAccessService.listParentDirectory(
          String(req.params.schoolId || ""),
          req.query.search ? String(req.query.search) : undefined
        )
      );
    } catch (err: any) {
      return sendError(res, err);
    }
  },

  async regenerateCode(req: any, res: Response) {
    try {
      const userId = String(req.params.userId || "");
      const schoolId = (req as any).isSuperAdmin
        ? String(req.params.schoolId || "")
        : await assertTargetParent(req, userId);
      const result = await parentAccessService.regenerateParentAccessCode(userId, schoolId);
      await audit(req, "parent_access_code_regenerated", "Parent access code regenerated", "INFO", {
        userId: req.user.id,
        userEmail: req.user.email,
        targetUserId: userId,
        targetUserEmail: req.user.email === userId ? req.user.email : null,
        outcome: "SUCCESS",
        schoolId,
        dataSensitivity: "SECRET",
        tags: ["parent", "access_code"],
      });
      return res.json(result);
    } catch (err: any) {
      return sendError(res, err);
    }
  },

  async resetParentPassword(req: any, res: Response) {
    try {
      const userId = String(req.params.userId || "");
      const target = await parentAccessService.getParentSummary(userId);
      assertCanResetParentPassword(
        {
          id: String(req.user?.id || ""),
          role: String(req.user?.role || ""),
          schoolId: req.user?.schoolId ?? null,
        },
        target
      );
      const schoolId = await assertTargetParent(req, userId);
      const result = await parentAccessService.resetParentPassword(userId, schoolId, {
        password: typeof req.body?.password === "string" ? req.body.password : undefined,
        mustChangePassword: req.body?.mustChangePassword,
      });
      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      await audit(req, "parent_password_reset", "Parent password reset", "WARNING", {
        category: "AUTH",
        userId: req.user.id,
        userEmail: req.user.email,
        entityType: "User",
        entityId: userId,
        targetUserId: userId,
        targetUserEmail: target.email,
        targetUserName: target.name,
        targetUserRole: target.role,
        outcome: "SUCCESS",
        schoolId,
        dataSensitivity: "SECRET",
        after: { mustChangePassword: result.mustChangePassword, reason: reason || null },
        tags: ["parent", "password", "reset"],
      });
      return res.json(result);
    } catch (err: any) {
      return sendError(res, err);
    }
  },

  async setPhoneEnabled(req: any, res: Response) {
    try {
      const userId = String(req.params.userId || "");
      const schoolId = (req as any).isSuperAdmin
        ? String(req.params.schoolId || "")
        : await assertTargetParent(req, userId);
      const result = await parentAccessService.setPhoneLoginEnabled(
        userId,
        schoolId,
        Boolean(req.body?.enabled)
      );
      await audit(
        req,
        result.enabled ? "parent_phone_login_enabled" : "parent_phone_login_disabled",
        `Parent phone sign-in ${result.enabled ? "enabled" : "disabled"}`,
        "INFO",
        {
          userId: req.user.id,
          userEmail: req.user.email,
          targetUserId: userId,
          outcome: "SUCCESS",
          schoolId,
          tags: ["parent", "phone"],
        }
      );
      return res.json(result);
    } catch (err: any) {
      return sendError(res, err);
    }
  },

  async resetLockout(req: any, res: Response) {
    try {
      const userId = String(req.params.userId || "");
      const schoolId = (req as any).isSuperAdmin
        ? String(req.params.schoolId || "")
        : await assertTargetParent(req, userId);
      await parentAccessService.resetLockouts(userId, schoolId);
      await audit(req, "parent_login_lockout_reset", "Parent login lockout reset", "INFO", {
        userId: req.user.id,
        userEmail: req.user.email,
        targetUserId: userId,
        outcome: "SUCCESS",
        schoolId,
        tags: ["parent", "access_code", "phone"],
      });
      return res.json({ ok: true });
    } catch (err: any) {
      return sendError(res, err);
    }
  },

  async superAdminRegenerateCode(req: any, res: Response) {
    try {
      assertSa(req);
      (req as any).isSuperAdmin = true;
      req.params.schoolId = String(req.params.id || "");
      return await this.regenerateCode(req, res);
    } catch (err: any) {
      return sendError(res, err);
    }
  },

  async superAdminSetPhoneEnabled(req: any, res: Response) {
    try {
      assertSa(req);
      (req as any).isSuperAdmin = true;
      req.params.schoolId = String(req.params.id || "");
      return await this.setPhoneEnabled(req, res);
    } catch (err: any) {
      return sendError(res, err);
    }
  },

  async superAdminResetLockout(req: any, res: Response) {
    try {
      assertSa(req);
      (req as any).isSuperAdmin = true;
      req.params.schoolId = String(req.params.id || "");
      return await this.resetLockout(req, res);
    } catch (err: any) {
      return sendError(res, err);
    }
  },
};
