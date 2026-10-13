import type { Request, Response } from "express";
import { assertParentLinked } from "../lib/identityClient";
import { myCampusService } from "../services/myCampusService";

async function resolveStudentId(req: Request, schoolId: string): Promise<string | { status: number; error: string }> {
  const user = (req as any).user;
  if (!user) return { status: 401, error: "Unauthorized" };

  if (user.role === "STUDENT") {
    if (user.schoolId !== schoolId) return { status: 403, error: "Forbidden" };
    return String(user.id);
  }

  if (user.role === "PARENT") {
    const studentId = typeof req.query.studentId === "string" ? req.query.studentId.trim() : "";
    if (!studentId) {
      return { status: 400, error: "studentId query parameter is required for parent accounts" };
    }
    const linked = await assertParentLinked(String(user.id), studentId);
    if (!linked) return { status: 403, error: "Forbidden: student is not linked to this parent account" };
    return studentId;
  }

  return { status: 403, error: "Forbidden: family portal is for students and parents only" };
}

export const myCampusController = {
  async getSummary(req: Request, res: Response) {
    const { schoolId } = req.params;
    try {
      const studentId = await resolveStudentId(req, schoolId);
      if (typeof studentId !== "string") {
        return res.status(studentId.status).json({ error: studentId.error });
      }
      const summary = await myCampusService.getSummary(schoolId, studentId);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to load campus summary" });
    }
  },
};
