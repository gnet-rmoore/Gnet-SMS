import type { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { getIdentityUser } from "../lib/identityClient";

const WORK_ORDER_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;
const WORK_ORDER_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const WORK_ORDER_IMPACTS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const WORK_ORDER_TYPES = [
  "REPAIR",
  "INSPECTION",
  "PREVENTIVE",
  "INSTALLATION",
  "CLEANING",
  "SAFETY",
  "OTHER",
] as const;
const STAFF_ROLES = new Set([
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPA",
  "MAINTENANCE",
  "IT_ADMIN",
  "PROCUREMENT",
  "LIBRARIAN",
  "TEACHER",
  "NURSE",
  "COUNSELOR",
  "ACCOUNTANT",
  "REGISTRAR",
  "VPI",
]);
const DATABASE_INT_MIN = -2147483648;
const DATABASE_INT_MAX = 2147483647;

function httpError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

function requiredText(value: unknown, field: string, maxLength: number): string {
  const text = String(value ?? "").trim();
  if (!text) throw httpError(`${field} is required`);
  if (text.length > maxLength) throw httpError(`${field} must be ${maxLength} characters or fewer`);
  return text;
}

function optionalText(value: unknown, field: string, maxLength = 500): string | null {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  if (text.length > maxLength) throw httpError(`${field} must be ${maxLength} characters or fewer`);
  return text || null;
}

function parseInteger(
  value: unknown,
  field: string,
  minimum = 0,
  maximum = DATABASE_INT_MAX
): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw httpError(`${field} must be a whole number between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function parseOptionalMoney(value: unknown, field: string): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw httpError(`${field} must be a non-negative amount`);
  }
  return parsed;
}

function parseOptionalDate(value: unknown, field: string): Date | null {
  if (value == null || value === "") return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (!Number.isFinite(parsed.getTime())) throw httpError(`${field} must be a valid date`);
  return parsed;
}

function oneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
  fallback?: T[number]
): T[number] {
  const normalized = String(value ?? fallback ?? "").trim().toUpperCase();
  const matched = allowed.find((candidate) => candidate === normalized);
  if (!matched) throw httpError(`${field} is invalid`);
  return matched;
}

async function requireSchoolStaff(schoolId: string, userId: string) {
  const user = await getIdentityUser(userId);
  if (
    !user ||
    user.schoolId !== schoolId ||
    user.isActive !== true ||
    !STAFF_ROLES.has(user.role)
  ) {
    throw httpError("Select an active staff member from this school");
  }
  return user;
}

function auditValue(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function isSerializationConflict(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2034"
  );
}

async function withSerializableRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isSerializationConflict(error) || attempt >= 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
}

export async function initializeFacilitiesHistory() {
  const items = await prisma.inventoryItem.findMany({
    where: { movements: { none: { baselineItemId: { not: null } } } },
    select: {
      id: true,
      schoolId: true,
      quantity: true,
      unitCost: true,
      condition: true,
      assetStatus: true,
      assignedTo: true,
    },
  });
  for (let offset = 0; offset < items.length; offset += 500) {
    const batch = items.slice(offset, offset + 500);
    await prisma.inventoryMovement.createMany({
      data: batch.map((item) => ({
        itemId: item.id,
        baselineItemId: item.id,
        schoolId: item.schoolId,
        movementType: "MIGRATION_BASELINE",
        quantityDelta: item.quantity,
        quantityBefore: 0,
        quantityAfter: item.quantity,
        reason: "Opening balance at audit rollout; earlier movement history is unavailable.",
        movementUnitCost: item.unitCost,
        newCondition: item.condition,
        newAssetStatus: item.assetStatus,
        newAssignedTo: item.assignedTo,
        performedBy: "SYSTEM_MIGRATION",
      })),
      skipDuplicates: true,
    });
  }

  const workOrders = await prisma.workOrder.findMany({
    where: { events: { none: {} } },
    select: {
      id: true,
      requestedBy: true,
      status: true,
      priority: true,
      assignedTo: true,
      dueAt: true,
      createdAt: true,
    },
  });
  for (let offset = 0; offset < workOrders.length; offset += 500) {
    const batch = workOrders.slice(offset, offset + 500);
    await prisma.workOrderEvent.createMany({
      data: batch.map((order) => ({
        workOrderId: order.id,
        baselineWorkOrderId: order.id,
        actorId: order.requestedBy,
        eventType: "MIGRATION_BASELINE",
        summary: "Existing work order; earlier activity is unavailable.",
        newValue: JSON.stringify({
          status: order.status,
          priority: order.priority,
          assignedTo: order.assignedTo,
          dueAt: order.dueAt,
        }),
        createdAt: order.createdAt,
      })),
      skipDuplicates: true,
    });
  }
}

/**
 * Ported from src/server/services/logisticsService.ts.
 * Dropped `driver.name` / `requester.name` / `assignee.name` / `logger.name`
 * Prisma includes — those are Identity.User fields and ops doesn't own User.
 * Callers get plain driverId/requestedBy/assignedTo/loggedBy IDs; enrich via
 * names at the API boundary through school-scoped Identity user data.
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
      if (opts?.status && String(opts.status).toUpperCase() !== "ALL") {
        where.status = oneOf(opts.status, WORK_ORDER_STATUSES, "Status");
      }
    const q = opts?.q?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
          { building: { contains: q, mode: "insensitive" } },
          { room: { contains: q, mode: "insensitive" } },
      ];
    }
      const page = parseInteger(opts?.page ?? 1, "Page", 1);
      const pageSize = Math.min(parseInteger(opts?.pageSize ?? 50, "Page size", 1), 100);
    const [total, items] = await Promise.all([
      prisma.workOrder.count({ where }),
      prisma.workOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
          include: {
            asset: {
              select: {
                id: true,
                name: true,
                assetTag: true,
                serialNumber: true,
                assetStatus: true,
              },
            },
            events: { orderBy: { createdAt: "desc" }, take: 10 },
          },
      }),
    ]);
    return { items, total, page, pageSize };
  },

  async createWorkOrder(schoolId: string, data: any, userId: string) {
      const title = requiredText(data.title, "Title", 160);
      const description = requiredText(data.description, "Description", 5000);
      const requestType = oneOf(data.requestType, WORK_ORDER_TYPES, "Request type", "REPAIR");
      const priority = oneOf(data.priority, WORK_ORDER_PRIORITIES, "Priority", "MEDIUM");
      const impact = oneOf(data.impact, WORK_ORDER_IMPACTS, "Impact", "MEDIUM");
      const location = optionalText(data.location, "Location", 240);
      const building = optionalText(data.building, "Building", 120);
      const room = optionalText(data.room, "Room", 120);
      if (!location && !building && !room) {
        throw httpError("A location, building, or room is required");
      }
      if (data.safetyRelated !== undefined && typeof data.safetyRelated !== "boolean") {
        throw httpError("Safety-related must be a boolean");
      }
      const safetyRelated = data.safetyRelated === true;
      const safetyNotes = optionalText(data.safetyNotes, "Safety notes", 2000);
      if (safetyRelated && !safetyNotes) {
        throw httpError("Safety notes are required for safety-related work");
      }
      const assignedTo = optionalText(data.assignedTo, "Assignee", 100);
      if (assignedTo) await requireSchoolStaff(schoolId, assignedTo);
      const inventoryItemId = optionalText(data.inventoryItemId, "Asset", 100);
      if (inventoryItemId) {
        const asset = await prisma.inventoryItem.findFirst({
          where: { id: inventoryItemId, schoolId, itemType: "ASSET" },
          select: { id: true, assetStatus: true },
        });
        if (!asset || ["RETIRED", "LOST"].includes(asset.assetStatus || "")) {
          throw httpError("Select an active asset from this school");
        }
      }
      const dueAt = parseOptionalDate(data.dueAt, "Due date");
      const estimatedCost = parseOptionalMoney(data.estimatedCost, "Estimated cost");

      const order = await prisma.workOrder.create({
        data: {
          title,
          description,
          requestType,
          priority,
          impact,
          location,
          building,
          room,
          dueAt,
          safetyRelated,
          safetyNotes,
          accessNotes: optionalText(data.accessNotes, "Access notes", 2000),
          estimatedCost,
          inventoryItemId,
          assignedTo,
          status: assignedTo ? "IN_PROGRESS" : "OPEN",
          requestedBy: userId,
          schoolId,
          events: {
            create: {
              actorId: userId,
              eventType: "CREATED",
              summary: "Work order created",
              newValue: JSON.stringify({
                status: assignedTo ? "IN_PROGRESS" : "OPEN",
                assignedTo,
                inventoryItemId,
              }),
            },
          },
        },
        include: { asset: true, events: { orderBy: { createdAt: "desc" }, take: 10 } },
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

  async updateWorkOrder(id: string, data: any, actorId: string) {
    const existing = await prisma.workOrder.findUnique({ where: { id } });
    if (!existing) throw new Error("Work order not found");
    if (data.assignedTo) await requireSchoolStaff(existing.schoolId, String(data.assignedTo));
    if (data.inventoryItemId) {
      const asset = await prisma.inventoryItem.findFirst({
        where: {
          id: String(data.inventoryItemId),
          schoolId: existing.schoolId,
          itemType: "ASSET",
        },
        select: { id: true, assetStatus: true },
      });
      if (!asset || ["RETIRED", "LOST"].includes(asset.assetStatus || "")) {
        throw httpError("Select an active asset from this school");
      }
    }

    const order = await withSerializableRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const current = await tx.workOrder.findUnique({ where: { id } });
          if (!current) throw httpError("Work order not found", 404);
          const patch: any = {};
          const events: {
            workOrderId: string;
            actorId: string;
            eventType: string;
            summary: string;
            oldValue: string | null;
            newValue: string | null;
          }[] = [];
          const record = (
            field: string,
            label: string,
            previous: unknown,
            next: unknown,
            value: unknown,
            eventType = "UPDATED"
          ) => {
            if (auditValue(previous) === auditValue(next)) return;
            patch[field] = value;
            events.push({
              workOrderId: id,
              actorId,
              eventType,
              summary: `${label} changed`,
              oldValue: auditValue(previous),
              newValue: auditValue(next),
            });
          };

          if (data.title !== undefined) {
            const title = requiredText(data.title, "Title", 160);
            record("title", "Title", current.title, title, title);
          }
          if (data.description !== undefined) {
            const description = requiredText(data.description, "Description", 5000);
            record("description", "Description", current.description, description, description);
          }
          if (data.requestType !== undefined) {
            const value = oneOf(data.requestType, WORK_ORDER_TYPES, "Request type");
            record("requestType", "Request type", current.requestType, value, value);
          }
          if (data.priority !== undefined) {
            const value = oneOf(data.priority, WORK_ORDER_PRIORITIES, "Priority");
            record("priority", "Priority", current.priority, value, value);
          }
          if (data.impact !== undefined) {
            const value = oneOf(data.impact, WORK_ORDER_IMPACTS, "Impact");
            record("impact", "Impact", current.impact, value, value);
          }
          if (data.status !== undefined) {
            const value = oneOf(data.status, WORK_ORDER_STATUSES, "Status");
            record("status", "Status", current.status, value, value, "STATUS_CHANGED");
            if (value === "COMPLETED" && current.status !== "COMPLETED") {
              patch.completedAt = new Date();
            } else if (value !== "COMPLETED" && current.status === "COMPLETED") {
              patch.completedAt = null;
            }
          }
          for (const field of ["location", "building", "room", "safetyNotes", "accessNotes"] as const) {
            if (data[field] === undefined) continue;
            const label = field === "safetyNotes" ? "Safety notes" : field === "accessNotes" ? "Access notes" : field;
            const maxLength =
              field === "location" ? 240 : field === "building" || field === "room" ? 120 : 2000;
            const value = optionalText(data[field], label, maxLength);
            record(field, label, current[field], value, value);
          }
          if (data.dueAt !== undefined) {
            const value = parseOptionalDate(data.dueAt, "Due date");
            record("dueAt", "Due date", current.dueAt, value, value);
          }
          if (data.estimatedCost !== undefined) {
            const value = parseOptionalMoney(data.estimatedCost, "Estimated cost");
            record("estimatedCost", "Estimated cost", current.estimatedCost, value, value);
          }
          if (data.resolutionNotes !== undefined) {
            const value = optionalText(data.resolutionNotes, "Resolution notes", 5000);
            record("resolutionNotes", "Resolution notes", current.resolutionNotes, value, value);
          }
          if (data.safetyRelated !== undefined) {
            if (typeof data.safetyRelated !== "boolean") {
              throw httpError("Safety-related must be a boolean");
            }
            record(
              "safetyRelated",
              "Safety-related flag",
              current.safetyRelated,
              data.safetyRelated,
              data.safetyRelated
            );
          }
          if (data.inventoryItemId !== undefined) {
            const value = optionalText(data.inventoryItemId, "Asset", 100);
            record("inventoryItemId", "Linked asset", current.inventoryItemId, value, value);
          }
          if (data.assignedTo !== undefined) {
            const value = optionalText(data.assignedTo, "Assignee", 100);
            record(
              "assignedTo",
              "Assignee",
              current.assignedTo,
              value,
              value,
              value ? "ASSIGNED" : "UNASSIGNED"
            );
          }
          if (Object.keys(patch).length === 0) {
            throw httpError("No work-order changes were provided");
          }
          if (data.safetyRelated === true && !patch.safetyNotes && !current.safetyNotes) {
            throw httpError("Safety notes are required for safety-related work");
          }
          if (patch.assignedTo && data.status === undefined && current.status === "OPEN") {
            patch.status = "IN_PROGRESS";
            events.push({
              workOrderId: id,
              actorId,
              eventType: "STATUS_CHANGED",
              summary: "Status changed after technician assignment",
              oldValue: "OPEN",
              newValue: "IN_PROGRESS",
            });
          }

          const updated = await tx.workOrder.update({
            where: { id },
            data: patch,
            include: { asset: true },
          });
          await tx.workOrderEvent.createMany({ data: events });
          return updated;
        },
        { isolationLevel: "Serializable" }
      )
    );

    const { notifyInApp } = await import("../lib/notifyInApp");
    const newAssignee = order.assignedTo;
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
      order.status === "COMPLETED" &&
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

  async createInventoryItem(schoolId: string, data: any, userId: string) {
    const itemType = oneOf(data.itemType, ["CONSUMABLE", "ASSET"] as const, "Item type", "CONSUMABLE");
    const name = requiredText(data.name, "Name", 160);
    const category = requiredText(data.category || "GENERAL", "Category", 80).toUpperCase();
    const quantity = itemType === "ASSET" ? 1 : parseInteger(data.quantity ?? 0, "Quantity");
    const minQuantity =
      itemType === "ASSET" ? 0 : parseInteger(data.minQuantity ?? 5, "Minimum quantity");
    const assetTag = optionalText(data.assetTag, "Asset tag", 100);
    if (itemType === "ASSET" && !assetTag) {
      throw httpError("Asset tag is required for equipment assets");
    }
    const condition =
      itemType === "ASSET"
        ? oneOf(
            data.condition,
            ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"] as const,
            "Condition",
            "GOOD"
          )
        : null;
    const purchaseDate = parseOptionalDate(data.purchaseDate, "Purchase date");
    const warrantyExpiresAt = parseOptionalDate(data.warrantyExpiresAt, "Warranty expiration");
    const unitCost = parseOptionalMoney(data.unitCost, "Unit cost");
    const itemData = {
      name,
      itemType,
      sku: optionalText(data.sku, "SKU", 100),
      description: optionalText(data.description, "Description", 2000),
      category,
      quantity,
      unit: optionalText(data.unit, "Unit", 40) || "pcs",
      minQuantity,
      location: optionalText(data.location, "Location", 240),
      supplier: optionalText(data.supplier, "Supplier", 160),
      unitCost,
      manufacturer: optionalText(data.manufacturer, "Manufacturer", 120),
      model: optionalText(data.model, "Model", 120),
      serialNumber: optionalText(data.serialNumber, "Serial number", 120),
      assetTag,
      condition,
      assetStatus: itemType === "ASSET" ? "AVAILABLE" : null,
      assignedTo: null,
      purchaseDate,
      warrantyExpiresAt,
      notes: optionalText(data.notes, "Notes", 2000),
      schoolId,
    };

    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({ data: itemData });
      await tx.inventoryMovement.create({
        data: {
          itemId: item.id,
          baselineItemId: item.id,
          schoolId,
          movementType: itemType === "ASSET" ? "ASSET_REGISTERED" : "OPENING_BALANCE",
          quantityDelta: quantity,
          quantityBefore: 0,
          quantityAfter: quantity,
          reason: "Initial inventory registration",
          movementUnitCost: unitCost,
          newCondition: item.condition,
          newAssetStatus: item.assetStatus,
          performedBy: userId,
        },
      });
      return item;
    });
  },

  async updateInventoryItem(id: string, data: any, userId: string) {
    if (data.quantity !== undefined) {
      throw httpError("Use a stock movement to change inventory quantity");
    }
    const current = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!current) throw httpError("Inventory item not found", 404);

    const patch: any = {};
    for (const field of ["name", "sku", "description", "category", "unit", "location", "supplier", "manufacturer", "model", "serialNumber", "assetTag", "notes"] as const) {
      if (data[field] === undefined) continue;
      const text = optionalText(data[field], field, field === "description" || field === "notes" ? 2000 : 240);
      if (field === "name" && !text) throw httpError("Name is required");
      patch[field] = field === "category" ? (text || "GENERAL").toUpperCase() : text;
    }
    if (data.minQuantity !== undefined) {
      if (current.itemType === "ASSET") throw httpError("Minimum stock only applies to consumables");
      patch.minQuantity = parseInteger(data.minQuantity, "Minimum quantity");
    }
    if (data.unitCost !== undefined) patch.unitCost = parseOptionalMoney(data.unitCost, "Unit cost");
    if (data.purchaseDate !== undefined) patch.purchaseDate = parseOptionalDate(data.purchaseDate, "Purchase date");
    if (data.warrantyExpiresAt !== undefined) {
      patch.warrantyExpiresAt = parseOptionalDate(data.warrantyExpiresAt, "Warranty expiration");
    }

    const assetChanged =
      data.assignedTo !== undefined ||
      data.assetStatus !== undefined ||
      data.condition !== undefined;
    let previousAssignedTo: string | null = null;
    let newAssignedTo: string | null = null;
    let previousAssetStatus: string | null = null;
    let newAssetStatus: string | null = null;
    let previousCondition: string | null = null;
    let newCondition: string | null = null;
    if (assetChanged) {
      if (current.itemType !== "ASSET") {
        throw httpError("Asset assignment and condition only apply to equipment assets");
      }
      previousAssignedTo = current.assignedTo;
      newAssignedTo =
        data.assignedTo === undefined
          ? current.assignedTo
          : optionalText(data.assignedTo, "Assignee", 100);
      previousAssetStatus = current.assetStatus || "AVAILABLE";
      newAssetStatus =
        data.assetStatus === undefined
          ? previousAssetStatus
          : oneOf(
              data.assetStatus,
              ["AVAILABLE", "ASSIGNED", "UNDER_REPAIR", "RETIRED", "LOST"] as const,
              "Asset status"
            );
      if (data.assetStatus !== undefined && newAssetStatus !== "ASSIGNED") {
        newAssignedTo = null;
      } else if (data.assignedTo !== undefined) {
        newAssetStatus = newAssignedTo ? "ASSIGNED" : "AVAILABLE";
      }
      if (newAssetStatus === "AVAILABLE") newAssignedTo = null;
      if (newAssetStatus === "ASSIGNED" && !newAssignedTo) {
        throw httpError("An assigned asset must have an assignee");
      }
      if (newAssetStatus === "RETIRED" || newAssetStatus === "LOST") {
        newAssignedTo = null;
      }
      if (newAssignedTo && newAssignedTo !== previousAssignedTo) {
        await requireSchoolStaff(current.schoolId, newAssignedTo);
      }
      previousCondition = current.condition;
      newCondition =
        data.condition === undefined
          ? previousCondition
          : oneOf(
              data.condition,
              ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"] as const,
              "Condition"
            );
      if (newAssignedTo !== previousAssignedTo) patch.assignedTo = newAssignedTo;
      if (newAssetStatus !== previousAssetStatus) patch.assetStatus = newAssetStatus;
      if (newCondition !== previousCondition) patch.condition = newCondition;
    }

    if (Object.keys(patch).length === 0) throw httpError("No inventory changes were provided");
    const assetFieldsChanged = Object.keys(patch).some((field) =>
      ["assignedTo", "assetStatus", "condition"].includes(field)
    );
    const reason = assetFieldsChanged
      ? requiredText(data.reason, "Reason", 500)
      : optionalText(data.reason, "Reason", 500) || "Inventory details updated";
    const changes: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [field, value] of Object.entries(patch)) {
      changes[field] = {
        before: auditValue((current as any)[field]),
        after: auditValue(value),
      };
    }

    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.update({ where: { id }, data: patch });
      await tx.inventoryMovement.create({
        data: {
          itemId: id,
          schoolId: current.schoolId,
          movementType: assetFieldsChanged
            ? newAssignedTo !== previousAssignedTo
              ? newAssignedTo
                ? "ASSET_ASSIGNED"
                : "ASSET_RETURNED"
              : newAssetStatus !== previousAssetStatus
                ? `ASSET_${newAssetStatus}`
                : "ASSET_CONDITION_CHANGED"
            : "ITEM_UPDATED",
          quantityDelta: 0,
          quantityBefore: current.quantity,
          quantityAfter: item.quantity,
          reason,
          previousCondition,
          newCondition,
          previousAssetStatus,
          newAssetStatus,
          previousAssignedTo,
          newAssignedTo,
          details: changes,
          performedBy: userId,
        },
      });
      return item;
    });
  },

  async getInventoryMovements(id: string) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      select: { id: true, schoolId: true },
    });
    if (!item) throw httpError("Inventory item not found", 404);
    return prisma.inventoryMovement.findMany({
      where: { itemId: id, schoolId: item.schoolId },
      orderBy: { createdAt: "desc" },
    });
  },

  async createInventoryMovement(id: string, data: any, userId: string) {
    const movementType = oneOf(
      data.movementType,
      ["RECEIVE", "ISSUE", "RETURN", "ADJUSTMENT"] as const,
      "Movement type"
    );
    const reason = requiredText(data.reason, "Reason", 500);
    const reference = optionalText(data.reference, "Reference", 120);
    const unitCost = parseOptionalMoney(data.unitCost, "Unit cost");
    const quantityDelta =
      movementType === "ADJUSTMENT"
        ? parseInteger(
            data.quantityDelta,
            "Adjustment quantity",
            DATABASE_INT_MIN,
            DATABASE_INT_MAX
          )
        : parseInteger(data.quantity, "Quantity", 1) *
          (movementType === "ISSUE" ? -1 : 1);
    if (quantityDelta === 0) throw httpError("Movement quantity cannot be zero");

    return withSerializableRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const current = await tx.inventoryItem.findUnique({ where: { id } });
          if (!current) throw httpError("Inventory item not found", 404);
          if (current.itemType !== "CONSUMABLE") {
            throw httpError("Use asset assignment for equipment assets");
          }
          const quantityAfter = current.quantity + quantityDelta;
          if (!Number.isSafeInteger(quantityAfter) || quantityAfter > DATABASE_INT_MAX) {
            throw httpError("Resulting stock exceeds the maximum supported quantity");
          }
          if (quantityAfter < 0) {
            throw httpError("Insufficient stock for this movement");
          }
          const item = await tx.inventoryItem.update({
            where: { id },
            data: {
              quantity: quantityAfter,
              ...(unitCost !== null && movementType === "RECEIVE" ? { unitCost } : {}),
            },
          });
          const movement = await tx.inventoryMovement.create({
            data: {
              itemId: id,
              schoolId: current.schoolId,
              movementType,
              quantityDelta,
              quantityBefore: current.quantity,
              quantityAfter: item.quantity,
              reason,
              reference,
              movementUnitCost: unitCost,
              performedBy: userId,
            },
          });
          return { item, movement };
        },
        { isolationLevel: "Serializable" }
      )
    );
  },
};
