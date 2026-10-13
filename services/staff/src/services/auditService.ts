import prisma from "../lib/prisma";

export type ActivityEvent = {
  id: string;
  occurredAt: string;
  schoolId: string;
  actorUserId?: string;
  domain: "STAFF";
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  level?: "INFO" | "WARN";
};

export const auditService = {
  async listEvents(query: {
    schoolId: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) {
    const schoolId = String(query.schoolId || "").trim();
    if (!schoolId) throw Object.assign(new Error("schoolId is required"), { status: 400 });
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 50));
    const now = new Date();
    const fromDate = query.from ? new Date(query.from) : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const toDate = query.to ? new Date(query.to) : now;

    const where = {
      schoolId,
      OR: [
        { createdAt: { gte: fromDate, lte: toDate } },
        { approvedAt: { gte: fromDate, lte: toDate } },
      ],
    };

    const [total, rows] = await Promise.all([
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items: ActivityEvent[] = rows.flatMap((row) => {
      const out: ActivityEvent[] = [];
      if (row.createdAt >= fromDate && row.createdAt <= toDate) {
        out.push({
          id: `staff:leave:submit:${row.id}`,
          occurredAt: row.createdAt.toISOString(),
          schoolId: row.schoolId,
          actorUserId: row.userId,
          domain: "STAFF",
          action: "leave_request_submitted",
          summary: `${row.type} leave requested (${row.startDate.toISOString().slice(0, 10)} – ${row.endDate.toISOString().slice(0, 10)})`,
          entityType: "LeaveRequest",
          entityId: row.id,
          level: "INFO",
        });
      }
      if (row.approvedAt && row.approvedAt >= fromDate && row.approvedAt <= toDate) {
        out.push({
          id: `staff:leave:decision:${row.id}`,
          occurredAt: row.approvedAt.toISOString(),
          schoolId: row.schoolId,
          actorUserId: row.approvedBy || undefined,
          domain: "STAFF",
          action: row.status === "APPROVED" ? "leave_request_approved" : "leave_request_rejected",
          summary: `${row.type} leave ${row.status.toLowerCase()}`,
          entityType: "LeaveRequest",
          entityId: row.id,
          level: row.status === "REJECTED" ? "WARN" : "INFO",
        });
      }
      return out;
    });

    return { items, total, page, pageSize };
  },
};
