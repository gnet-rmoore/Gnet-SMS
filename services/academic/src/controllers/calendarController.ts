import type { Response } from "express";
import { calendarService } from "../services/calendarService";

function userFromReq(req: any) {
  const user = req.user;
  if (!user?.id || !user?.schoolId || !user?.role) return null;
  return { id: user.id, schoolId: user.schoolId, role: user.role };
}

export const calendarController = {
  async getCalendarEvents(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const events = await calendarService.getCalendarEvents(user, {
        from: typeof req.query.from === "string" ? req.query.from : undefined,
        to: typeof req.query.to === "string" ? req.query.to : undefined,
        studentId: typeof req.query.studentId === "string" ? req.query.studentId : undefined,
      });
      return res.json(events);
    } catch (error: any) {
      console.error("Calendar retrieval error:", error);
      return res
        .status(500)
        .json({ error: error.message || "Failed to load calendar" });
    }
  },

  async createEvent(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const event = await calendarService.createEvent(user, req.body || {});
      return res.status(201).json(event);
    } catch (error: any) {
      const status = error.status || 500;
      return res.status(status).json({ error: error.message || "Failed to create event" });
    }
  },

  async updateEvent(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const event = await calendarService.updateEvent(
        user,
        req.params.id,
        req.body || {}
      );
      return res.json(event);
    } catch (error: any) {
      const status = error.status || 500;
      return res.status(status).json({ error: error.message || "Failed to update event" });
    }
  },

  async deleteEvent(req: any, res: Response) {
    try {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      await calendarService.deleteEvent(user, req.params.id);
      return res.json({ ok: true });
    } catch (error: any) {
      const status = error.status || 500;
      return res.status(status).json({ error: error.message || "Failed to delete event" });
    }
  },

  async checkInstructionalDay(req: any, res: Response) {
    try {
      const schoolId = req.params.schoolId || req.user?.schoolId;
      const date = String(req.query.date || req.params.date || "");
      if (!schoolId) return res.status(400).json({ error: "schoolId required" });
      const result = await calendarService.checkInstructionalDay(schoolId, date);
      return res.json(result);
    } catch (error: any) {
      const status = error.status || 500;
      return res.status(status).json({ error: error.message || "Failed to check day" });
    }
  },

  async getInstructionalDays(req: any, res: Response) {
    try {
      const schoolId = req.params.schoolId || req.user?.schoolId;
      const from = String(req.query.from || "");
      const to = String(req.query.to || "");
      if (!schoolId) return res.status(400).json({ error: "schoolId required" });
      const result = await calendarService.getInstructionalDays(schoolId, from, to);
      return res.json({ days: result });
    } catch (error: any) {
      const status = error.status || 500;
      return res.status(status).json({ error: error.message || "Failed to load instructional days" });
    }
  },

  async upsertAttendanceEventInternal(req: any, res: Response) {
    try {
      const schoolId = req.params.schoolId;
      const body = req.body || {};
      if (!schoolId || !body.attendanceId || !body.date) {
        return res.status(400).json({ error: "schoolId, attendanceId, and date required" });
      }
      const event = await calendarService.upsertAttendanceEvent({
        schoolId,
        attendanceId: body.attendanceId,
        classroomName: body.classroomName || "Classroom",
        date: body.date,
        presentCount: Number(body.presentCount) || 0,
        absentCount: Number(body.absentCount) || 0,
        createdById: body.createdById,
      });
      return res.json(event);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to upsert attendance event" });
    }
  },
};
