import type { Request, Response } from "express";
import { onlineExamService } from "../services/onlineExamService";
import { assertParentLinked, assertTeacherClassAccess } from "../lib/identityClient";
import { onLiveExamEvent } from "../lib/liveExamEvents";

function staffCanAuthor(role: string) {
  return ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"].includes(role);
}

export const onlineExamController = {
  async updateOnlineConfig(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const exam = await onlineExamService.updateOnlineConfig(
        req.params.id,
        user.schoolId,
        req.body
      );
      res.json(exam);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to update config" });
    }
  },

  async getQuestions(req: Request, res: Response) {
    const user = (req as any).user;
    const includeKeys = staffCanAuthor(user.role);
    try {
      const data = await onlineExamService.getQuestions(req.params.id, includeKeys);
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load questions" });
    }
  },

  async replaceQuestions(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await onlineExamService.replaceQuestions(
        req.params.id,
        user.schoolId,
        req.body?.questions ?? req.body
      );
      res.json(data);
    } catch (err: any) {
      res
        .status(err.status || 500)
        .json({ error: err.message || "Failed to save questions", code: err.code });
    }
  },

  async listOnlineExams(req: Request, res: Response) {
    const user = (req as any).user;
    const { schoolId } = req.params;
    try {
      if (user.role === "STUDENT") {
        const rows = await onlineExamService.listOnlineExamsForStudent(schoolId, user.id);
        return res.json(rows);
      }
      if (user.role === "PARENT") {
        const studentId = String(req.query.studentId || "");
        if (!studentId) {
          return res.status(400).json({ error: "studentId is required" });
        }
        const ok = await assertParentLinked(user.id, studentId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });
        const rows = await onlineExamService.listOnlineExamsForStudent(schoolId, studentId);
        return res.json(rows);
      }
      if (staffCanAuthor(user.role)) {
        const { examService } = await import("../services/examService");
        const exams = await examService.getExams(schoolId);
        const list = Array.isArray(exams) ? exams : (exams as any).items || [];
        return res.json(list.filter((e: any) => e.isOnline));
      }
      return res.status(403).json({ error: "Unauthorized" });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to list online exams" });
    }
  },

  async listStudentAttempts(req: Request, res: Response) {
    const user = (req as any).user;
    const { studentId } = req.params;
    try {
      const rows = await onlineExamService.listAttemptsForStudent(
        user.schoolId,
        studentId,
        { id: user.id, role: user.role }
      );
      res.json(rows);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to list attempts" });
    }
  },

  async listExamAttempts(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const rows = await onlineExamService.listAttemptsForExam(req.params.id, user.schoolId);
      res.json(rows);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to list attempts" });
    }
  },

  async startAttempt(req: Request, res: Response) {
    const user = (req as any).user;
    if (user.role !== "STUDENT") {
      return res.status(403).json({ error: "Only students can start an exam attempt" });
    }
    try {
      const data = await onlineExamService.startAttempt(
        req.params.id,
        user.id,
        user.schoolId,
        req.body?.accepted === true
      );
      res.status(201).json(data);
    } catch (err: any) {
      res
        .status(err.status || 500)
        .json({ error: err.message || "Failed to start attempt", code: err.code });
    }
  },

  async getAttempt(req: Request, res: Response) {
    const user = (req as any).user;
    try {
      if (user.role === "STUDENT") {
        const data = await onlineExamService.getAttemptForStudent(req.params.attemptId, user.id);
        return res.json(data);
      }
      if (user.role === "PARENT") {
        const attempt = await onlineExamService.getResults(req.params.attemptId, {
          id: user.id,
          role: "PARENT",
        });
        return res.json(attempt);
      }
      if (staffCanAuthor(user.role)) {
        const data = await onlineExamService.getResults(req.params.attemptId, {
          id: user.id,
          role: user.role,
        });
        return res.json(data);
      }
      return res.status(403).json({ error: "Unauthorized" });
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load attempt" });
    }
  },

  async saveAnswers(req: Request, res: Response) {
    const user = (req as any).user;
    if (user.role !== "STUDENT") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await onlineExamService.saveAnswers(
        req.params.attemptId,
        user.id,
        req.body?.answers || []
      );
      res.json(data);
    } catch (err: any) {
      res
        .status(err.status || 500)
        .json({ error: err.message || "Failed to save answers", code: err.code });
    }
  },

  async reportViolation(req: Request, res: Response) {
    const user = (req as any).user;
    if (user.role !== "STUDENT") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await onlineExamService.reportViolation(
        req.params.attemptId,
        user.id,
        req.body?.type,
        req.body?.detail
      );
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to record violation" });
    }
  },

  async submitAttempt(req: Request, res: Response) {
    const user = (req as any).user;
    if (user.role !== "STUDENT") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await onlineExamService.submitAttempt(req.params.attemptId, user.id);
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to submit" });
    }
  },

  async getResults(req: Request, res: Response) {
    const user = (req as any).user;
    try {
      const data = await onlineExamService.getResults(req.params.attemptId, {
        id: user.id,
        role: user.role,
      });
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load results" });
    }
  },

  /** Staff dry run of a real exam (read-only). */
  async getExamPreview(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await onlineExamService.getExamPreview(req.params.id, user.schoolId);
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load preview" });
    }
  },

  /** Staff dry-run scoring of a real exam (no attempt is recorded). */
  async scoreExamPreview(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await onlineExamService.scoreExamPreview(
        req.params.id,
        user.schoolId,
        req.body?.answers || []
      );
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to score preview" });
    }
  },

  /** Built-in sample paper for the student-experience demo. */
  async getSamplePreview(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await onlineExamService.getSamplePreview();
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load sample" });
    }
  },

  /** Dry-run scoring of the built-in sample paper. */
  async scoreSamplePreview(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await onlineExamService.scoreSamplePreview(req.body?.answers || []);
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to score sample" });
    }
  },

  /** Live snapshot of in-progress attempts for an exam. */
  async getLiveAttempts(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const data = await onlineExamService.getLiveAttempts(req.params.id, user.schoolId);
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to load live attempts" });
    }
  },

  /** SSE stream of live exam events (attempt.started, answered, violation, submitted). */
  async liveStream(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const examId = req.params.id;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send("connected", { examId });

    const unsubscribe = onLiveExamEvent(examId, (event) => {
      send(event.type, event.payload);
    });

    req.on("close", () => {
      unsubscribe();
    });
  },

  /** Get retake eligibility for a student. */
  async getRetakeEligibility(req: Request, res: Response) {
    const user = (req as any).user;
    if (user.role !== "STUDENT") {
      return res.status(403).json({ error: "Only students can check retake eligibility" });
    }
    try {
      const data = await onlineExamService.getRetakeEligibility(req.params.id, user.id);
      res.json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to check retake eligibility" });
    }
  },

  /** Start a retake attempt (student-initiated). */
  async startRetakeAttempt(req: Request, res: Response) {
    const user = (req as any).user;
    if (user.role !== "STUDENT") {
      return res.status(403).json({ error: "Only students can start a retake" });
    }
    try {
      const data = await onlineExamService.startAttempt(
        req.params.id,
        user.id,
        user.schoolId,
        req.body?.accepted === true
      );
      res.status(201).json(data);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to start retake", code: err.code });
    }
  },

  /** Push exam results to gradebook (teacher-initiated). */
  async pushToGradebook(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const { attemptId, pushAll } = req.body;

      // For single attempt push, verify teacher has access to the class
      if (attemptId) {
        const attempt = await onlineExamService.getAttemptForStudent(attemptId, user.id);
        // This will fail if user is not the student, so we need a different approach
        // Instead, load the exam to get classId
        const exam = await onlineExamService.getQuestions(req.params.id, false);
        if (exam.exam?.classId) {
          await assertTeacherClassAccess(user.id, exam.exam.classId, user.role);
        }
      } else if (pushAll) {
        // For bulk push, verify teacher has access to the exam's class
        const exam = await onlineExamService.getQuestions(req.params.id, false);
        if (exam.exam?.classId) {
          await assertTeacherClassAccess(user.id, exam.exam.classId, user.role);
        }
      }

      if (pushAll) {
        const results = await onlineExamService.bulkPushToGradebook(req.params.id, user.id);
        res.json({ pushed: results.filter((r) => r.success).length, failed: results.filter((r) => !r.success).length, details: results });
      } else if (attemptId) {
        const gradeEntry = await onlineExamService.pushToGradebook(req.params.id, attemptId, user.id);
        res.json(gradeEntry);
      } else {
        res.status(400).json({ error: "attemptId or pushAll is required" });
      }
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to push to gradebook" });
    }
  },

  /** Update retake policy for an exam. */
  async updateRetakePolicy(req: Request, res: Response) {
    const user = (req as any).user;
    if (!staffCanAuthor(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const exam = await onlineExamService.updateOnlineConfig(req.params.id, user.schoolId, {
        retakePolicy: JSON.stringify(req.body),
      });
      res.json(exam);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to update retake policy" });
    }
  },
};
