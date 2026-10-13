import type { Response } from "express";
import { scheduleService } from "../services/scheduleService";

function userFromReq(req: any) {
  const user = req.user;
  if (!user?.id || !user?.schoolId || !user?.role) return null;
  return {
    id: user.id,
    schoolId: user.schoolId,
    role: user.role,
    capabilities: Array.isArray(user.capabilities) ? user.capabilities : null,
  };
}

function sendError(res: Response, error: any, fallback: string) {
  const status = error.status || 500;
  const body: Record<string, unknown> = { error: error.message || fallback };
  if (error.conflicts) body.conflicts = error.conflicts;
  return res.status(status).json(body);
}

export const scheduleController = {
  async listBellSchedules(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const schoolId = req.params.schoolId || user.schoolId;
      const rows = await scheduleService.listBellSchedules(schoolId);
      return res.json(rows);
    } catch (error: any) {
      return sendError(res, error, "Failed to list bell schedules");
    }
  },

  async ensureBellSchedule(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const row = await scheduleService.ensureDefaultBellSchedule(user);
      return res.json(row);
    } catch (error: any) {
      return sendError(res, error, "Failed to ensure bell schedule");
    }
  },

  async createBellSchedule(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const row = await scheduleService.createBellSchedule(user, req.body || {});
      return res.status(201).json(row);
    } catch (error: any) {
      return sendError(res, error, "Failed to create bell schedule");
    }
  },

  async getBellSchedule(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const row = await scheduleService.getBellSchedule(user.schoolId, req.params.id);
      return res.json(row);
    } catch (error: any) {
      return sendError(res, error, "Failed to load bell schedule");
    }
  },

  async updateBellSchedule(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const row = await scheduleService.updateBellSchedule(user, req.params.id, req.body || {});
      return res.json(row);
    } catch (error: any) {
      return sendError(res, error, "Failed to update bell schedule");
    }
  },

  async deleteBellSchedule(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      await scheduleService.deleteBellSchedule(user, req.params.id);
      return res.json({ ok: true });
    } catch (error: any) {
      return sendError(res, error, "Failed to delete bell schedule");
    }
  },

  async replacePeriods(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const periods = Array.isArray(req.body) ? req.body : req.body?.periods;
      const row = await scheduleService.replacePeriods(user, req.params.id, periods || []);
      return res.json(row);
    } catch (error: any) {
      return sendError(res, error, "Failed to update bell periods");
    }
  },

  async updatePeriod(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const row = await scheduleService.updatePeriod(user, req.params.id, req.body || {});
      return res.json(row);
    } catch (error: any) {
      return sendError(res, error, "Failed to update schedule period");
    }
  },

  async listTimetable(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const rows = await scheduleService.listTimetable(user, {
        bellScheduleId: req.query.bellScheduleId as string | undefined,
        classroomId: req.query.classroomId as string | undefined,
        teacherId: req.query.teacherId as string | undefined,
        studentId: req.query.studentId as string | undefined,
      });
      return res.json(rows);
    } catch (error: any) {
      return sendError(res, error, "Failed to load timetable");
    }
  },

  async validateTimetable(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const result = await scheduleService.validateTimetable(user, req.body || {});
      return res.json(result);
    } catch (error: any) {
      return sendError(res, error, "Failed to validate timetable");
    }
  },

  async putTimetable(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const rows = await scheduleService.putTimetable(user, req.body || {});
      return res.json(rows);
    } catch (error: any) {
      return sendError(res, error, "Failed to save timetable");
    }
  },

  async expandTimetable(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const from = String(req.query.from || "");
      const to = String(req.query.to || "");
      const studentId = req.query.studentId as string | undefined;
      const rows = await scheduleService.expandForCalendar(user, from, to, { studentId });
      return res.json(rows);
    } catch (error: any) {
      return sendError(res, error, "Failed to expand timetable");
    }
  },

  async copyClassroom(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const rows = await scheduleService.copyClassroomSchedule(user, req.body || {});
      return res.json(rows);
    } catch (error: any) {
      return sendError(res, error, "Failed to copy timetable");
    }
  },

  async deleteEntry(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      await scheduleService.deleteEntry(user, req.params.id);
      return res.json({ ok: true });
    } catch (error: any) {
      return sendError(res, error, "Failed to delete timetable entry");
    }
  },
};
