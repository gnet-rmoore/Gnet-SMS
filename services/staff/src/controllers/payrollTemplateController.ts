import type { Request, Response } from "express";
import {
  PayrollTemplateError,
  payrollTemplateService,
} from "../services/payrollTemplateService";

function errorStatus(error: any): number {
  if (error instanceof PayrollTemplateError) return error.status;
  if (error?.code === "P2002") return 409;
  if (/not found/i.test(String(error?.message || ""))) return 404;
  return 500;
}

function errorMessage(error: any, fallback: string): string {
  if (error?.code === "P2002") {
    return "A payroll template with that name already exists";
  }
  return String(error?.message || fallback);
}

/** Payroll template CRUD + monthly run/preview endpoints. */
export const payrollTemplateController = {
  async listTemplates(req: Request, res: Response) {
    try {
      const templates = await payrollTemplateService.listTemplates(req.params.schoolId);
      res.json(templates);
    } catch (error: any) {
      res.status(errorStatus(error)).json({ error: errorMessage(error, "Failed to load templates") });
    }
  },

  async createTemplate(req: Request, res: Response) {
    try {
      const createdBy = (req as any).user?.id ?? null;
      const template = await payrollTemplateService.createTemplate(
        req.params.schoolId,
        createdBy,
        req.body
      );
      res.status(201).json(template);
    } catch (error: any) {
      res.status(errorStatus(error)).json({ error: errorMessage(error, "Failed to create template") });
    }
  },

  async createFromPayrolls(req: Request, res: Response) {
    try {
      const createdBy = (req as any).user?.id ?? null;
      const template = await payrollTemplateService.createFromPayrolls(
        req.params.schoolId,
        createdBy,
        req.body
      );
      res.status(201).json(template);
    } catch (error: any) {
      res
        .status(errorStatus(error))
        .json({ error: errorMessage(error, "Failed to create template from payroll") });
    }
  },

  async updateTemplate(req: Request, res: Response) {
    try {
      const template = await payrollTemplateService.updateTemplate(
        req.params.id,
        req.body
      );
      res.json(template);
    } catch (error: any) {
      res.status(errorStatus(error)).json({ error: errorMessage(error, "Failed to update template") });
    }
  },

  async deleteTemplate(req: Request, res: Response) {
    try {
      await payrollTemplateService.deleteTemplate(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(errorStatus(error)).json({ error: errorMessage(error, "Failed to delete template") });
    }
  },

  async previewTemplate(req: Request, res: Response) {
    try {
      const month = Number(req.query.month || new Date().getMonth() + 1);
      const year = Number(req.query.year || new Date().getFullYear());
      const preview = await payrollTemplateService.previewTemplate(
        req.params.id,
        month,
        year
      );
      res.json(preview);
    } catch (error: any) {
      res.status(errorStatus(error)).json({ error: errorMessage(error, "Failed to preview template") });
    }
  },

  async runTemplate(req: Request, res: Response) {
    try {
      const result = await payrollTemplateService.runTemplate(
        req.params.id,
        req.body.month,
        req.body.year
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(errorStatus(error)).json({ error: errorMessage(error, "Failed to run template") });
    }
  },
};
