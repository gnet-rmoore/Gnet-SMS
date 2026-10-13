import express from "express";
import helmet from "helmet";
import { mountEntitlementGate } from "./lib/entitlements";
import { CAMPUS_ENTITLEMENT_RULES } from "./lib/entitlementRules";
import campusRoutes from "./routes/campusRoutes";
import prisma from "./lib/prisma";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
mountEntitlementGate(app, CAMPUS_ENTITLEMENT_RULES);

app.get("/health/live", (_req, res) => {
  res.status(200).json({ status: "live", service: "campus" });
});

app.get("/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1;");
    res.status(200).json({ status: "ready", service: "campus", db: "connected" });
  } catch (err: any) {
    res.status(503).json({ status: "not_ready", service: "campus", db: "error", error: err.message });
  }
});

app.use(campusRoutes);

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[campus] express_error:", err);
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ error: "Internal Server Error" });
  } else {
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

export default app;
