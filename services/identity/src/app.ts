import express from "express";
import helmet from "helmet";
import { mountEntitlementGate } from "./lib/entitlements";
import { IDENTITY_ENTITLEMENT_RULES } from "./lib/entitlementRules";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import schoolRoutes from "./routes/schoolRoutes";
import superAdminRoutes from "./routes/superAdminRoutes";
import apiKeyRoutes from "./routes/apiKeyRoutes";
import publicRoutes from "./routes/publicRoutes";
import prisma from "./lib/prisma";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
mountEntitlementGate(app, IDENTITY_ENTITLEMENT_RULES);

app.get("/health/live", (_req, res) => {
  res.status(200).json({ status: "live", service: "identity" });
});

app.get("/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1;");
    res.status(200).json({ status: "ready", service: "identity", db: "connected" });
  } catch (err: any) {
    res.status(503).json({ status: "not_ready", service: "identity", db: "error", error: err.message });
  }
});

app.use(publicRoutes);
app.use(authRoutes);
app.use(userRoutes);
app.use(apiKeyRoutes);
app.use(schoolRoutes);
app.use(superAdminRoutes);

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[identity] express_error:", err);
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ error: "Internal Server Error" });
  } else {
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

export default app;
