import type { Request, Response } from "express";
import { admissionService } from "../services/admissionService";
import {
  allowPublicApply,
  applicationsToCsv,
} from "../domain/admissionReporting";

export const admissionController = {
  async getMyApplications(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    try {
      if (user.role !== "PARENT" || user.schoolId !== schoolId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const items = await admissionService.getMyApplications(schoolId, user);
      res.json(items);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load applications" });
    }
  },

  async getApplications(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const result = await admissionService.getApplications(schoolId, {
        q: req.query.q ? String(req.query.q) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        gradeLevelId: req.query.gradeLevelId ? String(req.query.gradeLevelId) : undefined,
        page: req.query.page as string | undefined,
        pageSize: req.query.pageSize as string | undefined,
      });
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  },

  async getNextAction(req: Request, res: Response) {
    try {
      const result = await admissionService.getNextAction(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to resolve next action" });
    }
  },

  async getFunnel(req: Request, res: Response) {
    const { schoolId } = req.params;
    try {
      const rows = await admissionService.getApplicationStatusCounts(schoolId);
      const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.count]));
      const total = rows.reduce((n, r) => n + r.count, 0);
      res.json({
        total,
        byStatus,
        waitlisted: byStatus.WAITLISTED || 0,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to compute funnel" });
    }
  },

  /** Identity dashboard stats — live admission counts for a school. */
  async getAdmissionStatsInternal(req: Request, res: Response) {
    const { schoolId } = req.params;
    try {
      const rows = await admissionService.getApplicationStatusCounts(schoolId);
      const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.count]));
      const totalApplications = rows.reduce((n, r) => n + r.count, 0);
      // "Pending" = still awaiting staff action (waitlisted/terminal states excluded).
      const pendingStatuses = ["PENDING", "UNDER_REVIEW", "DOCS_PENDING", "FEE_PENDING"];
      const pendingApplications = pendingStatuses.reduce(
        (n, status) => n + (byStatus[status] || 0),
        0
      );
      res.json({ totalApplications, pendingApplications });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to compute admission stats" });
    }
  },

  async exportCsv(req: Request, res: Response) {
    const { schoolId } = req.params;
    try {
      const { items: applications } = await admissionService.getApplications(schoolId, {
        page: 1,
        pageSize: 5000,
        maxPageSize: 5000,
      });
      const status = String(req.query.status || "").trim();
      const filtered =
        status && status !== "ALL"
          ? applications.filter((a) => a.status === status)
          : applications;
      const csv = applicationsToCsv(filtered);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="applications-${schoolId.slice(0, 8)}.csv"`
      );
      res.send(csv);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to export applications" });
    }
  },

  async createApplication(req: Request, res: Response) {
    const { schoolId } = req.params;
    try {
      const application = await admissionService.createApplication(schoolId, req.body, "STAFF_DIRECT");
      res.json(application);
    } catch (err: any) {
      console.error(err);
      res.status(err.status || 500).json({ error: err.message || "Failed to create application" });
    }
  },

  async updateApplication(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const application = await admissionService.updateApplication(id, req.body);
      res.json(application);
    } catch (err: any) {
      console.error(err);
      res.status(err.status || 500).json({
        error: err.message || "Failed to update application",
        code: err.code,
      });
    }
  },

  async transition(req: Request, res: Response) {
    try {
      const result = await admissionService.transition(req.params.id, String(req.body?.to || ""), {
        ...req.body,
        reviewedBy: (req as any).user?.id,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  async enroll(req: Request, res: Response) {
    try {
      const result = await admissionService.enroll(req.params.id, {
        classroomId: req.body?.classroomId,
        waiveFee: !!req.body?.waiveFee,
        waiveDocs: !!req.body?.waiveDocs,
        idempotencyKey: req.headers["idempotency-key"] as string,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  async withdraw(req: Request, res: Response) {
    try {
      const result = await admissionService.withdraw(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async addDocument(req: Request, res: Response) {
    try {
      const doc = await admissionService.addDocument(req.params.id, {
        ...req.body,
        uploadedBy: (req as any).user?.id,
      });
      res.status(201).json(doc);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async reviewDocument(req: Request, res: Response) {
    try {
      const status = req.body?.status === "REJECTED" ? "REJECTED" : "APPROVED";
      const doc = await admissionService.reviewDocument(
        req.params.docId,
        status,
        (req as any).user?.id,
        req.body?.reason
      );
      res.json(doc);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async createEntranceFee(req: Request, res: Response) {
    try {
      const amount = Number(req.body?.amount || 0);
      if (!(amount > 0)) return res.status(400).json({ error: "amount required" });
      const result = await admissionService.createEntranceFeeForApplication(req.params.id, amount);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async assignClassroom(req: Request, res: Response) {
    try {
      const result = await admissionService.assignClassroom(req.params.id, String(req.body?.classroomId || ""));
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async publicStatus(req: Request, res: Response) {
    try {
      const token = String(req.query.token || req.body?.token || "");
      const result = await admissionService.publicStatus(req.params.id, token);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 404).json({ error: "Not found" });
    }
  },

  async publicStatusLookup(req: Request, res: Response) {
    try {
      const schoolId = String(req.query.schoolId || "");
      const number = String(req.query.number || "");
      const token = String(req.query.token || "");
      const result = await admissionService.publicStatusByReference(schoolId, number, token);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 404).json({ error: err.message || "Not found" });
    }
  },

  async publicCreate(req: Request, res: Response) {
    try {
      if (req.body?.website) {
        return res.status(400).json({ error: "Invalid submission" });
      }
      const ip = String(req.ip || req.headers["x-forwarded-for"] || "unknown");
      const { assertCaptcha } = await import("../lib/captcha");
      await assertCaptcha(req.body?.captchaToken, ip);
      if (!allowPublicApply(ip)) {
        return res.status(429).json({ error: "Too many applications. Try again shortly." });
      }
      const schoolId = String(req.body?.schoolId || "");
      if (!schoolId) return res.status(400).json({ error: "schoolId required" });
      const applicantType =
        String(req.body?.applicantType || "").toUpperCase() === "RETURNING" ? "RETURNING" : "NEW";
      const { assertPublicApplyAllowed } = await import("../lib/identityClient");
      const { school } = await assertPublicApplyAllowed(schoolId, applicantType);
      const application = await admissionService.createApplication(
        schoolId,
        { ...req.body, applicantType },
        "PUBLIC"
      );
      res.status(201).json(application);

      // Fire-and-forget: email the applicant the reference number, access code,
      // and how to check their status.
      const { sendApplicationReceivedEmail } = await import("../lib/applicationEmail");
      void sendApplicationReceivedEmail({
        schoolName: school.name,
        slug: school.slug || schoolId,
        locale: school.defaultLocale || null,
        application,
      });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  async publicVerifyReturning(req: Request, res: Response) {
    try {
      if (req.body?.website) {
        return res.status(400).json({ error: "Invalid submission" });
      }
      const ip = String(req.ip || req.headers["x-forwarded-for"] || "unknown");
      const { assertCaptcha } = await import("../lib/captcha");
      await assertCaptcha(req.body?.captchaToken, ip);
      if (!allowPublicApply(ip)) {
        return res.status(429).json({ error: "Too many lookups. Try again shortly." });
      }
      const schoolId = String(req.body?.schoolId || "");
      if (!schoolId) return res.status(400).json({ error: "schoolId required" });
      const { assertPublicApplyAllowed } = await import("../lib/identityClient");
      await assertPublicApplyAllowed(schoolId, "RETURNING");
      const result = await admissionService.verifyReturningForPublic(schoolId, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code, outcome: err.outcome });
    }
  },

  async publicAddDocument(req: Request, res: Response) {
    try {
      const token = String(req.body?.token || req.query.token || "");
      await admissionService.publicStatus(req.params.id, token);
      const doc = await admissionService.addDocument(req.params.id, req.body);
      res.status(201).json(doc);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async publicConfirmUpload(req: Request, res: Response) {
    try {
      const token = String(req.body?.token || req.query.token || "");
      // Validate the applicant's access code before allowing the upload to be finalized.
      await admissionService.publicStatus(req.params.id, token);
      const doc = await admissionService.confirmDocumentUpload(req.params.id, {
        ...req.body,
        uploadedBy: null,
      });
      res.status(201).json(doc);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  async createUpload(req: Request, res: Response) {
    try {
      const result = await admissionService.createDocumentUpload(req.params.id, {
        ...req.body,
        uploadedBy: (req as any).user?.id,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  async confirmUpload(req: Request, res: Response) {
    try {
      const doc = await admissionService.confirmDocumentUpload(req.params.id, {
        ...req.body,
        uploadedBy: (req as any).user?.id,
      });
      res.status(201).json(doc);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  async publicCreateUpload(req: Request, res: Response) {
    try {
      const token = String(req.body?.token || "");
      await admissionService.publicStatus(req.params.id, token);
      const result = await admissionService.createDocumentUpload(req.params.id, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  async feePaidInternal(req: Request, res: Response) {
    try {
      const result = await admissionService.onFeePaid(
        String(req.body?.feeId || ""),
        req.body?.applicationId
      );
      res.json(result || { ok: true });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async getPlacementSummary(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const summary = await admissionService.getPlacementSummary(schoolId);
      res.json(summary);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load placement summary" });
    }
  },

  async bulkTransition(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const result = await admissionService.bulkTransition(schoolId, req.body || {});
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },

  async bulkEnroll(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const result = await admissionService.bulkEnroll(schoolId, req.body || {});
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message, code: err.code });
    }
  },
};
