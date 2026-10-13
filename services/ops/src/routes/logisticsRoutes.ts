import express from "express";
import { authenticate, requireTenant, requireRoles, requireResourceTenant, authenticateInternal } from "../middleware/auth";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { logisticsController } from "../controllers/logisticsController";
import { auditController } from "../controllers/auditController";
import { requireFeature } from "../lib/entitlements";

/** Same paths as monolith src/server/routes/logisticsRoutes.ts. */
const router = express.Router();

router.get(
  "/api/internal/schools/:schoolId/students/:studentId/transport-summary",
  authenticateInternal,
  logisticsController.getStudentTransportSummaryInternal
);

const INV_ROLES = [
  "SCHOOL_ADMIN", "PRINCIPAL", "VPA", "PROCUREMENT", "IT_ADMIN", "LIBRARIAN",
  "CAFETERIA_MANAGER", "ATHLETICS_DIRECTOR", "NURSE", "HOSTEL_WARDEN",
  "MAINTENANCE",
];

router.get(
  "/api/schools/:schoolId/security-logs",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "SECURITY"]),
  logisticsController.getSecurityLogs
);

router.post(
  "/api/schools/:schoolId/security-logs",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "SECURITY"]),
  logisticsController.createSecurityLog
);

router.get(
  "/api/schools/:schoolId/vehicles",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "TRANSPORTATION"]),
  requireFeature("transport"),
  logisticsController.getVehicles
);

const TRANSPORT_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "TRANSPORTATION"];

router.post(
  "/api/schools/:schoolId/vehicles",
  authenticate,
  requireTenant,
  requireRoles(TRANSPORT_ROLES),
  requireFeature("transport"),
  logisticsController.createVehicle
);

router.patch(
  "/api/vehicles/:id",
  authenticate,
  requireRoles(TRANSPORT_ROLES),
  requireResourceTenant(resourceLoaders.vehicle),
  requireFeature("transport"),
  logisticsController.updateVehicle
);

router.post(
  "/api/vehicles/:id/maintenance",
  authenticate,
  requireRoles(TRANSPORT_ROLES),
  requireResourceTenant(resourceLoaders.vehicle),
  requireFeature("transport"),
  logisticsController.createVehicleMaintenance
);

router.get(
  "/api/schools/:schoolId/transport/routes",
  authenticate,
  requireTenant,
  requireRoles(TRANSPORT_ROLES),
  requireFeature("transport"),
  logisticsController.getTransportRoutes
);

router.post(
  "/api/schools/:schoolId/transport/routes",
  authenticate,
  requireTenant,
  requireRoles(TRANSPORT_ROLES),
  requireFeature("transport"),
  logisticsController.createTransportRoute
);

router.patch(
  "/api/transport/routes/:id",
  authenticate,
  requireRoles(TRANSPORT_ROLES),
  requireResourceTenant(resourceLoaders.transportRoute),
  requireFeature("transport"),
  logisticsController.updateTransportRoute
);

router.post(
  "/api/transport/routes/:id/stops",
  authenticate,
  requireRoles(TRANSPORT_ROLES),
  requireResourceTenant(resourceLoaders.transportRoute),
  requireFeature("transport"),
  logisticsController.addTransportStop
);

router.post(
  "/api/transport/routes/:id/riders",
  authenticate,
  requireRoles(TRANSPORT_ROLES),
  requireResourceTenant(resourceLoaders.transportRoute),
  requireFeature("transport"),
  logisticsController.addTransportRider
);

router.delete(
  "/api/transport/routes/:id/riders/:studentId",
  authenticate,
  requireRoles(TRANSPORT_ROLES),
  requireResourceTenant(resourceLoaders.transportRoute),
  requireFeature("transport"),
  logisticsController.removeTransportRider
);

router.get(
  "/api/schools/:schoolId/work-orders",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "MAINTENANCE"]),
  logisticsController.getWorkOrders
);

router.post(
  "/api/schools/:schoolId/work-orders",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "MAINTENANCE"]),
  logisticsController.createWorkOrder
);

router.patch(
  "/api/work-orders/:id",
  authenticate,
  requireRoles(["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "MAINTENANCE"]),
  requireResourceTenant(resourceLoaders.workOrder),
  logisticsController.updateWorkOrder
);

router.get(
  "/api/schools/:schoolId/inventory",
  authenticate,
  requireTenant,
  requireRoles(INV_ROLES),
  requireFeature("inventory"),
  logisticsController.getInventory
);

router.post(
  "/api/schools/:schoolId/inventory",
  authenticate,
  requireTenant,
  requireRoles(INV_ROLES),
  requireFeature("inventory"),
  logisticsController.createInventoryItem
);

router.patch(
  "/api/inventory/:id",
  authenticate,
  requireRoles(INV_ROLES),
  requireResourceTenant(resourceLoaders.inventory),
  requireFeature("inventory"),
  logisticsController.updateInventoryItem
);

router.get("/api/internal/audit/events", authenticateInternal, auditController.listEvents);

export default router;
