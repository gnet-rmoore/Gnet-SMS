import express from "express";
import { authenticate, requireTenant, requireRoles, authenticateInternal } from "../middleware/auth";
import { apiKeyController } from "../controllers/apiKeyController";

const router = express.Router();

router.get(
  "/api/schools/:schoolId/api-keys",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "IT_ADMIN"]),
  apiKeyController.list
);

router.post(
  "/api/schools/:schoolId/api-keys",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "IT_ADMIN"]),
  apiKeyController.create
);

router.delete(
  "/api/schools/:schoolId/api-keys/:keyId",
  authenticate,
  requireTenant,
  requireRoles(["SCHOOL_ADMIN", "IT_ADMIN"]),
  apiKeyController.revoke
);

router.post("/api/internal/api-keys/verify", authenticateInternal, apiKeyController.verifyInternal);

export default router;
