import { staffService } from "../services/staffService";

/** Ported verbatim from src/server/controllers/staffController.ts */
export const staffController = {
  // Leave Requests
  async getLeaveRequests(req: any, res: any) {
    const { schoolId } = req.params;
    const LEAVE_APPROVERS = new Set(["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "SUPER_ADMIN"]);
    const caps = req.user?.capabilities;
    const isApprover = Array.isArray(caps)
      ? caps.includes("action.leave.approve") || req.user.role === "SUPER_ADMIN"
      : LEAVE_APPROVERS.has(req.user.role);
    // Non-approvers may only see their own requests (ignore spoofed ?userId=).
    const userId = isApprover
      ? req.query.userId
        ? String(req.query.userId)
        : undefined
      : req.user.id;
    try {
      const requests = await staffService.getLeaveRequests(schoolId, userId);
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch leave requests" });
    }
  },

  async getLeaveBalances(req: any, res: any) {
    const { schoolId } = req.params;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const isAdmin = ["SCHOOL_ADMIN", "PRINCIPAL", "VPA"].includes(req.user.role);
    const userId = isAdmin && req.query.userId ? String(req.query.userId) : req.user.id;
    try {
      const balances = await staffService.getLeaveBalances(schoolId, userId, year);
      res.json(balances);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch leave balances" });
    }
  },

  async getLeavePolicies(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      const policies = await staffService.getLeavePolicies(schoolId);
      res.json(policies);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch leave policies" });
    }
  },

  async updateLeavePolicies(req: any, res: any) {
    const { schoolId } = req.params;
    const allowed = ["SCHOOL_ADMIN", "PRINCIPAL", "VPA"].includes(req.user.role);
    if (!allowed) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const policies = await staffService.updateLeavePolicies(schoolId, req.body.policies);
      res.json(policies);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update leave policies" });
    }
  },

  async createLeaveRequest(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      const request = await staffService.createLeaveRequest(schoolId, req.user.id, req.body);
      res.status(201).json(request);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create leave request" });
    }
  },

  async updateLeaveStatus(req: any, res: any) {
    const { id } = req.params;
    const { status, comment } = req.body;
    try {
      const caps = req.user?.capabilities;
      const allowed = Array.isArray(caps)
        ? caps.includes("action.leave.approve")
        : ["SCHOOL_ADMIN", "PRINCIPAL", "VPA"].includes(req.user.role);
      if (!allowed) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const request = await staffService.updateLeaveStatus(id, status, req.user.id, comment);
      res.json(request);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update leave status" });
    }
  },

  // Staff Tasks
  async getTasks(req: any, res: any) {
    const { schoolId } = req.params;
    const { assignedTo } = req.query;
    const isManager = ["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "VPI"].includes(req.user.role);
    const scopeAssignee = isManager
      ? assignedTo
        ? String(assignedTo)
        : undefined
      : req.user.id;
    try {
      const tasks = await staffService.getTasks(schoolId, scopeAssignee);
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch tasks" });
    }
  },

  async createTask(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      if (!["SCHOOL_ADMIN", "PRINCIPAL"].includes(req.user.role)) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const task = await staffService.createTask(schoolId, req.user.id, req.body);
      res.json(task);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create task" });
    }
  },

  async updateTaskStatus(req: any, res: any) {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const task = await staffService.updateTaskStatus(id, status, {
        id: req.user.id,
        role: req.user.role,
      });
      res.json(task);
    } catch (err: any) {
      const code = /not found/i.test(err.message) ? 404 : /only update tasks assigned/i.test(err.message) ? 403 : 400;
      res.status(code).json({ error: err.message || "Failed to update task status" });
    }
  },

  // Staff Attendance
  async getStaffAttendance(req: any, res: any) {
    const { schoolId } = req.params;
    const { date, scope, page, userId: queryUserId } = req.query;
    try {
      const isAdmin = ["SCHOOL_ADMIN", "PRINCIPAL", "VPA"].includes(req.user.role);
      const requestedUserId =
        typeof queryUserId === "string" && queryUserId.trim() ? queryUserId.trim() : undefined;
      const userId = requestedUserId && isAdmin ? requestedUserId : req.user.id;

      if (scope === "today") {
        const items = await staffService.getStaffAttendanceToday(
          schoolId,
          userId,
          date ? new Date(String(date)) : new Date()
        );
        return res.json({
          items,
          page: 1,
          pageSizeDays: 1,
          hasMore: false,
        });
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const result = await staffService.getStaffAttendancePage(schoolId, userId, pageNum);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch staff attendance" });
    }
  },

  async markAttendance(req: any, res: any) {
    const { schoolId } = req.params;
    const { type, notes, photo } = req.body;
    try {
      if (type !== "checkIn" && type !== "checkOut") {
        return res.status(400).json({ error: "Invalid attendance type" });
      }
      const attendance = await staffService.markAttendance(
        schoolId,
        req.user.id,
        type,
        notes,
        photo
      );
      res.json(attendance);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to mark attendance" });
    }
  },

  async getAttendanceSummary(req: any, res: any) {
    const { schoolId } = req.params;
    const userId = String(req.query.userId || "");
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    try {
      const summary = await staffService.getAttendanceSummary(schoolId, userId, year, month);
      res.json(summary);
    } catch (err: any) {
      const status = /required|Valid/i.test(err.message || "") ? 400 : 500;
      res.status(status).json({ error: err.message || "Failed to load attendance summary" });
    }
  },
};
