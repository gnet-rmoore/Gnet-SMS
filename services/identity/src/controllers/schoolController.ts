import type { Request, Response } from "express";
import { schoolService } from "../services/schoolService";

/** Ported from src/server/controllers/schoolController.ts */
export const schoolController = {
  async getBySlugPublic(req: Request, res: Response) {
    try {
      const school = await schoolService.getBySlugPublic(String(req.params.slug || ""));
      if (!school) return res.status(404).json({ error: "School not found or not accepting applications" });
      res.json(school);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getSchool(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;

    if (user?.role !== "SUPER_ADMIN" && user?.schoolId !== schoolId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const school = await schoolService.getSchoolById(schoolId);
      if (!school) return res.status(404).json({ error: "School not found" });
      res.json(school);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch school" });
    }
  },

  async getSchoolInternal(req: Request, res: Response) {
    try {
      const school = await schoolService.getSchoolById(String(req.params.schoolId || ""));
      if (!school) return res.status(404).json({ error: "School not found" });
      res.json({
        id: school.id,
        name: school.name,
        slug: school.slug,
        status: school.status,
        trialEndsAt: school.trialEndsAt,
        logoUrl: school.logoUrl,
        contactEmail: school.contactEmail,
        contactPhone: school.contactPhone,
        address: school.address,
        brandColor: school.brandColor,
        defaultLocale: school.defaultLocale,
        receiptTemplate: school.receiptTemplate,
        receiptTemplates: school.receiptTemplates,
        receiptTemplatesByRole: school.receiptTemplatesByRole,
        documentSignatories: school.documentSignatories,
        country: school.country,
        region: school.region,
        city: school.city,
        timezone: school.timezone,
        holidayEnabled: school.holidayEnabled,
        holidayTypes: school.holidayTypes,
        gradebookConfig: school.gradebookConfig,
        admissionPolicy: school.admissionPolicy,
        payrollAttendanceRules: school.payrollAttendanceRules,
        securityPolicy: school.securityPolicy,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch school" });
    }
  },

  async getEntitlementsInternal(req: Request, res: Response) {
    try {
      const entitlements = await schoolService.getSchoolEntitlements(String(req.params.schoolId || ""));
      if (!entitlements) return res.status(404).json({ error: "School not found" });
      res.json({ entitlements });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch entitlements" });
    }
  },

  async getQuotasInternal(req: Request, res: Response) {
    try {
      const ctx = await schoolService.getSchoolCommercial(String(req.params.schoolId || ""));
      if (!ctx) return res.status(404).json({ error: "School not found" });
      res.json(ctx.quotas);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch quotas" });
    }
  },

  async getEntitlementsForTenant(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    if (user?.role !== "SUPER_ADMIN" && user?.schoolId !== schoolId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const ctx = await schoolService.getSchoolCommercial(String(schoolId));
      if (!ctx) return res.status(404).json({ error: "School not found" });
      res.json(ctx);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch entitlements" });
    }
  },

  async getSubscriptionForTenant(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    if (user?.role !== "SUPER_ADMIN" && user?.schoolId !== schoolId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const subscription = await schoolService.getSchoolSubscription(String(schoolId));
      if (!subscription) return res.status(404).json({ error: "School not found" });
      res.json(subscription);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch subscription" });
    }
  },

  async getStats(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;

    if (user?.role !== "SUPER_ADMIN" && user?.schoolId !== schoolId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const stats = await schoolService.getSchoolStats(schoolId);
      res.json(stats);
    } catch (error) {
      console.error(`Error fetching stats for school ${schoolId}:`, error);
      res.status(500).json({ error: "Failed to fetch stats", message: (error as any).message });
    }
  },

  async updateSchool(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;

    if (user?.role !== "SUPER_ADMIN" && user?.schoolId !== schoolId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const updatedSchool = await schoolService.updateSchool(schoolId, req.body);
      res.json(updatedSchool);
    } catch (error) {
      res.status(500).json({ error: "Failed to update school" });
    }
  },

  async updateReceiptTemplate(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;

    if (user?.role !== "SUPER_ADMIN" && user?.schoolId !== schoolId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const updatedSchool = await schoolService.updateReceiptTemplate(
        schoolId,
        String(user?.role || ""),
        {
          receiptTemplate: req.body?.receiptTemplate
            ? String(req.body.receiptTemplate)
            : undefined,
          receiptTemplates: req.body?.receiptTemplates,
        }
      );
      res.json(updatedSchool);
    } catch (error: any) {
      const msg = String(error?.message || "");
      if (msg.includes("cannot configure")) {
        return res.status(403).json({ error: msg });
      }
      res.status(500).json({ error: "Failed to update receipt template" });
    }
  },

  async completeOnboarding(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    if (user?.role !== "SUPER_ADMIN" && user?.schoolId !== schoolId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const school = await schoolService.completeOnboarding(schoolId);
      res.json(school);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async setAdmissionPolicyReviewed(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    if (user?.role !== "SUPER_ADMIN" && user?.schoolId !== schoolId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const reviewed = Boolean(req.body?.reviewed);
      const school = await schoolService.setAdmissionPolicyReviewed(schoolId, reviewed);
      if (!school) return res.status(404).json({ error: "School not found" });
      res.json(school);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update admission policy review state" });
    }
  },

  async getAdmissionPolicy(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    if (user?.role !== "SUPER_ADMIN" && user?.schoolId !== schoolId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const row = await schoolService.getAdmissionPolicy(schoolId);
      if (!row) return res.status(404).json({ error: "School not found" });
      res.json(row);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to load admission policy" });
    }
  },

  async updateAdmissionPolicy(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    if (user?.role !== "SUPER_ADMIN" && user?.schoolId !== schoolId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const row = await schoolService.updateAdmissionPolicy(schoolId, req.body || {});
      res.json(row);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to update admission policy" });
    }
  },

  async presignBackgroundUpload(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    if (user?.role !== "SUPER_ADMIN" && user?.schoolId !== schoolId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const result = await schoolService.presignBackgroundUpload(schoolId, req.body || {});
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to prepare background upload" });
    }
  },

  async uploadBackground(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    if (user?.role !== "SUPER_ADMIN" && user?.schoolId !== schoolId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: "Image body is required" });
      }
      const mimeType = String(req.headers["content-type"] || "image/jpeg").split(";")[0].trim();
      const rawName = String(req.headers["x-file-name"] || "background.jpg");
      let fileName = rawName;
      try {
        fileName = decodeURIComponent(rawName);
      } catch {}
      const result = await schoolService.uploadBackground(schoolId, {
        fileName,
        mimeType,
        body: req.body,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to upload background" });
    }
  },

  async getPublicBackground(req: Request, res: Response) {
    try {
      const result = await schoolService.getPublicBackground(
        String(req.params.slug || ""),
        String(req.query.key || "")
      );
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.send(result.body);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Background image not found" });
    }
  },

  async getAdmissionPolicyInternal(req: Request, res: Response) {
    try {
      const row = await schoolService.getAdmissionPolicy(String(req.params.schoolId || ""));
      if (!row) return res.status(404).json({ error: "School not found" });
      res.json(row);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getPublicGradeLevels(req: Request, res: Response) {
    try {
      const school = await schoolService.getBySlugPublic(String(req.params.slug || ""));
      if (!school) {
        return res.status(404).json({ error: "School not found or not accepting applications" });
      }
      if (!school.admissionPolicy?.publicApplyEnabled) {
        return res.status(403).json({ error: "Online applications are disabled" });
      }
      const { fetchSchoolGradeLevelsInternal } = await import("../lib/academicClient");
      const grades = await fetchSchoolGradeLevelsInternal(school.id);
      res.json(Array.isArray(grades) ? grades : []);
    } catch (err: any) {
      console.warn("[identity] public grade-levels:", err.message);
      res.json([]);
    }
  },
};
