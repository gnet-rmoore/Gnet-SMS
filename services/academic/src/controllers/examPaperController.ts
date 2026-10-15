import type { Request, Response } from "express";
import { examPaperService } from "../services/examPaperService";

const REVIEWER_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"];
const TEACHER_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"];

function isReviewer(role: string) {
  return REVIEWER_ROLES.includes(role);
}

export const examPaperController = {
  async getPaper(req: Request, res: Response) {
    const user = (req as any).user;
    if (!TEACHER_ROLES.includes(user.role) && !["STUDENT", "PARENT"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      // Students/parents get limited view via online exams list; full paper for staff
      if (["STUDENT", "PARENT"].includes(user.role)) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const data = await examPaperService.getOrCreateDraft(
        req.params.id,
        user.schoolId,
        user.id
      );
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load paper" });
    }
  },

  async updatePaper(req: Request, res: Response) {
    const user = (req as any).user;
    if (!TEACHER_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await examPaperService.updateDraft(
        req.params.id,
        user.schoolId,
        user.id,
        req.body || {}
      );
      res.json(data);
    } catch (err: any) {
      res
        .status(err.status || 500)
        .json({ error: err.message || "Failed to update paper", code: err.code });
    }
  },

  async presignPdf(req: Request, res: Response) {
    const user = (req as any).user;
    if (!TEACHER_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await examPaperService.presignPdf(
        req.params.id,
        user.schoolId,
        user.id,
        String(req.body?.fileName || "paper.pdf"),
        String(req.body?.mimeType || "application/pdf")
      );
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to presign" });
    }
  },

  async confirmPdf(req: Request, res: Response) {
    const user = (req as any).user;
    if (!TEACHER_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await examPaperService.confirmPdf(
        req.params.id,
        user.schoolId,
        user.id,
        req.body
      );
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to confirm PDF" });
    }
  },

  async clearPdf(req: Request, res: Response) {
    const user = (req as any).user;
    if (!TEACHER_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await examPaperService.clearPdf(req.params.id, user.schoolId, user.id);
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to clear PDF" });
    }
  },

  async submit(req: Request, res: Response) {
    const user = (req as any).user;
    if (!TEACHER_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await examPaperService.submit(req.params.id, user.schoolId, user.id);
      res.json(data);
    } catch (err: any) {
      res
        .status(err.status || 500)
        .json({ error: err.message || "Failed to submit", code: err.code });
    }
  },

  async listPending(req: Request, res: Response) {
    const user = (req as any).user;
    if (!isReviewer(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const rows = await examPaperService.listPendingEnriched(req.params.schoolId);
      res.json(rows);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to list" });
    }
  },

  async review(req: Request, res: Response) {
    const user = (req as any).user;
    if (!isReviewer(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await examPaperService.review(
        req.params.packageId,
        user.schoolId,
        user.id,
        req.body
      );
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to review" });
    }
  },

  async pdfDownload(req: Request, res: Response) {
    const user = (req as any).user;
    if (!TEACHER_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await examPaperService.pdfDownloadUrl(req.params.id, user.schoolId);
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to get PDF" });
    }
  },

  async setRoster(req: Request, res: Response) {
    const user = (req as any).user;
    if (!TEACHER_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const rows = await examPaperService.setRoster(
        req.params.id,
        user.schoolId,
        req.body?.entries || []
      );
      res.json(rows);
    } catch (err: any) {
      res
        .status(err.status || 500)
        .json({ error: err.message || "Failed to save roster", code: err.code });
    }
  },

  async listRevisions(req: Request, res: Response) {
    const user = (req as any).user;
    if (!TEACHER_ROLES.includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const rows = await examPaperService.listRevisions(req.params.id, user.schoolId);
      res.json(rows);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to list revisions" });
    }
  },
};
