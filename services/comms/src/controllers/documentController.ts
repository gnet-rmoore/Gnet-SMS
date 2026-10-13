import type { Request, Response } from "express";
import { documentService } from "../services/documentService";

/** Roles that may browse the full school document library (no role filter). */
const MANAGE_ROLES = new Set([
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
]);

/** Ported from src/server/controllers/documentController.ts — with role scoping + enrichment. */
export const documentController = {
  async getDocuments(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const queryRole = typeof req.query.role === "string" ? req.query.role : undefined;
      const userRole = (req as any).user?.role as string | undefined;
      const isManager = Boolean(userRole && MANAGE_ROLES.has(userRole));

      // Non-managers always see only their own role's docs — ignore spoofed ?role=.
      // Managers may optionally filter with ?role=; otherwise see the full library.
      let roleFilter: string | undefined;
      if (!isManager) {
        roleFilter = userRole;
      } else if (queryRole) {
        roleFilter = queryRole;
      }

      const documents = await documentService.getDocuments(schoolId, roleFilter);
      res.json(documents);
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message });
    }
  },

  async createDocument(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const userId = (req as any).user?.id as string | undefined;
      const { title, description, fileUrl, fileType, category, accessRoles, uploadedBy, fileSizeBytes } =
        req.body;

      if (!userId && !uploadedBy) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const document = await documentService.createDocument({
        schoolId,
        title,
        description,
        fileUrl,
        fileType,
        category,
        accessRoles,
        uploadedBy: uploadedBy || userId,
        fileSizeBytes,
      });
      res.status(201).json(document);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.message,
        code: error.code,
        quota: error.quota,
        limit: error.limit,
      });
    }
  },

  async updateDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const document = await documentService.updateDocument(id, req.body);
      res.json(document);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: error.message,
        code: error.code,
        quota: error.quota,
        limit: error.limit,
      });
    }
  },

  async deleteDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await documentService.deleteDocument(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message });
    }
  },
};
