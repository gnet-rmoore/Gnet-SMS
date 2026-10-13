import express from "express";
import { authController } from "../controllers/authController";
import { validateBody } from "../middleware/validate";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validation/schemas";
import { loginRateLimiter } from "../middleware/rateLimit";
import { authenticate } from "../middleware/auth";
import { mfaController } from "../controllers/mfaController";

const router = express.Router();

router.post("/api/auth/login", loginRateLimiter, validateBody(loginSchema), authController.login);
router.get("/api/auth/me", authenticate, authController.me);
router.post("/api/auth/logout", authenticate, authController.logout);
router.post(
  "/api/auth/forgot-password",
  loginRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  "/api/auth/reset-password",
  loginRateLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);
router.post(
  "/api/auth/verify-email",
  validateBody(verifyEmailSchema),
  authController.verifyEmail
);
router.post(
  "/api/auth/resend-verification",
  loginRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.resendVerification
);
router.post(
  "/api/super-admin/auth/login",
  loginRateLimiter,
  validateBody(loginSchema),
  authController.superAdminLogin
);

router.post("/api/auth/mfa/enroll/start", authenticate, mfaController.enrollStart);
router.post("/api/auth/mfa/enroll/confirm", authenticate, mfaController.enrollConfirm);
router.post("/api/auth/mfa/verify", loginRateLimiter, mfaController.verify);
router.get("/api/auth/mfa/status", authenticate, mfaController.status);
router.delete("/api/auth/mfa", authenticate, mfaController.disable);
router.post("/api/auth/mfa/enroll/sms/start", authenticate, mfaController.enrollSmsStart);
router.post("/api/auth/mfa/enroll/sms/confirm", authenticate, mfaController.enrollSmsConfirm);
router.post("/api/auth/mfa/send-sms", loginRateLimiter, mfaController.sendLoginSms);

export default router;
