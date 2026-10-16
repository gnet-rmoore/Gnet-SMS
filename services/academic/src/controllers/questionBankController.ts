import type { Request, Response } from "express";
import { questionBankService } from "../services/questionBankService";

/** Staff who may use the question bank (authors). */
const BANK_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"];

function staffCanAuthor(role: string) {
  return BANK_ROLES.includes(role);
}

function actorOf(user: any) {
  return { id: user.id as string, role: user.role as string };
}

export const questionBankController = {
  /** List bank items visible to the caller (subject/grade scoped for teachers). */
  async list(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) return res.status(403).json({ error: "Unauthorized" });
    try {
      const data = await questionBankService.listItems(req.params.schoolId, actorOf(user), {
        type: req.query.type as string | undefined,
        subjectId: req.query.subjectId as string | undefined,
        gradeLevelId: req.query.gradeLevelId as string | undefined,
        visibility: req.query.visibility as string | undefined,
        mine: req.query.mine === "true" || req.query.mine === "1",
        search: req.query.search as string | undefined,
      });
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to list bank items" });
    }
  },

  async get(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) return res.status(403).json({ error: "Unauthorized" });
    try {
      const data = await questionBankService.getItem(req.params.itemId, req.params.schoolId, actorOf(user));
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load bank item", code: err.code });
    }
  },

  /** Create one or more bank items from an array of question inputs. */
  async create(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) return res.status(403).json({ error: "Unauthorized" });
    try {
      const { questions, ...taxonomy } = req.body || {};
      const data = await questionBankService.createItems(
        req.params.schoolId,
        actorOf(user),
        questions,
        taxonomy
      );
      res.status(201).json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to save bank items", code: err.code });
    }
  },

  async update(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) return res.status(403).json({ error: "Unauthorized" });
    try {
      const { question, ...taxonomy } = req.body || {};
      const data = await questionBankService.updateItem(
        req.params.itemId,
        req.params.schoolId,
        actorOf(user),
        question,
        taxonomy
      );
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to update bank item", code: err.code });
    }
  },

  async remove(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) return res.status(403).json({ error: "Unauthorized" });
    try {
      const data = await questionBankService.deleteItem(req.params.itemId, req.params.schoolId, actorOf(user));
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to delete bank item", code: err.code });
    }
  },

  /** Copy selected (or all) exam questions into the bank. */
  async saveFromExam(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) return res.status(403).json({ error: "Unauthorized" });
    try {
      const schoolId = (req as any).resourceSchoolId || user.schoolId;
      const { questionIds, ...taxonomy } = req.body || {};
      const data = await questionBankService.saveFromExam(
        schoolId,
        actorOf(user),
        req.params.id,
        { ...taxonomy, questionIds }
      );
      res.status(201).json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to save to bank", code: err.code });
    }
  },
};
