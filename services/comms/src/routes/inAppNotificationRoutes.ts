import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { inAppNotificationController } from "../controllers/inAppNotificationController";

const router = Router();

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

function requireInternal(req: any, res: any, next: any) {
  if (!INTERNAL_TOKEN || req.headers["x-internal-token"] !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: "Unauthorized internal call" });
  }
  return next();
}

router.get(
  "/api/notifications",
  authenticate,
  inAppNotificationController.list
);

router.get(
  "/api/notifications/unread-count",
  authenticate,
  inAppNotificationController.unreadCount
);

router.get(
  "/api/notifications/nav-badges",
  authenticate,
  inAppNotificationController.navBadges
);

router.patch(
  "/api/notifications/:id/read",
  authenticate,
  inAppNotificationController.markRead
);

router.post(
  "/api/notifications/read-all",
  authenticate,
  inAppNotificationController.markAllRead
);

router.post(
  "/api/internal/notifications",
  requireInternal,
  inAppNotificationController.createInternal
);

export default router;
