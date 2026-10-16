import express from "express";
import helmet from "helmet";
import { mountEntitlementGate } from "./lib/entitlements";
import { ACADEMIC_ENTITLEMENT_RULES } from "./lib/entitlementRules";
import academicRoutes from "./routes/academicRoutes";
import examRoutes from "./routes/examRoutes";
import onlineExamRoutes from "./routes/onlineExamRoutes";
import questionBankRoutes from "./routes/questionBankRoutes";
import examPaperRoutes from "./routes/examPaperRoutes";
import calendarRoutes from "./routes/calendarRoutes";
import scheduleRoutes from "./routes/scheduleRoutes";
import pdfRoutes from "./routes/pdfRoutes";
import prisma from "./lib/prisma";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
mountEntitlementGate(app, ACADEMIC_ENTITLEMENT_RULES);

app.get("/health/live", (_req, res) => {
  res.status(200).json({ status: "live", service: "academic" });
});

app.get("/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1;");
    res.status(200).json({ status: "ready", service: "academic", db: "connected" });
  } catch (err: any) {
    res.status(503).json({ status: "not_ready", service: "academic", db: "error", error: err.message });
  }
});

// Same path surface as the monolith — gateway routes here after Phase 3 cutover.
app.use(academicRoutes);
app.use(examRoutes);
app.use(onlineExamRoutes);
app.use(questionBankRoutes);
app.use(examPaperRoutes);
app.use(calendarRoutes);
app.use(scheduleRoutes);
app.use(pdfRoutes);

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[academic] express_error:", err);
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ error: "Internal Server Error" });
  } else {
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

export default app;
