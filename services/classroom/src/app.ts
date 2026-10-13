import express from "express";
import helmet from "helmet";
import { mountEntitlementGate } from "./lib/entitlements";
import { CLASSROOM_ENTITLEMENT_RULES } from "./lib/entitlementRules";
import classroomRoutes from "./routes/classroomRoutes";
import prisma from "./lib/prisma";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
mountEntitlementGate(app, CLASSROOM_ENTITLEMENT_RULES);

app.get("/health/live", (_req, res) => {
  res.status(200).json({ status: "live", service: "classroom" });
});

app.get("/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1;");
    res.status(200).json({ status: "ready", service: "classroom", db: "connected" });
  } catch (err: any) {
    res.status(503).json({ status: "not_ready", service: "classroom", db: "error", error: err.message });
  }
});

// Same path surface as the monolith — gateway routes here after Phase 3 cutover.
app.use(classroomRoutes);

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[classroom] express_error:", err);
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ error: "Internal Server Error" });
  } else {
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

export default app;
