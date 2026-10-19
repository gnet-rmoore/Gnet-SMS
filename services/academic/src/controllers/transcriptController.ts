import type { Request, Response } from "express";
import { transcriptService } from "../services/transcriptService";

function actorOf(req: Request) {
  const user = (req as any).user || {};
  return {
    id: String(user.id || ""),
    name: String(user.name || ""),
    role: String(user.role || ""),
    schoolId: String(user.schoolId || ""),
  };
}

function fail(res: Response, err: any, fallback: string) {
  const status = Number(err?.status) || 500;
  const payload: Record<string, unknown> = { error: err?.message || fallback };
  if (err?.code) payload.code = err.code;
  if (status >= 500) console.error("[transcripts]", err);
  res.status(status).json(payload);
}

export const transcriptController = {
  async list(req: Request, res: Response) {
    try {
      const schoolId = String(req.params.schoolId || "");
      const records = await transcriptService.listTranscripts(schoolId, {
        status: (req.query.status as string) || null,
        studentId: (req.query.studentId as string) || null,
        academicYear: (req.query.academicYear as string) || null,
      });
      res.json(records);
    } catch (err: any) {
      fail(res, err, "Failed to load transcripts");
    }
  },

  async get(req: Request, res: Response) {
    try {
      res.json(await transcriptService.getTranscript(String(req.params.id)));
    } catch (err: any) {
      fail(res, err, "Failed to load transcript");
    }
  },

  async prepare(req: Request, res: Response) {
    try {
      const actor = actorOf(req);
      const record = await transcriptService.prepareTranscript(
        actor,
        String(req.params.schoolId || ""),
        {
          studentId: req.body?.studentId,
          templateKey: req.body?.templateKey,
          academicYear: req.body?.academicYear,
          gradeLevel: req.body?.gradeLevel,
        }
      );
      res.status(201).json(record);
    } catch (err: any) {
      fail(res, err, "Failed to prepare transcript");
    }
  },

  async submit(req: Request, res: Response) {
    try {
      const record = await transcriptService.submitTranscript(
        String(req.params.id),
        actorOf(req)
      );
      res.json(record);
    } catch (err: any) {
      fail(res, err, "Failed to submit transcript");
    }
  },

  async approve(req: Request, res: Response) {
    try {
      const record = await transcriptService.reviewTranscript(
        String(req.params.id),
        actorOf(req),
        "APPROVE",
        req.body?.comment
      );
      res.json(record);
    } catch (err: any) {
      fail(res, err, "Failed to approve transcript");
    }
  },

  async reject(req: Request, res: Response) {
    try {
      const record = await transcriptService.reviewTranscript(
        String(req.params.id),
        actorOf(req),
        "REJECT",
        req.body?.comment
      );
      res.json(record);
    } catch (err: any) {
      fail(res, err, "Failed to return transcript");
    }
  },

  async pdf(req: Request, res: Response) {
    try {
      const { buffer, filename } = await transcriptService.buildPdf(String(req.params.id));
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", String(buffer.length));
      res.send(buffer);
    } catch (err: any) {
      fail(res, err, "Failed to generate transcript PDF");
    }
  },
};
