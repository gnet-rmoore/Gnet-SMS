import type { Request, Response } from "express";
import { examService } from "../services/examService";
import { assertParentLinked } from "../lib/identityClient";

/** Ported verbatim from src/server/controllers/examController.ts */
export const examController = {
  async getPendingGrades(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const pendingGrades = await examService.getPendingGrades(schoolId, {
        page,
        limit,
      });
      res.json(pendingGrades);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch pending grades" });
    }
  },

  async getTeacherGradeSubmissions(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const teacherId =
        user.role === "TEACHER" ? user.id : String(req.query.teacherId || user.id);
      if (!teacherId) {
        return res.status(400).json({ error: "teacherId is required" });
      }
      const rows = await examService.getTeacherGradeSubmissions(schoolId, teacherId, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 50,
        status: req.query.status ? String(req.query.status) : undefined,
      });
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({
        error: err.message || "Failed to fetch grade submissions",
      });
    }
  },

  async bulkReviewGradeEntries(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const result = await examService.bulkReviewGradeEntries(
        schoolId,
        user.id,
        req.body
      );
      res.json(result);
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        error: err.message || "Failed to review grades",
        code: err.code,
      });
    }
  },

  async getExams(req: Request, res: Response) {
    const { schoolId } = req.params;
    try {
      const hasPaging = req.query.page != null || req.query.pageSize != null;
      const exams = await examService.getExams(schoolId, {
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        q: req.query.q as string | undefined,
        status: req.query.status as string | undefined,
        periodId: req.query.periodId as string | undefined,
      });
      if (hasPaging && exams && typeof exams === "object" && "items" in exams) {
        return res.json(exams);
      }
      res.json(exams);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch exams" });
    }
  },

  async createExam(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const exam = await examService.createExam(schoolId, req.body);
      res.status(201).json(exam);
    } catch (err: any) {
      const status = err?.status || 500;
      res.status(status).json({ error: err?.message || "Failed to create exam" });
    }
  },

  async updateExam(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const exam = await examService.updateExam(id, req.body);
      res.json(exam);
    } catch (err: any) {
      const status = err?.status || 500;
      res.status(status).json({ error: err?.message || "Failed to update exam" });
    }
  },

  async getExamById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const exam = await examService.getExamById(id);
      if (!exam) return res.status(404).json({ error: "Exam not found" });
      res.json(exam);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch exam" });
    }
  },

  async getTeacherClassrooms(req: Request, res: Response) {
    const { id: examId } = req.params;
    const user = (req as any).user;
    try {
      const classrooms = await examService.getTeacherClassrooms(examId, user.id);
      res.json(classrooms);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch teacher classrooms" });
    }
  },

  async getSubmissionsSummary(req: Request, res: Response) {
    const { id: examId } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const summary = await examService.getSubmissionsSummary(examId);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch submissions summary" });
    }
  },

  async getExamGrades(req: Request, res: Response) {
    const { id: examId } = req.params;
    const { classroomId, teacherId } = req.query as { classroomId: string; teacherId?: string };

    if (!classroomId) return res.status(400).json({ error: "Classroom ID is required" });

    try {
      const grades = await examService.getExamGrades(examId, classroomId, teacherId);
      res.json(grades);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch exam grades" });
    }
  },

  async upsertGradeEntry(req: Request, res: Response) {
    const { id: examId } = req.params;
    const user = (req as any).user;
    try {
      const gradeEntry = await examService.upsertGradeEntry(
        examId,
        user.id,
        user.schoolId,
        req.body,
        { role: user.role }
      );
      res.json(gradeEntry);
    } catch (err: any) {
      res
        .status(err.status || (err.message?.includes("locked") ? 403 : 500))
        .json({ error: err.message });
    }
  },

  async bulkUpsertGradeEntries(req: Request, res: Response) {
    const { id: examId } = req.params;
    const user = (req as any).user;
    try {
      const result = await examService.bulkUpsertGradeEntries(
        examId,
        user.id,
        user.schoolId,
        req.body,
        { role: user.role }
      );
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Bulk save failed" });
    }
  },

  async getComponentGrades(req: Request, res: Response) {
    const { schoolId } = req.params;
    const { classId, examComponentId, subjectId } = req.query as {
      classId?: string;
      examComponentId?: string;
      subjectId?: string;
    };
    if (!classId || !examComponentId) {
      return res
        .status(400)
        .json({ error: "classId and examComponentId are required" });
    }
    try {
      const grades = await examService.getComponentGrades(
        schoolId,
        classId,
        examComponentId,
        subjectId
      );
      res.json(grades);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch grades" });
    }
  },

  async getAssessmentGrades(req: Request, res: Response) {
    const { schoolId } = req.params;
    const { classId, examComponentId, subjectId } = req.query as {
      classId?: string;
      examComponentId?: string;
      subjectId?: string;
    };
    if (!classId || !examComponentId) {
      return res
        .status(400)
        .json({ error: "classId and examComponentId are required" });
    }
    try {
      const payload = await examService.getAssessmentGrades(
        schoolId,
        classId,
        examComponentId,
        subjectId
      );
      res.json(payload);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to fetch assessment grades" });
    }
  },

  async syncGradebookStructureTemplate(req: Request, res: Response) {
    const { schoolId } = req.params;
    try {
      const result = await examService.syncGradebookStructureTemplate(schoolId);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({
        error: err.message || "Failed to sync gradebook structure template",
      });
    }
  },

  async bulkUpsertComponentGrades(req: Request, res: Response) {
    const user = (req as any).user;
    try {
      const result = await examService.bulkUpsertComponentGrades(
        user.id,
        req.params.schoolId,
        req.body,
        { role: user.role }
      );
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Bulk save failed" });
    }
  },

  async getStudentGrades(req: Request, res: Response) {
    const { studentId } = req.params;
    const user = (req as any).user;
    try {
      if (user.role === "STUDENT" && user.id !== studentId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      if (user.role === "PARENT" && !(await assertParentLinked(user.id, studentId))) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const grades = await examService.getStudentGrades(studentId);
      res.json(grades);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch grades" });
    }
  },

  async updateGradeEntryStatus(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const updated = await examService.updateGradeEntryStatus(id, user.id, req.body);
      res.json(updated);
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        error: err.message || "Failed to update grade status",
        code: err.code,
      });
    }
  },

  async reopenGradeEntry(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const updated = await examService.reopenGradeEntry(id, user.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(err.status || 500).json({
        error: err.message || "Failed to reopen grade",
        code: err.code,
      });
    }
  },

  async releaseGrades(req: Request, res: Response) {
    const { id: examId } = req.params;
    const { isGradesReleased } = req.body;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const updated = await examService.releaseGrades(examId, isGradesReleased);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to release grades" });
    }
  },

  async processResults(req: Request, res: Response) {
    const { id: examId } = req.params;
    const user = (req as any).user;

    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const results = await examService.processResults(examId);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async listGradeEditGrants(req: Request, res: Response) {
    try {
      const { gradeEditGrantService } = await import("../services/gradeEditGrantService");
      const rows = await gradeEditGrantService.list(req.params.schoolId, {
        teacherId: req.query.teacherId ? String(req.query.teacherId) : undefined,
        activeOnly: req.query.activeOnly === "true",
      });
      res.json(rows);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to list grants" });
    }
  },

  async listMyGradeEditGrants(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { gradeEditGrantService } = await import("../services/gradeEditGrantService");
      const rows = await gradeEditGrantService.listMine(req.params.schoolId, user.id);
      res.json(rows);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to list grants" });
    }
  },

  async createGradeEditGrant(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { gradeEditGrantService } = await import("../services/gradeEditGrantService");
      const row = await gradeEditGrantService.create(req.params.schoolId, req.body || {}, {
        id: user.id,
        role: user.role,
      });
      res.status(201).json(row);
    } catch (err: any) {
      res.status(err.status || 500).json({
        error: err.message || "Failed to create grant",
        code: err.code,
      });
    }
  },

  async revokeGradeEditGrant(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { gradeEditGrantService } = await import("../services/gradeEditGrantService");
      const row = await gradeEditGrantService.revoke(
        req.params.schoolId,
        req.params.grantId,
        { id: user.id, role: user.role }
      );
      res.json(row);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to revoke grant" });
    }
  },
};
