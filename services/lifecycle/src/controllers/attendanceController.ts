import type { Response } from "express";
import { attendanceService } from "../services/attendanceService";

export const attendanceController = {
  async getAttendanceBySchool(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      const attendance = await attendanceService.getAttendanceBySchool(
        schoolId,
        {
          id: req.user.id,
          role: req.user.role,
        },
        {
          page: req.query.page as string | undefined,
          pageSize: req.query.pageSize as string | undefined,
          classroomId: req.query.classroomId as string | undefined,
          from: req.query.from as string | undefined,
          to: req.query.to as string | undefined,
          status: req.query.status as string | undefined,
          studentId: req.query.studentId as string | undefined,
        }
      );
      res.json(attendance);
    } catch (err) {
      console.error("getAttendanceBySchool error:", err);
      const status = (err as any)?.status || 500;
      res.status(status).json({
        error: (err as any)?.message || "Failed to fetch attendance",
        message: (err as any)?.message || "Failed to fetch attendance",
      });
    }
  },

  async createAttendance(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      const attendance = await attendanceService.createAttendance(
        schoolId,
        req.user.id,
        req.body,
        { id: req.user.id, role: req.user.role }
      );
      res.json(attendance);
    } catch (err) {
      console.error("createAttendance error:", err);
      const message = (err as any)?.message || "Failed to create attendance";
      const status =
        (err as any)?.status ||
        (/required|Invalid|At least|Cannot take/i.test(message) ? 400 : 500);
      res.status(status).json({
        error: message,
        message,
        code: (err as any)?.code,
        details: (err as any)?.details,
      });
    }
  },

  async getAttendanceStats(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      const stats = await attendanceService.getAttendanceStats(schoolId, {
        id: req.user.id,
        role: req.user.role,
      });
      res.json(stats);
    } catch (err) {
      console.error("getAttendanceStats error:", err);
      res.status(500).json({
        error: "Failed to fetch attendance stats",
        message: (err as any).message,
      });
    }
  },

  async getAttendanceSummaryInternal(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      const summary = await attendanceService.getAttendanceSummaryByStudent(schoolId, {
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
      });
      res.json(summary);
    } catch (err) {
      console.error("getAttendanceSummaryInternal error:", err);
      res.status(500).json({
        error: "Failed to fetch attendance summary",
        message: (err as any).message,
      });
    }
  },

  async getAttendanceDetails(req: any, res: Response) {
    const { id } = req.params;
    try {
      const details = await attendanceService.getAttendanceDetails(id, {
        id: req.user.id,
        role: req.user.role,
      });
      if (!details) return res.status(404).json({ error: "Attendance record not found" });
      res.json(details);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch attendance details" });
    }
  },
};
