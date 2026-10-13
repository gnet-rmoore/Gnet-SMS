import prisma from "../lib/prisma";

export type ActivityEvent = {
  id: string;
  occurredAt: string;
  schoolId: string;
  actorUserId?: string;
  domain: "ACADEMIC";
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  level?: "INFO" | "WARN";
};

const STATUS_ACTION: Record<string, string> = {
  DRAFT: "grade_entry_drafted",
  SUBMITTED: "grade_entry_submitted",
  ACCEPTED: "grade_entry_accepted",
  REJECTED: "grade_entry_rejected",
  REOPENED: "grade_entry_reopened",
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
      gradeEntry: { schoolId },
      changedAt: { gte: fromDate, lte: toDate },
    };

    const [total, rows] = await Promise.all([
      prisma.gradeHistory.count({ where }),
      prisma.gradeHistory.findMany({
        where,
        orderBy: { changedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { gradeEntry: { select: { schoolId: true, studentId: true, subjectId: true } } },
      }),
    ]);

    const items: ActivityEvent[] = rows.map((row) => ({
      id: `academic:grade-history:${row.id}`,
      occurredAt: row.changedAt.toISOString(),
      schoolId: row.gradeEntry.schoolId,
      actorUserId: row.changedBy,
      domain: "ACADEMIC",
      action: STATUS_ACTION[row.status] || `grade_${row.status.toLowerCase()}`,
      summary: `Grade ${row.status}${row.score != null ? ` score ${row.score}` : ""} (student ${row.gradeEntry.studentId.slice(0, 8)}…)`,
      entityType: "GradeHistory",
      entityId: row.id,
      level: row.status === "REJECTED" ? "WARN" : "INFO",
    }));

    return { items, total, page, pageSize };
  },
};
