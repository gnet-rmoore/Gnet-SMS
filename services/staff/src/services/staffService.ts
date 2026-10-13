import prisma from "../lib/prisma";
import {
  getIdentitySchool,
  getIdentityUsersByIds,
  getIdentityUsersByRoles,
} from "../lib/identityClient";
import { getInstructionalDays } from "../lib/academicClient";
import { dayBoundsFromYmd, eachYmd, monthRangeYmd, normalizeYmd, subtractDaysFromYmd, ymdInTimeZone } from "../lib/schoolDay";
import { notifyInApp, notifyInAppMany } from "../lib/notifyInApp";

const DEFAULT_LEAVE_DAYS: Record<string, number> = {
  SICK: 10,
  VACATION: 20,
  PERSONAL: 7,
  MATERNITY: 90,
  PATERNITY: 14,
  BEREAVEMENT: 5,
};

const TASK_PRIORITIES = new Set(["URGENT", "HIGH", "NORMAL"]);
const TASK_STATUSES = new Set(["TODO", "IN_PROGRESS", "COMPLETED"]);
const TASK_MANAGER_ROLES = new Set(["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "VPI"]);

function normalizeTaskPriority(priority?: string): string {
  const p = String(priority || "NORMAL").toUpperCase();
  if (p === "MEDIUM") return "NORMAL";
  return TASK_PRIORITIES.has(p) ? p : "NORMAL";
}

async function enrichTasks(tasks: Array<Record<string, unknown>>) {
  const ids = tasks.flatMap((t) => [t.createdBy, t.assignedTo].filter(Boolean) as string[]);
  const users = await getIdentityUsersByIds(ids);
  return tasks.map((t) => {
    const creator = users.get(String(t.createdBy));
    const assignee = users.get(String(t.assignedTo));
    return {
      ...t,
      priority: normalizeTaskPriority(String(t.priority || "NORMAL")),
      creator: creator
        ? { id: creator.id, name: creator.name, role: creator.role }
        : { id: t.createdBy, name: "School admin" },
      assignee: assignee
        ? { id: assignee.id, name: assignee.name, role: assignee.role }
        : { id: t.assignedTo, name: "Staff member" },
    };
  });
}

function businessDaysBetween(start: Date, end: Date): number {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  if (e < s) return 0;
  let days = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(days, 1);
}

async function ensurePolicies(schoolId: string) {
  for (const [type, annualDays] of Object.entries(DEFAULT_LEAVE_DAYS)) {
    await prisma.leavePolicy.upsert({
      where: { schoolId_type: { schoolId, type } },
      create: { schoolId, type, annualDays },
      update: {},
    });
  }
}

async function ensureBalances(schoolId: string, userId: string, year: number) {
  await ensurePolicies(schoolId);
  const policies = await prisma.leavePolicy.findMany({
    where: { schoolId, isActive: true },
  });
  const balances = [];
  for (const policy of policies) {
    const row = await prisma.leaveBalance.upsert({
      where: { userId_type_year: { userId, type: policy.type, year } },
      create: {
        schoolId,
        userId,
        type: policy.type,
        year,
        entitled: policy.annualDays,
        used: 0,
        pending: 0,
      },
      update: {},
    });
    balances.push(row);
  }
  return balances;
}

export const staffService = {
  async getLeaveRequests(schoolId: string, userId?: string) {
    return prisma.leaveRequest.findMany({
      where: {
        schoolId,
        ...(userId && { userId }),
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getLeaveBalances(schoolId: string, userId: string, year?: number) {
    const y = year || new Date().getFullYear();
    const balances = await ensureBalances(schoolId, userId, y);
    return balances.map((b) => ({
      ...b,
      remaining: Math.max(0, b.entitled - b.used - b.pending),
    }));
  },

  async createLeaveRequest(schoolId: string, userId: string, data: any) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const type = String(data.type || "PERSONAL").toUpperCase();
    const days = businessDaysBetween(startDate, endDate);
    const year = startDate.getFullYear();

    await ensureBalances(schoolId, userId, year);
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_type_year: { userId, type, year } },
    });
    if (!balance) {
      throw new Error(`No leave balance for type ${type}`);
    }
    const remaining = balance.entitled - balance.used - balance.pending;
    if (days > remaining) {
      throw new Error(
        `Insufficient ${type.toLowerCase()} leave. Requested ${days} day(s); ${remaining} remaining.`
      );
    }

    const [request] = await prisma.$transaction([
      prisma.leaveRequest.create({
        data: {
          schoolId,
          userId,
          type,
          reason: data.reason || "",
          startDate,
          endDate,
          status: "PENDING",
        },
      }),
      prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { pending: { increment: days } },
      }),
    ]);

    const approvers = await getIdentityUsersByRoles(schoolId, [
      "SCHOOL_ADMIN",
      "PRINCIPAL",
      "VPA",
    ]);
    await notifyInAppMany(
      approvers
        .filter((a) => a.id !== userId)
        .map((a) => ({
          schoolId,
          userId: a.id,
          eventKey: "LEAVE_SUBMITTED",
          title: "Leave request pending",
          body: `A ${type.toLowerCase()} leave request needs review (${days} day${days === 1 ? "" : "s"}).`,
          href: "/leave-approval",
          meta: { leaveRequestId: request.id },
        }))
    );

    return request;
  },

  async updateLeaveStatus(id: string, status: string, approvedBy: string, comment?: string) {
    const existing = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) throw new Error("Leave request not found");
    if (existing.status !== "PENDING") {
      throw new Error("Only pending leave requests can be updated");
    }
    if (!["APPROVED", "REJECTED"].includes(status)) {
      throw new Error("Status must be APPROVED or REJECTED");
    }

    const days = businessDaysBetween(existing.startDate, existing.endDate);
    const year = existing.startDate.getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_type_year: {
          userId: existing.userId,
          type: existing.type,
          year,
        },
      },
    });

    const ops: any[] = [
      prisma.leaveRequest.update({
        where: { id },
        data: {
          status,
          approvedBy,
          comment,
          approvedAt: new Date(),
        },
      }),
    ];

    if (balance) {
      const nextPending = Math.max(0, balance.pending - days);
      if (status === "APPROVED") {
        ops.push(
          prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pending: nextPending,
              used: balance.used + days,
            },
          })
        );
      } else {
        ops.push(
          prisma.leaveBalance.update({
            where: { id: balance.id },
            data: { pending: nextPending },
          })
        );
      }
    }

    const [request] = await prisma.$transaction(ops);

    await notifyInApp({
      schoolId: existing.schoolId,
      userId: existing.userId,
      eventKey: "LEAVE_DECISION",
      title: status === "APPROVED" ? "Leave approved" : "Leave rejected",
      body:
        status === "APPROVED"
          ? `Your ${existing.type.toLowerCase()} leave request was approved.`
          : `Your ${existing.type.toLowerCase()} leave request was rejected.${comment ? ` ${comment}` : ""}`,
      href: "/staff-portal",
      meta: { leaveRequestId: existing.id, status },
    });

    return request;
  },

  async getLeavePolicies(schoolId: string) {
    await ensurePolicies(schoolId);
    return prisma.leavePolicy.findMany({
      where: { schoolId },
      orderBy: { type: "asc" },
    });
  },

  async updateLeavePolicies(
    schoolId: string,
    updates: Array<{ type: string; annualDays: number; isActive?: boolean }>
  ) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error("No leave policy updates provided");
    }
    const ops = updates.map((row) => {
      const type = String(row.type || "").toUpperCase();
      const annualDays = Math.max(0, Number(row.annualDays) || 0);
      const isActive = row.isActive !== false;
      return prisma.leavePolicy.upsert({
        where: { schoolId_type: { schoolId, type } },
        create: { schoolId, type, annualDays, isActive },
        update: { annualDays, isActive },
      });
    });
    await prisma.$transaction(ops);
    return this.getLeavePolicies(schoolId);
  },

  async getTasks(schoolId: string, assignedTo?: string) {
    const items = await prisma.staffTask.findMany({
      where: {
        schoolId,
        ...(assignedTo && { assignedTo }),
      },
      orderBy: { createdAt: "desc" },
    });
    return enrichTasks(items);
  },

  async createTask(schoolId: string, createdBy: string, data: any) {
    const title = String(data.title || "").trim();
    if (!title) throw new Error("Task title is required");
    const assignedTo = String(data.assignedTo || "").trim();
    if (!assignedTo) throw new Error("Assignee is required");
    const status = String(data.status || "TODO").toUpperCase();
    if (!TASK_STATUSES.has(status)) throw new Error("Invalid task status");

    const task = await prisma.staffTask.create({
      data: {
        schoolId,
        title,
        description: data.description ? String(data.description).trim() : null,
        priority: normalizeTaskPriority(data.priority),
        status,
        assignedTo,
        createdBy,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    if (assignedTo !== createdBy) {
      await notifyInApp({
        schoolId,
        userId: assignedTo,
        eventKey: "STAFF_TASK_ASSIGNED",
        title: "New task assigned",
        body: title.slice(0, 200),
        href: "/staff-portal",
        meta: { taskId: task.id },
      });
    }

    const [enriched] = await enrichTasks([task]);
    return enriched;
  },

  async updateTaskStatus(
    id: string,
    status: string,
    actor: { id: string; role: string }
  ) {
    const nextStatus = String(status || "").toUpperCase();
    if (!TASK_STATUSES.has(nextStatus)) {
      throw new Error("Invalid task status");
    }

    const existing = await prisma.staffTask.findUnique({ where: { id } });
    if (!existing) throw new Error("Task not found");

    const isManager = TASK_MANAGER_ROLES.has(actor.role);
    if (!isManager && existing.assignedTo !== actor.id) {
      throw new Error("You can only update tasks assigned to you");
    }

    const task = await prisma.staffTask.update({
      where: { id },
      data: { status: nextStatus },
    });
    const [enriched] = await enrichTasks([task]);
    return enriched;
  },

  async getStaffAttendanceToday(schoolId: string, userId: string, date = new Date()) {
    const school = await getIdentitySchool(schoolId);
    const timeZone = school?.timezone || "UTC";
    const ymd = normalizeYmd(date, timeZone);
    const { start: rangeStart, end: rangeEnd } = dayBoundsFromYmd(ymd);

    return prisma.staffAttendance.findMany({
      where: {
        schoolId,
        userId,
        date: { gte: rangeStart, lt: rangeEnd },
      },
      orderBy: [{ date: "desc" }, { checkIn: "desc" }],
    });
  },

  /** Paginated history — each page covers at most 31 calendar days (newest first). */
  async getStaffAttendancePage(schoolId: string, userId: string, page = 1) {
    const PAGE_DAYS = 31;
    const safePage = Math.max(1, Math.floor(page) || 1);
    const school = await getIdentitySchool(schoolId);
    const timeZone = school?.timezone || "UTC";
    const todayYmd = ymdInTimeZone(new Date(), timeZone);

    const endOffset = (safePage - 1) * PAGE_DAYS;
    const startOffset = endOffset + PAGE_DAYS - 1;
    const endYmd = subtractDaysFromYmd(todayYmd, endOffset);
    const startYmd = subtractDaysFromYmd(todayYmd, startOffset);
    const rangeStart = dayBoundsFromYmd(startYmd).start;
    const rangeEnd = dayBoundsFromYmd(endYmd).end;

    const where = {
      schoolId,
      userId,
      date: { gte: rangeStart, lt: rangeEnd },
    };

    const [items, olderExists] = await Promise.all([
      prisma.staffAttendance.findMany({
        where,
        orderBy: [{ date: "desc" }, { checkIn: "desc" }],
      }),
      prisma.staffAttendance.findFirst({
        where: { schoolId, userId, date: { lt: rangeStart } },
        select: { id: true },
      }),
    ]);

    return {
      items,
      page: safePage,
      pageSizeDays: PAGE_DAYS,
      hasMore: Boolean(olderExists),
    };
  },

  /** @deprecated Use getStaffAttendanceToday or getStaffAttendancePage */
  async getStaffAttendance(
    schoolId: string,
    date: Date,
    userId?: string,
    days?: number
  ) {
    if (userId && (!days || days <= 1)) {
      return this.getStaffAttendanceToday(schoolId, userId, date);
    }
    if (userId) {
      const result = await this.getStaffAttendancePage(schoolId, userId, 1);
      return result.items;
    }
    const school = await getIdentitySchool(schoolId);
    const timeZone = school?.timezone || "UTC";
    const ymd = normalizeYmd(date, timeZone);
    const { start: dayStart, end: dayEnd } = dayBoundsFromYmd(ymd);

    let rangeStart = dayStart;
    let rangeEnd = dayEnd;
    if (days && days > 1) {
      const capped = Math.min(days, 31);
      const startYmd = subtractDaysFromYmd(ymd, capped - 1);
      rangeStart = dayBoundsFromYmd(startYmd).start;
    }

    return prisma.staffAttendance.findMany({
      where: {
        schoolId,
        date: { gte: rangeStart, lt: rangeEnd },
        ...(userId && { userId }),
      },
      orderBy: [{ date: "desc" }, { checkIn: "desc" }],
    });
  },

  async markAttendance(
    schoolId: string,
    userId: string,
    type: "checkIn" | "checkOut",
    notes?: string,
    photo?: string
  ) {
    if (type !== "checkIn" && type !== "checkOut") {
      throw new Error("Invalid attendance type");
    }

    const school = await getIdentitySchool(schoolId);
    const timeZone = school?.timezone || "UTC";
    const ymd = ymdInTimeZone(new Date(), timeZone);
    const { start: startOfDay, end: endOfDay } = dayBoundsFromYmd(ymd);
    const dayDate = startOfDay;

    const existing = await prisma.staffAttendance.findFirst({
      where: {
        schoolId,
        userId,
        date: { gte: startOfDay, lt: endOfDay },
      },
    });

    const now = new Date();
    const photoField = type === "checkIn" ? "photoIn" : "photoOut";

    if (type === "checkIn" && existing?.checkIn) {
      throw new Error("Already checked in today");
    }
    if (type === "checkOut" && existing?.checkOut) {
      throw new Error("Already checked out today");
    }
    if (type === "checkOut" && !existing?.checkIn) {
      throw new Error("Check in before checking out");
    }

    if (existing) {
      return prisma.staffAttendance.update({
        where: { id: existing.id },
        data: {
          [type]: now,
          ...(notes ? { notes } : {}),
          ...(photo ? { [photoField]: photo } : {}),
        },
      });
    }

    if (type === "checkOut") {
      throw new Error("Check in before checking out");
    }

    return prisma.staffAttendance.create({
      data: {
        schoolId,
        userId,
        date: dayDate,
        checkIn: now,
        ...(notes ? { notes } : {}),
        ...(photo ? { photoIn: photo } : {}),
        status: "PRESENT",
      },
    });
  },

  async getAttendanceSummary(schoolId: string, userId: string, year: number, month: number) {
    if (!userId) throw new Error("userId is required");
    if (!year || !month || month < 1 || month > 12) throw new Error("Valid year and month are required");

    const school = await getIdentitySchool(schoolId);
    const timeZone = school?.timezone || "UTC";
    const rules = school?.payrollAttendanceRules || {};
    const graceMinutes = Math.max(0, Number(rules.graceMinutes) || 0);
    const { from, to } = monthRangeYmd(year, month);

    let days = await getInstructionalDays(schoolId, from, to);
    if (!days.length) {
      // Soft-fail: weekends only when Academic is unavailable
      days = eachYmd(from, to).map((date) => {
        const [y, m, d] = date.split("-").map(Number);
        const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
        const weekend = dow === 0 || dow === 6;
        return { date, instructional: !weekend, reason: weekend ? "weekend" : null, title: null };
      });
    }

    const workdays = days.filter((d) => d.instructional).map((d) => d.date);
    const workdaySet = new Set(workdays);

    const rangeStart = dayBoundsFromYmd(from).start;
    const rangeEnd = dayBoundsFromYmd(to).end;

    const [attendanceRows, leaveRows] = await Promise.all([
      prisma.staffAttendance.findMany({
        where: {
          schoolId,
          userId,
          date: { gte: rangeStart, lt: rangeEnd },
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          schoolId,
          userId,
          status: "APPROVED",
          startDate: { lte: rangeEnd },
          endDate: { gte: rangeStart },
        },
      }),
    ]);

    const presentDates = new Set<string>();
    let lateCount = 0;
    for (const row of attendanceRows) {
      const ymd = normalizeYmd(row.date, timeZone);
      if (!workdaySet.has(ymd)) continue;
      if (row.checkIn) {
        presentDates.add(ymd);
        if (graceMinutes > 0) {
          // Late if check-in local time is after 09:00 + grace (school-local approximation via UTC components of checkIn)
          const ci = new Date(row.checkIn);
          const minutes = ci.getUTCHours() * 60 + ci.getUTCMinutes();
          const threshold = 9 * 60 + graceMinutes;
          if (minutes > threshold) lateCount += 1;
        }
      }
    }

    const leaveDates = new Set<string>();
    for (const leave of leaveRows) {
      const s = normalizeYmd(leave.startDate, timeZone);
      const e = normalizeYmd(leave.endDate, timeZone);
      for (const d of eachYmd(s, e)) {
        if (workdaySet.has(d)) leaveDates.add(d);
      }
    }

    let missingDays = 0;
    for (const d of workdays) {
      if (!presentDates.has(d) && !leaveDates.has(d)) missingDays += 1;
    }

    const deductionPerMissingDay = Math.max(0, Number(rules.deductionPerMissingDay) || 0);
    const deductionPerLate = Math.max(0, Number(rules.deductionPerLate) || 0);
    const suggestedDeduction =
      missingDays * deductionPerMissingDay + lateCount * deductionPerLate;

    return {
      userId,
      year,
      month,
      timeZone,
      workdays: workdays.length,
      presentDays: presentDates.size,
      leaveDays: leaveDates.size,
      missingDays,
      lateCount,
      rules: {
        enabled: Boolean(rules.enabled),
        graceMinutes,
        deductionPerMissingDay,
        deductionPerLate,
      },
      suggestedDeduction: rules.enabled ? suggestedDeduction : 0,
    };
  },
};
