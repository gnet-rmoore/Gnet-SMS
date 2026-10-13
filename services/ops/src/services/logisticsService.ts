import prisma from "../lib/prisma";

/**
 * Ported from src/server/services/logisticsService.ts.
 * Dropped `driver.name` / `requester.name` / `assignee.name` / `logger.name`
 * Prisma includes — those are Identity.User fields and ops doesn't own User.
 * Callers get plain driverId/requestedBy/assignedTo/loggedBy IDs; enrich via
 * the Identity UserRef pattern (roadmap §4 Phase B) once it lands.
 */
export const logisticsService = {
  // Security Logs
  async getSecurityLogs(schoolId: string) {
    return prisma.securityLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    });
  },

  async createSecurityLog(schoolId: string, data: any, userId: string) {
    return prisma.securityLog.create({
      data: {
        type: data.type,
        description: data.description,
        location: data.location,
        severity: data.severity,
        loggedBy: userId,
        schoolId,
      },
    });
  },

  // Vehicles
  async getVehicles(schoolId: string) {
    return prisma.vehicle.findMany({
      where: { schoolId },
      include: { maintenanceLogs: true },
      orderBy: { plateNumber: "asc" },
    });
  },

  async createVehicle(schoolId: string, data: any) {
    return prisma.vehicle.create({
      data: {
        plateNumber: data.plateNumber,
        model: data.model,
        capacity: parseInt(data.capacity),
        driverId: data.driverId,
        schoolId,
      },
    });
  },

  async updateVehicle(id: string, data: any) {
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw new Error("Vehicle not found");
    const patch: Record<string, unknown> = {};
    if (data.plateNumber !== undefined) patch.plateNumber = String(data.plateNumber).trim();
    if (data.model !== undefined) patch.model = String(data.model).trim();
    if (data.capacity !== undefined) patch.capacity = parseInt(String(data.capacity), 10);
    if (data.status !== undefined) {
      const allowed = ["ACTIVE", "MAINTENANCE", "INACTIVE"];
      if (allowed.includes(data.status)) patch.status = data.status;
    }
    if (data.driverId !== undefined) patch.driverId = data.driverId || null;
    return prisma.vehicle.update({ where: { id }, data: patch });
  },

  async createVehicleMaintenance(vehicleId: string, data: any) {
    const description = String(data.description || "").trim();
    if (!description) throw new Error("Description is required");
    const cost = parseFloat(String(data.cost ?? "0")) || 0;
    return prisma.vehicleMaintenance.create({
      data: {
        vehicleId,
        description,
        cost,
        date: data.date ? new Date(data.date) : new Date(),
        nextService: data.nextService ? new Date(data.nextService) : null,
      },
    });
  },

  async getTransportRoutes(schoolId: string) {
    return prisma.transportRoute.findMany({
      where: { schoolId },
      include: {
        stops: { orderBy: { sortOrder: "asc" } },
        riders: true,
      },
      orderBy: { name: "asc" },
    });
  },

  async getStudentTransportSummary(schoolId: string, studentId: string) {
    const rider = await prisma.transportRider.findFirst({
      where: {
        studentId,
        status: "ACTIVE",
        route: { schoolId, status: "ACTIVE" },
      },
      include: {
        stop: true,
        route: {
          include: {
            stops: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });
    if (!rider) return null;

    let vehicle: { plateNumber: string; model: string } | null = null;
    if (rider.route.vehicleId) {
      const v = await prisma.vehicle.findFirst({
        where: { id: rider.route.vehicleId, schoolId },
        select: { plateNumber: true, model: true },
      });
      if (v) vehicle = { plateNumber: v.plateNumber, model: v.model };
    }

    return {
      routeName: rider.route.name,
      status: rider.route.status,
      assignedStop: rider.stop
        ? { name: rider.stop.name, pickupTime: rider.stop.pickupTime ?? null }
        : null,
      stops: rider.route.stops.map((s) => ({
        name: s.name,
        pickupTime: s.pickupTime ?? null,
        sortOrder: s.sortOrder,
      })),
      vehicle,
    };
  },

  async createTransportRoute(schoolId: string, data: any) {
    const name = String(data.name || "").trim();
    if (!name) throw new Error("Route name is required");
    return prisma.transportRoute.create({
      data: {
        schoolId,
        name,
        vehicleId: data.vehicleId ? String(data.vehicleId) : null,
        driverStaffId: data.driverStaffId ? String(data.driverStaffId) : null,
        notes: data.notes ? String(data.notes).trim() : null,
        status: data.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      },
    });
  },

  async updateTransportRoute(id: string, data: any) {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = String(data.name || "").trim();
    if (data.vehicleId !== undefined) patch.vehicleId = data.vehicleId || null;
    if (data.driverStaffId !== undefined) patch.driverStaffId = data.driverStaffId || null;
    if (data.notes !== undefined) patch.notes = data.notes ? String(data.notes).trim() : null;
    if (data.status !== undefined) patch.status = data.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    return prisma.transportRoute.update({ where: { id }, data: patch });
  },

  async addTransportStop(routeId: string, data: any) {
    const name = String(data.name || "").trim();
    if (!name) throw new Error("Stop name is required");
    const max = await prisma.transportStop.aggregate({
      where: { routeId },
      _max: { sortOrder: true },
    });
    return prisma.transportStop.create({
      data: {
        routeId,
        name,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
        pickupTime: data.pickupTime ? String(data.pickupTime).trim() : null,
      },
    });
  },

  async addTransportRider(routeId: string, data: any) {
    const studentId = String(data.studentId || "");
    if (!studentId) throw new Error("Student is required");
    return prisma.transportRider.create({
      data: {
        routeId,
        studentId,
        stopId: data.stopId ? String(data.stopId) : null,
        status: "ACTIVE",
      },
    });
  },

  async removeTransportRider(routeId: string, studentId: string) {
    await prisma.transportRider.deleteMany({ where: { routeId, studentId } });
    return { ok: true };
  },

  // Work Orders
  async getWorkOrders(
    schoolId: string,
    opts?: { page?: number | string; pageSize?: number | string; q?: string; status?: string }
  ) {
    const where: any = { schoolId };
    if (opts?.status) where.status = String(opts.status).toUpperCase();
    const q = opts?.q?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
      ];
    }
    const page = Math.max(1, Number(opts?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(opts?.pageSize) || 50));
    const [total, items] = await Promise.all([
      prisma.workOrder.count({ where }),
      prisma.workOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, total, page, pageSize };
  },

  async createWorkOrder(schoolId: string, data: any, userId: string) {
    const title = String(data.title || "").trim();
    const description = String(data.description || "").trim();
    if (!title || !description) {
      throw new Error("Title and description are required");
    }

    const allowedPriority = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    const priority = allowedPriority.includes(data.priority) ? data.priority : "MEDIUM";
    const assignedTo = data.assignedTo ? String(data.assignedTo) : null;

    const order = await prisma.workOrder.create({
      data: {
        title,
        description,
        priority,
        location: data.location ? String(data.location).trim() : null,
        assignedTo,
        status: assignedTo ? "IN_PROGRESS" : "OPEN",
        requestedBy: userId,
        schoolId,
      },
    });

    if (assignedTo && assignedTo !== userId) {
      const { notifyInApp } = await import("../lib/notifyInApp");
      await notifyInApp({
        schoolId,
        userId: assignedTo,
        eventKey: "WORK_ORDER_ASSIGNED",
        title: "Work order assigned",
        body: title,
        href: "/work-orders",
        meta: { workOrderId: order.id },
      });
    }

    return order;
  },

  async updateWorkOrder(id: string, data: any) {
    const existing = await prisma.workOrder.findUnique({ where: { id } });
    if (!existing) throw new Error("Work order not found");

    const patch: Record<string, unknown> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.priority !== undefined) {
      const allowedPriority = ["LOW", "MEDIUM", "HIGH", "URGENT"];
      if (allowedPriority.includes(data.priority)) patch.priority = data.priority;
    }
    if (data.title !== undefined) {
      const title = String(data.title || "").trim();
      if (!title) throw new Error("Title cannot be empty");
      patch.title = title;
    }
    if (data.description !== undefined) {
      const description = String(data.description || "").trim();
      if (!description) throw new Error("Description cannot be empty");
      patch.description = description;
    }
    if (data.location !== undefined) {
      patch.location = data.location ? String(data.location).trim() : null;
    }
    if (data.assignedTo !== undefined) {
      patch.assignedTo = data.assignedTo || null;
    }

    // Assigning staff to an open ticket moves it to in progress unless status is set explicitly.
    if (patch.assignedTo && data.status === undefined) {
      if (existing.status === "OPEN") patch.status = "IN_PROGRESS";
    }

    const order = await prisma.workOrder.update({
      where: { id },
      data: patch,
    });

    const { notifyInApp } = await import("../lib/notifyInApp");
    const newAssignee = patch.assignedTo ? String(patch.assignedTo) : null;
    if (
      newAssignee &&
      newAssignee !== existing.assignedTo &&
      newAssignee !== existing.requestedBy
    ) {
      await notifyInApp({
        schoolId: existing.schoolId,
        userId: newAssignee,
        eventKey: "WORK_ORDER_ASSIGNED",
        title: "Work order assigned",
        body: order.title,
        href: "/work-orders",
        meta: { workOrderId: order.id },
      });
    }
    if (
      patch.status === "COMPLETED" &&
      existing.status !== "COMPLETED" &&
      existing.requestedBy
    ) {
      await notifyInApp({
        schoolId: existing.schoolId,
        userId: existing.requestedBy,
        eventKey: "WORK_ORDER_COMPLETED",
        title: "Work order completed",
        body: order.title,
        href: "/work-orders",
        meta: { workOrderId: order.id },
      });
    }

    return order;
  },

  // Inventory
  async getInventory(schoolId: string, category?: string) {
    const where: { schoolId: string; category?: string } = { schoolId };
    if (category) {
      where.category = category.trim().toUpperCase();
    }
    return prisma.inventoryItem.findMany({
      where,
      orderBy: { name: "asc" },
    });
  },

  async createInventoryItem(schoolId: string, data: any) {
    const name = String(data.name || "").trim();
    if (!name) throw new Error("Name is required");
    const quantity = parseInt(String(data.quantity ?? "0"), 10);
    const minQuantity = parseInt(String(data.minQuantity ?? "0"), 10);
    if (Number.isNaN(quantity) || quantity < 0) throw new Error("Invalid quantity");
    if (Number.isNaN(minQuantity) || minQuantity < 0) throw new Error("Invalid min quantity");

    return prisma.inventoryItem.create({
      data: {
        name,
        category: (String(data.category || "GENERAL").trim().toUpperCase()) || "GENERAL",
        quantity,
        unit: String(data.unit || "pcs").trim() || "pcs",
        minQuantity,
        schoolId,
      },
    });
  },

  async updateInventoryItem(id: string, data: any) {
    const patch: Record<string, unknown> = {};
    if (data.quantity !== undefined) {
      const qty = parseInt(String(data.quantity), 10);
      if (Number.isNaN(qty) || qty < 0) throw new Error("Quantity must be a non-negative number");
      patch.quantity = qty;
    }
    if (data.minQuantity !== undefined) {
      const min = parseInt(String(data.minQuantity), 10);
      if (Number.isNaN(min) || min < 0) throw new Error("Min quantity must be a non-negative number");
      patch.minQuantity = min;
    }
    if (data.name !== undefined) {
      const name = String(data.name || "").trim();
      if (!name) throw new Error("Name cannot be empty");
      patch.name = name;
    }
    if (data.category !== undefined) {
      patch.category = String(data.category || "").trim().toUpperCase() || "GENERAL";
    }
    if (data.unit !== undefined) {
      patch.unit = String(data.unit || "").trim() || "pcs";
    }
    if (Object.keys(patch).length === 0) {
      throw new Error("No inventory fields to update");
    }
    return prisma.inventoryItem.update({
      where: { id },
      data: patch,
    });
  },
};
