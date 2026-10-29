import express from "express";
import { publicOnboardingController } from "../controllers/publicOnboardingController";

const router = express.Router();

router.get("/api/public/plans", async (_req, res) => {
  try {
    const { platformOpsService } = await import("../services/platformOpsService");
    res.json(await platformOpsService.listPublicPlans());
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list plans" });
  }
});

router.get("/api/public/slug-available", publicOnboardingController.slugAvailable);
router.get("/api/public/resolve-host", async (req, res) => {
  try {
    const { platformOpsService } = await import("../services/platformOpsService");
    const host = String(req.query.host || req.headers.host || "");
    res.json(await platformOpsService.resolveHost(host));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "resolve-host failed" });
  }
});

/** Caddy on_demand_tls ask — 200 allow / 404 deny (no body required by Caddy). */
router.get("/api/public/domain-tls-ask", async (req, res) => {
  try {
    const { platformOpsService } = await import("../services/platformOpsService");
    const domain = String(req.query.domain || "");
    const result = await platformOpsService.domainTlsAsk(domain);
    if (result.allow) return res.status(200).json(result);
    return res.status(404).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "domain-tls-ask failed" });
  }
});
router.post("/api/public/school-registrations", publicOnboardingController.submitRegistration);
router.post(
  "/api/public/school-registrations/:id/confirm-email",
  (req, res, next) => {
    if (!req.body) req.body = {};
    if (!req.body.id) req.body.id = req.params.id;
    if (!req.body.token && req.query.token) req.body.token = req.query.token;
    next();
  },
  publicOnboardingController.confirmRegistrationEmail
);
router.post(
  "/api/public/school-registrations/:id/resend-confirmation",
  publicOnboardingController.resendRegistrationEmail
);
router.post("/api/public/invites/:token/accept", publicOnboardingController.acceptInvite);
router.get("/api/public/schools/:slug", async (req, res) => {
  const { schoolController } = await import("../controllers/schoolController");
  return schoolController.getBySlugPublic(req, res);
});

router.get("/api/public/schools/:slug/admission-background", async (req, res) => {
  const { schoolController } = await import("../controllers/schoolController");
  return schoolController.getPublicBackground(req, res);
});

router.get("/api/public/schools/:slug/grade-levels", async (req, res) => {
  const { schoolController } = await import("../controllers/schoolController");
  return schoolController.getPublicGradeLevels(req, res);
});

export default router;
