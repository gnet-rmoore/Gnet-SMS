import express from "express";
import helmet from "helmet";
import { mountEntitlementGate } from "./lib/entitlements";
import { COMMS_ENTITLEMENT_RULES } from "./lib/entitlementRules";
import internalRoutes from "./routes/internalRoutes";
import announcementRoutes from "./routes/announcementRoutes";
import documentRoutes from "./routes/documentRoutes";
import notificationPreferenceRoutes from "./routes/notificationPreferenceRoutes";
import inAppNotificationRoutes from "./routes/inAppNotificationRoutes";
import ptaRoutes from "./routes/ptaRoutes";
import prisma from "./lib/prisma";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
mountEntitlementGate(app, COMMS_ENTITLEMENT_RULES);

app.get("/health/live", (_req, res) => {
  res.status(200).json({ status: "live", service: "comms" });
});

app.get("/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1;");
    res.status(200).json({ status: "ready", service: "comms", db: "connected" });
  } catch (err: any) {
    res.status(503).json({ status: "not_ready", service: "comms", db: "error", error: err.message });
  }
});

// Same path surface as the monolith — gateway routes here after Phase 3 cutover.
app.use(internalRoutes);
app.use(announcementRoutes);
app.use(documentRoutes);
app.use(notificationPreferenceRoutes);
app.use(inAppNotificationRoutes);
app.use(ptaRoutes);

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[comms] express_error:", err);
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ error: "Internal Server Error" });
  } else {
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

export default app;
