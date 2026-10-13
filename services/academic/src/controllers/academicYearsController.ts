import type { Response } from "express";
import { academicYearsService } from "../services/academicYearsService";

function statusOf(err: any, fallback = 500) {
  return typeof err?.status === "number" ? err.status : fallback;
}

export const academicYearsController = {
  async list(req: any, res: Response) {
    try {
      const years = await academicYearsService.list(req.params.schoolId);
      res.json(years);
    } catch (err: any) {
      res.status(statusOf(err, 500)).json({ error: err.message || "Failed to list academic years" });
    }
  },

  async getActive(req: any, res: Response) {
    try {
      const year = await academicYearsService.getActive(req.params.schoolId);
      res.json(year);
    } catch (err: any) {
      res.status(statusOf(err, 500)).json({ error: err.message || "Failed to load active year" });
    }
  },

  async getByKey(req: any, res: Response) {
    try {
      const year = await academicYearsService.getByKey(req.params.schoolId, req.params.yearKey);
      if (!year) return res.status(404).json({ error: "Academic year not found" });
      res.json(year);
    } catch (err: any) {
      res.status(statusOf(err, 400)).json({ error: err.message || "Failed to load academic year" });
    }
  },

  async start(req: any, res: Response) {
    try {
      const result = await academicYearsService.start(req.params.schoolId, req.user.id, req.body || {});
      res.status(201).json(result);
    } catch (err: any) {
      res.status(statusOf(err, 409)).json({ error: err.message || "Failed to start new school year" });
    }
  },

  async close(req: any, res: Response) {
    try {
      const result = await academicYearsService.close(req.params.schoolId, req.params.yearKey, req.user.id);
      res.json(result);
    } catch (err: any) {
      res.status(statusOf(err, 409)).json({ error: err.message || "Failed to close academic year" });
    }
  },

  async reactivate(req: any, res: Response) {
    try {
      const result = await academicYearsService.reactivate(req.params.schoolId, req.params.yearKey, req.user.id);
      res.json(result);
    } catch (err: any) {
      res.status(statusOf(err, 409)).json({ error: err.message || "Failed to reactivate academic year" });
    }
  },
};