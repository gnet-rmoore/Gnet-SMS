import type { Response } from "express";
import { promotionService } from "../services/promotionService";

function statusOf(err: any, fallback = 500) {
  return typeof err?.status === "number" ? err.status : fallback;
}

export const promotionController = {
  async captureCensus(req: any, res: Response) {
    try {
      const snap = await promotionService.captureCensus(
        req.params.schoolId,
        req.body?.schoolYearKey || req.query.schoolYearKey,
        req.user.id
      );
      res.status(201).json(snap);
    } catch (err: any) {
      res.status(statusOf(err, 400)).json({ error: err.message || "Failed to capture census" });
    }
  },

  async getCensus(req: any, res: Response) {
    try {
      const snap = await promotionService.getCensus(
        req.params.schoolId,
        String(req.query.schoolYearKey || "")
      );
      if (!snap) return res.status(404).json({ error: "Census not found" });
      res.json(snap);
    } catch (err: any) {
      res.status(statusOf(err, 400)).json({ error: err.message || "Failed to load census" });
    }
  },

  async createRun(req: any, res: Response) {
    try {
      const run = await promotionService.createRun(
        req.params.schoolId,
        req.body?.schoolYearKey,
        req.user.id
      );
      res.status(201).json(run);
    } catch (err: any) {
      res.status(statusOf(err, 400)).json({ error: err.message || "Failed to create run" });
    }
  },

  async listRuns(req: any, res: Response) {
    try {
      const runs = await promotionService.listRuns(
        req.params.schoolId,
        req.query.schoolYearKey ? String(req.query.schoolYearKey) : undefined
      );
      res.json(runs);
    } catch (err: any) {
      res.status(statusOf(err, 400)).json({ error: err.message || "Failed to list runs" });
    }
  },

  async getRun(req: any, res: Response) {
    try {
      const run = await promotionService.getRun(req.params.schoolId, req.params.runId);
      res.json(run);
    } catch (err: any) {
      res.status(statusOf(err, 404)).json({ error: err.message || "Failed to load run" });
    }
  },

  async upsertDecisions(req: any, res: Response) {
    try {
      const decisions = Array.isArray(req.body?.decisions) ? req.body.decisions : [];
      const run = await promotionService.upsertDecisions(
        req.params.schoolId,
        req.params.runId,
        decisions
      );
      res.json(run);
    } catch (err: any) {
      res.status(statusOf(err, 400)).json({ error: err.message || "Failed to save decisions" });
    }
  },

  async commitRun(req: any, res: Response) {
    try {
      const run = await promotionService.commitRun(
        req.params.schoolId,
        req.params.runId,
        req.user.id
      );
      res.json(run);
    } catch (err: any) {
      res.status(statusOf(err, 400)).json({ error: err.message || "Failed to commit run" });
    }
  },

  async getStatement(req: any, res: Response) {
    try {
      const statement = await promotionService.getStatement(
        req.params.schoolId,
        String(req.query.schoolYearKey || ""),
        req.query.runId ? String(req.query.runId) : undefined
      );
      res.json(statement);
    } catch (err: any) {
      res.status(statusOf(err, 400)).json({ error: err.message || "Failed to assemble statement" });
    }
  },

  async resolveStudentNextGradeInternal(req: any, res: Response) {
    try {
      const { schoolId, studentUserId } = req.params;
      const currentGradeLevelId = req.query.gradeLevelId
        ? String(req.query.gradeLevelId)
        : null;
      const result = await promotionService.resolveStudentNextGrade(
        schoolId,
        studentUserId,
        currentGradeLevelId
      );
      res.json(result);
    } catch (err: any) {
      res.status(statusOf(err, 400)).json({ error: err.message || "Failed to resolve next grade" });
    }
  },
};
