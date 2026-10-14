import type { Request, Response } from "express";
import { superAdminService } from "../services/superAdminService";
import { platformOpsService } from "../services/platformOpsService";
import { emailSettingsService } from "../services/emailSettingsService";
import type { DirectoryListKind } from "../domain/superAdminDirectory";

function actorFromReq(req: Request) {
  const user = (req as any).user || {};
  return {
    id: String(user.id || ""),
    role: String(user.role || "SUPER_ADMIN"),
    schoolId: user.schoolId ?? null,
    platformRole: user.platformRole ?? null,
  };
}

function sendErr(res: Response, err: any, fallback: string) {
  res.status(err.status || 500).json({
    error: err.message || fallback,
    code: err.code,
  });
}

async function listDirectory(req: Request, res: Response, kind: DirectoryListKind) {
  try {
    const result = await superAdminService.listSchoolDirectory(req.params.id, kind, {
      q: req.query.q ? String(req.query.q) : undefined,
      page: req.query.page as string | undefined,
      pageSize: req.query.pageSize as string | undefined,
    });
    res.json(result);
  } catch (err: any) {
    sendErr(res, err, "Failed to list directory");
  }
}

export const superAdminController = {
  async getSchools(req: Request, res: Response) {
    try {
      await platformOpsService.assertSaCapability(actorFromReq(req), "schools.read");
      const result = await superAdminService.getSchools({
        q: req.query.q as string | undefined,
        status: req.query.status as string | undefined,
        page: req.query.page as string | undefined,
        pageSize: req.query.pageSize as string | undefined,
      });
      res.json(result);
    } catch (err: any) {
      sendErr(res, err, "Failed to fetch schools");
    }
  },

  async getSchool(req: Request, res: Response) {
    try {
      const school = await superAdminService.getSchoolById(req.params.id);
      const commercial = platformOpsService.enrichSchoolCommercial(school);
      let health = null;
      try {
        health = await platformOpsService.schoolHealth(req.params.id, actorFromReq(req));
      } catch {
        /* ignore if capability denied */
      }
      res.json({ ...commercial, health });
    } catch (err: any) {
      sendErr(res, err, "Failed to fetch school");
    }
  },

  async listSchoolStudents(req: Request, res: Response) {
    return listDirectory(req, res, "students");
  },

  async listSchoolStaff(req: Request, res: Response) {
    return listDirectory(req, res, "staff");
  },

  async listSchoolParents(req: Request, res: Response) {
    return listDirectory(req, res, "parents");
  },

  async resetUserPassword(req: Request, res: Response) {
    try {
      const result = await superAdminService.resetUserPassword(
        req.params.id,
        {
          password: req.body?.password,
          mustChangePassword: req.body?.mustChangePassword,
          reason: req.body?.reason,
        },
        actorFromReq(req),
        req
      );
      res.json(result);
    } catch (err: any) {
      sendErr(res, err, "Failed to reset password");
    }
  },

  async setUserActive(req: Request, res: Response) {
    try {
      const result = await platformOpsService.setUserActive(
        req.params.id,
        Boolean(req.body?.isActive),
        actorFromReq(req),
        req
      );
      res.json(result);
    } catch (err: any) {
      sendErr(res, err, "Failed to update user status");
    }
  },

  async registerSchool(req: Request, res: Response) {
    try {
      const result = await superAdminService.registerSchool(req.body, req);
      res.json(result);
    } catch (err: any) {
      if (err.message?.includes("already exists")) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: "Failed to register school" });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      res.json(await superAdminService.getStats());
    } catch (err) {
      console.error("SuperAdmin stats error:", err);
      res.status(500).json({ error: "Failed to fetch stats", message: (err as any).message });
    }
  },

  async getUsers(req: Request, res: Response) {
    try {
      await platformOpsService.assertSaCapability(actorFromReq(req), "users.read");
      const result = await superAdminService.getUsers({
        q: req.query.q ? String(req.query.q) : undefined,
        role: req.query.role ? String(req.query.role) : undefined,
        schoolId: req.query.schoolId ? String(req.query.schoolId) : undefined,
        isActive: req.query.isActive ? String(req.query.isActive) : undefined,
        page: req.query.page as string | undefined,
        pageSize: req.query.pageSize as string | undefined,
      });
      res.json(result);
    } catch (err: any) {
      sendErr(res, err, "Failed to fetch users");
    }
  },

  async getLogs(req: Request, res: Response) {
    try {
      await platformOpsService.assertSaCapability(actorFromReq(req), "audit.read");
      res.json(
        await superAdminService.getLogs({
          level: req.query.level ? String(req.query.level) : undefined,
          module: req.query.module ? String(req.query.module) : undefined,
          category: req.query.category ? String(req.query.category) : undefined,
          search: req.query.search ? String(req.query.search) : undefined,
          q: req.query.q ? String(req.query.q) : undefined,
          from: req.query.from ? String(req.query.from) : undefined,
          to: req.query.to ? String(req.query.to) : undefined,
          userId: req.query.userId ? String(req.query.userId) : undefined,
          schoolId: req.query.schoolId ? String(req.query.schoolId) : undefined,
          action: req.query.action ? String(req.query.action) : undefined,
          page: req.query.page as string | undefined,
          pageSize: req.query.pageSize as string | undefined,
        })
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to fetch logs");
    }
  },

  async getLogSummary(req: Request, res: Response) {
    try {
      res.json(
        await superAdminService.getLogSummary({
          from: req.query.from ? String(req.query.from) : undefined,
          to: req.query.to ? String(req.query.to) : undefined,
        })
      );
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch log summary" });
    }
  },

  async getCredentials(req: Request, res: Response) {
    try {
      res.json(await superAdminService.getCredentials());
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch credentials" });
    }
  },

  async createCredential(req: Request, res: Response) {
    try {
      res.json(await superAdminService.createCredential(req.body, req));
    } catch (err: any) {
      res.status(500).json({ error: "Failed to create credential", message: err.message });
    }
  },

  async deleteCredential(req: Request, res: Response) {
    try {
      await superAdminService.deleteCredential(req.params.id, req);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete credential", message: err.message });
    }
  },

  async getEmailSettings(req: Request, res: Response) {
    try {
      res.json(await emailSettingsService.getPublicSettings());
    } catch (err: any) {
      sendErr(res, err, "Failed to load email settings");
    }
  },

  async updateEmailSettings(req: Request, res: Response) {
    try {
      const actor = actorFromReq(req);
      res.json(
        await emailSettingsService.updateSettings(req.body || {}, actor.id, req)
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to save email settings");
    }
  },

  async sendTestEmail(req: Request, res: Response) {
    try {
      const actor = actorFromReq(req);
      const to = String(req.body?.to || "").trim();
      if (!to) {
        return res.status(400).json({ error: "Recipient email (to) is required" });
      }
      const result = await emailSettingsService.sendTestEmail(to, actor.id);
      res.json(result);
    } catch (err: any) {
      sendErr(res, err, "Failed to send test email");
    }
  },

  async updateSchoolStatus(req: Request, res: Response) {
    try {
      res.json(await superAdminService.updateSchoolStatus(req.params.id, req.body.status, req));
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update school status", message: err.message });
    }
  },

  async updateSchool(req: Request, res: Response) {
    try {
      res.json(await superAdminService.updateSchool(req.params.id, req.body));
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update school", message: err.message });
    }
  },

  async deleteSchool(req: Request, res: Response) {
    try {
      await superAdminService.deleteSchool(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete school", message: err.message });
    }
  },

  async resendInvite(req: Request, res: Response) {
    try {
      res.json(await superAdminService.resendSchoolInvite(req.params.id));
    } catch (err: any) {
      sendErr(res, err, "Failed to resend invite");
    }
  },

  async listRegistrations(req: Request, res: Response) {
    try {
      await platformOpsService.assertSaCapability(actorFromReq(req), "registrations.review");
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      res.json(
        await superAdminService.listRegistrations(status, {
          q: req.query.q as string | undefined,
          page: req.query.page as string | undefined,
          pageSize: req.query.pageSize as string | undefined,
        })
      );
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list registrations" });
    }
  },

  async getRegistration(req: Request, res: Response) {
    try {
      res.json(await superAdminService.getRegistration(req.params.id));
    } catch (err: any) {
      sendErr(res, err, "Failed to get registration");
    }
  },

  async approveRegistration(req: Request, res: Response) {
    try {
      res.json(
        await superAdminService.approveRegistration(req.params.id, (req as any).user?.id, req)
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to approve registration");
    }
  },

  async rejectRegistration(req: Request, res: Response) {
    try {
      const notes = String(req.body?.notes || req.body?.reviewNotes || "");
      res.json(
        await superAdminService.rejectRegistration(req.params.id, notes, (req as any).user?.id)
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to reject registration");
    }
  },

  async requestRegistrationInfo(req: Request, res: Response) {
    try {
      const notes = String(req.body?.notes || req.body?.reviewNotes || "");
      res.json(
        await superAdminService.requestRegistrationInfo(
          req.params.id,
          notes,
          (req as any).user?.id
        )
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to request info");
    }
  },

  async listPlans(_req: Request, res: Response) {
    try {
      res.json(await platformOpsService.listPlans());
    } catch (err: any) {
      sendErr(res, err, "Failed to list plans");
    }
  },

  async updatePlan(req: Request, res: Response) {
    try {
      res.json(
        await platformOpsService.updatePlan(req.params.code, req.body || {}, actorFromReq(req), req)
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to update plan");
    }
  },

  async createPlan(req: Request, res: Response) {
    try {
      res.status(201).json(
        await platformOpsService.createPlan(req.body || {}, actorFromReq(req), req)
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to create plan");
    }
  },

  async assignPlan(req: Request, res: Response) {
    try {
      res.json(
        await platformOpsService.assignPlan(req.params.id, req.body || {}, actorFromReq(req), req)
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to assign plan");
    }
  },

  async schoolHealth(req: Request, res: Response) {
    try {
      res.json(await platformOpsService.schoolHealth(req.params.id, actorFromReq(req)));
    } catch (err: any) {
      sendErr(res, err, "Failed to load school health");
    }
  },

  async updateNotes(req: Request, res: Response) {
    try {
      res.json(
        await platformOpsService.updateInternalNotes(
          req.params.id,
          String(req.body?.internalNotes ?? req.body?.notes ?? ""),
          actorFromReq(req),
          req
        )
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to update notes");
    }
  },

  async exportSchoolsCsv(req: Request, res: Response) {
    try {
      const csv = await platformOpsService.exportSchoolsCsv(actorFromReq(req));
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="schools.csv"');
      res.send(csv);
    } catch (err: any) {
      sendErr(res, err, "Failed to export schools");
    }
  },

  async exportUsersCsv(req: Request, res: Response) {
    try {
      const csv = await platformOpsService.exportUsersCsv(
        actorFromReq(req),
        req.query.schoolId ? String(req.query.schoolId) : undefined
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="users.csv"');
      res.send(csv);
    } catch (err: any) {
      sendErr(res, err, "Failed to export users");
    }
  },

  async exportDsr(req: Request, res: Response) {
    try {
      const data = await platformOpsService.exportSchoolDsr(req.params.id, actorFromReq(req));
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="dsr-${req.params.id}.json"`);
      res.json(data);
    } catch (err: any) {
      sendErr(res, err, "Failed to export DSR");
    }
  },

  async getPlatformSettings(req: Request, res: Response) {
    try {
      res.json(await platformOpsService.getPlatformSettings(actorFromReq(req)));
    } catch (err: any) {
      sendErr(res, err, "Failed to load settings");
    }
  },

  async updatePlatformSettings(req: Request, res: Response) {
    try {
      res.json(
        await platformOpsService.updatePlatformSettings(req.body || {}, actorFromReq(req), req)
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to update settings");
    }
  },

  async getActivity(req: Request, res: Response) {
    try {
      const { platformActivityService } = await import("../services/platformActivityService");
      res.json(
        await platformActivityService.listActivity(actorFromReq(req), {
          schoolId: req.query.schoolId ? String(req.query.schoolId) : undefined,
          from: req.query.from ? String(req.query.from) : undefined,
          to: req.query.to ? String(req.query.to) : undefined,
          domain: req.query.domain ? String(req.query.domain) : undefined,
          page: req.query.page ? Number(req.query.page) : undefined,
          pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        })
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to load activity");
    }
  },

  async exportActivityCsv(req: Request, res: Response) {
    try {
      const { platformActivityService } = await import("../services/platformActivityService");
      const csv = await platformActivityService.exportCsv(actorFromReq(req), {
        schoolId: req.query.schoolId ? String(req.query.schoolId) : undefined,
        from: req.query.from ? String(req.query.from) : undefined,
        to: req.query.to ? String(req.query.to) : undefined,
        domain: req.query.domain ? String(req.query.domain) : undefined,
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="platform-activity.csv"');
      res.send(csv);
    } catch (err: any) {
      sendErr(res, err, "Failed to export activity");
    }
  },

  async deliveryDiagnostics(req: Request, res: Response) {
    try {
      res.json(await platformOpsService.deliveryDiagnostics(actorFromReq(req)));
    } catch (err: any) {
      sendErr(res, err, "Failed to load diagnostics");
    }
  },

  async broadcast(req: Request, res: Response) {
    try {
      res.json(
        await platformOpsService.broadcastToSchoolAdmins(req.body || {}, actorFromReq(req), req)
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to broadcast");
    }
  },

  async impersonate(req: Request, res: Response) {
    try {
      res.json(
        await platformOpsService.startImpersonation(
          req.params.id,
          { reason: req.body?.reason, minutes: req.body?.minutes },
          actorFromReq(req),
          req
        )
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to start impersonation");
    }
  },

  async impersonateSchool(req: Request, res: Response) {
    try {
      res.json(
        await platformOpsService.startImpersonationBySchool(
          req.params.id,
          { reason: req.body?.reason, minutes: req.body?.minutes },
          actorFromReq(req),
          req
        )
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to start impersonation");
    }
  },

  async endImpersonation(req: Request, res: Response) {
    try {
      res.json(await platformOpsService.endImpersonation(actorFromReq(req), req));
    } catch (err: any) {
      sendErr(res, err, "Failed to end impersonation");
    }
  },

  async listOperators(req: Request, res: Response) {
    try {
      res.json(await platformOpsService.listOperators(actorFromReq(req)));
    } catch (err: any) {
      sendErr(res, err, "Failed to list operators");
    }
  },

  async setOperatorRole(req: Request, res: Response) {
    try {
      res.json(
        await platformOpsService.setOperatorRole(
          req.params.id,
          String(req.body?.platformRole || ""),
          actorFromReq(req),
          req
        )
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to update operator role");
    }
  },

  async createOperator(req: Request, res: Response) {
    try {
      res.status(201).json(
        await platformOpsService.createOperator(req.body || {}, actorFromReq(req), req)
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to create operator");
    }
  },

  async setOperatorActive(req: Request, res: Response) {
    try {
      if (typeof req.body?.isActive !== "boolean") {
        return res.status(400).json({ error: "isActive boolean required" });
      }
      res.json(
        await platformOpsService.setOperatorActive(
          req.params.id,
          req.body.isActive,
          actorFromReq(req),
          req
        )
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to update operator");
    }
  },

  async resetOperatorPassword(req: Request, res: Response) {
    try {
      res.json(await platformOpsService.resetOperatorPassword(req.params.id, actorFromReq(req), req));
    } catch (err: any) {
      sendErr(res, err, "Failed to reset operator password");
    }
  },

  async requestDelete(req: Request, res: Response) {
    try {
      res.json(
        await platformOpsService.requestSchoolDelete(
          req.params.id,
          String(req.body?.reason || ""),
          actorFromReq(req),
          req
        )
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to request delete");
    }
  },

  async approveDelete(req: Request, res: Response) {
    try {
      res.json(
        await platformOpsService.approveSchoolDelete(
          req.params.requestId,
          actorFromReq(req),
          { forceSelfApprove: Boolean(req.body?.forceSelfApprove) },
          req
        )
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to approve delete");
    }
  },

  async listPendingDeletes(req: Request, res: Response) {
    try {
      res.json(await platformOpsService.listPendingDeletes(actorFromReq(req)));
    } catch (err: any) {
      sendErr(res, err, "Failed to list delete requests");
    }
  },

  async reportsBreakdown(req: Request, res: Response) {
    try {
      res.json(await platformOpsService.reportsBreakdown(actorFromReq(req)));
    } catch (err: any) {
      sendErr(res, err, "Failed to load reports");
    }
  },

  async updateBilling(req: Request, res: Response) {
    try {
      res.json(
        await platformOpsService.updateSchoolBilling(
          req.params.id,
          { billingStatus: String(req.body?.billingStatus || ""), reason: req.body?.reason },
          actorFromReq(req),
          req
        )
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to update billing");
    }
  },

  async startBillingCheckout(req: Request, res: Response) {
    try {
      res.json(await platformOpsService.startBillingCheckout(req.params.id, actorFromReq(req), req));
    } catch (err: any) {
      sendErr(res, err, "Failed to start checkout");
    }
  },

  async completeConsoleCheckout(req: Request, res: Response) {
    try {
      res.json(
        await platformOpsService.completeConsoleCheckout(
          String(req.body?.sessionId || ""),
          actorFromReq(req),
          req
        )
      );
    } catch (err: any) {
      sendErr(res, err, "Failed to complete console checkout");
    }
  },

  async platformStripeWebhook(req: Request, res: Response) {
    try {
      const raw = (req as any).rawBody || JSON.stringify(req.body || {});
      const result = await platformOpsService.handlePlatformStripeWebhook(
        raw,
        req.headers["stripe-signature"] as string | undefined
      );
      res.json(result);
    } catch (err: any) {
      sendErr(res, err, "Webhook failed");
    }
  },

  async setDomain(req: Request, res: Response) {
    try {
      const domain =
        req.body?.customDomain === null || req.body?.customDomain === ""
          ? null
          : String(req.body?.customDomain || "");
      res.json(await platformOpsService.setCustomDomain(req.params.id, domain, actorFromReq(req), req));
    } catch (err: any) {
      sendErr(res, err, "Failed to set domain");
    }
  },

  async verifyDomain(req: Request, res: Response) {
    try {
      res.json(await platformOpsService.verifyCustomDomain(req.params.id, actorFromReq(req), req));
    } catch (err: any) {
      const payload: any = {
        error: err.message || "Domain verify failed",
        code: err.code,
      };
      if (err.found) payload.found = err.found;
      res.status(err.status || 500).json(payload);
    }
  },

  async getDomainEdge(req: Request, res: Response) {
    try {
      res.json(await platformOpsService.getDomainEdgeGuide(actorFromReq(req)));
    } catch (err: any) {
      sendErr(res, err, "Failed to load domain edge guide");
    }
  },
};
