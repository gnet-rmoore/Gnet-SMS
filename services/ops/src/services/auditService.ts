import prisma from "../lib/prisma";

export type ActivityEvent = {
  id: string;
  occurredAt: string;
  schoolId: string;
  actorUserId?: string;
  domain: "OPS";
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

    const woWhere = {
      schoolId,
      OR: [
        { createdAt: { gte: fromDate, lte: toDate } },
        { updatedAt: { gte: fromDate, lte: toDate } },
      ],
    };

    const [woTotal, workOrders, invRows] = await Promise.all([
      prisma.workOrder.count({ where: woWhere }),
      prisma.workOrder.findMany({
        where: woWhere,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.inventoryItem.findMany({
        where: {
          schoolId,
          updatedAt: { gte: fromDate, lte: toDate },
        },
        orderBy: { updatedAt: "desc" },
        take: pageSize,
      }),
    ]);

    const items: ActivityEvent[] = [
      ...workOrders.map((wo) => {
        const isCreate = wo.createdAt.getTime() === wo.updatedAt.getTime() || wo.createdAt >= fromDate;
        const action = isCreate
          ? "work_order_created"
          : wo.status === "COMPLETED"
            ? "work_order_completed"
            : "work_order_status_changed";
        return {
          id: `ops:work-order:${wo.id}:${isCreate ? "create" : "update"}`,
          occurredAt: (isCreate ? wo.createdAt : wo.updatedAt).toISOString(),
          schoolId: wo.schoolId,
          actorUserId: isCreate ? wo.requestedBy : wo.assignedTo || wo.requestedBy,
          domain: "OPS" as const,
          action,
          summary: `${wo.priority} · ${wo.title}${wo.location ? ` @ ${wo.location}` : ""} (${wo.status})`,
          entityType: "WorkOrder",
          entityId: wo.id,
          level: wo.status === "COMPLETED" ? "INFO" : "INFO",
        };
      }),
      ...invRows.map((item) => ({
        id: `ops:inventory:${item.id}`,
        occurredAt: item.updatedAt.toISOString(),
        schoolId: item.schoolId,
        domain: "OPS" as const,
        action: item.createdAt.getTime() === item.updatedAt.getTime() ? "inventory_item_created" : "inventory_item_updated",
        summary: `${item.name} (${item.category}) qty ${item.quantity}${item.unit ? ` ${item.unit}` : ""}`,
        entityType: "InventoryItem",
        entityId: item.id,
        level: "INFO" as const,
      })),
    ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    return { items: items.slice(0, pageSize), total: woTotal + invRows.length, page, pageSize };
  },
};
