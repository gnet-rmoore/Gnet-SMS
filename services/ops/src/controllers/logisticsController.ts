import type { Request, Response } from "express";
import { logisticsService } from "../services/logisticsService";

/** Ported verbatim from src/server/controllers/logisticsController.ts */
export const logisticsController = {
  // Security Logs
  async getSecurityLogs(req: Request, res: Response) {
    const { schoolId } = req.params;
    try {
      const logs = await logisticsService.getSecurityLogs(schoolId);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch security logs" });
    }
  },

  async createSecurityLog(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "SECURITY"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const log = await logisticsService.createSecurityLog(schoolId, req.body, user.id);
      res.json(log);
    } catch (err) {
      res.status(500).json({ error: "Failed to create security log" });
    }
  },

  // Vehicles
  async getVehicles(req: Request, res: Response) {
    const { schoolId } = req.params;
    try {
      const vehicles = await logisticsService.getVehicles(schoolId);
      res.json(vehicles);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch vehicles" });
    }
  },

  async createVehicle(req: Request, res: Response) {
    const { schoolId } = req.params;
    try {
      const vehicle = await logisticsService.createVehicle(schoolId, req.body);
      res.status(201).json(vehicle);
    } catch (err) {
      res.status(500).json({ error: "Failed to create vehicle" });
    }
  },

  async updateVehicle(req: Request, res: Response) {
    try {
      const vehicle = await logisticsService.updateVehicle(req.params.id, req.body);
      res.json(vehicle);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update vehicle" });
    }
  },

  async createVehicleMaintenance(req: Request, res: Response) {
    try {
      const log = await logisticsService.createVehicleMaintenance(req.params.id, req.body);
      res.status(201).json(log);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to log maintenance" });
    }
  },

  async getTransportRoutes(req: Request, res: Response) {
    try {
      res.json(await logisticsService.getTransportRoutes(req.params.schoolId));
    } catch {
      res.status(500).json({ error: "Failed to fetch routes" });
    }
  },

  async getStudentTransportSummaryInternal(req: Request, res: Response) {
    const { schoolId, studentId } = req.params;
    try {
      const transport = await logisticsService.getStudentTransportSummary(schoolId, studentId);
      if (!transport) return res.status(404).json({ error: "No active transport assignment" });
      res.json({ transport });
    } catch {
      res.status(500).json({ error: "Failed to fetch transport summary" });
    }
  },

  async createTransportRoute(req: Request, res: Response) {
    try {
      res.status(201).json(await logisticsService.createTransportRoute(req.params.schoolId, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create route" });
    }
  },

  async updateTransportRoute(req: Request, res: Response) {
    try {
      res.json(await logisticsService.updateTransportRoute(req.params.id, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update route" });
    }
  },

  async addTransportStop(req: Request, res: Response) {
    try {
      res.status(201).json(await logisticsService.addTransportStop(req.params.id, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to add stop" });
    }
  },

  async addTransportRider(req: Request, res: Response) {
    try {
      res.status(201).json(await logisticsService.addTransportRider(req.params.id, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to add rider" });
    }
  },

  async removeTransportRider(req: Request, res: Response) {
    try {
      res.json(await logisticsService.removeTransportRider(req.params.id, req.params.studentId));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to remove rider" });
    }
  },

  // Work Orders
  async getWorkOrders(req: Request, res: Response) {
    const { schoolId } = req.params;
    try {
      const result = await logisticsService.getWorkOrders(schoolId, {
        q: req.query.q ? String(req.query.q) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        page: req.query.page as string | undefined,
        pageSize: req.query.pageSize as string | undefined,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch work orders" });
    }
  },

  async createWorkOrder(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    try {
      const order = await logisticsService.createWorkOrder(schoolId, req.body, user.id);
      res.status(201).json(order);
    } catch (err: any) {
      const msg = err?.message || "Failed to create work order";
      const status = msg.includes("required") ? 400 : 500;
      res.status(status).json({ error: msg });
    }
  },

  async updateWorkOrder(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const order = await logisticsService.updateWorkOrder(id, req.body);
      res.json(order);
    } catch (err: any) {
      const msg = err?.message || "Failed to update work order";
      const status = msg.includes("empty") ? 400 : 500;
      res.status(status).json({ error: msg });
    }
  },

  // Inventory
  async getInventory(req: Request, res: Response) {
    const { schoolId } = req.params;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    try {
      const items = await logisticsService.getInventory(schoolId, category);
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  },

  async createInventoryItem(req: Request, res: Response) {
    const { schoolId } = req.params;
    const user = (req as any).user;
    if (!["SCHOOL_ADMIN", "PROCUREMENT", "IT_ADMIN"].includes(user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const item = await logisticsService.createInventoryItem(schoolId, req.body);
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: "Failed to create inventory item" });
    }
  },

  async updateInventoryItem(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const item = await logisticsService.updateInventoryItem(id, req.body);
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: "Failed to update inventory" });
    }
  },
};
