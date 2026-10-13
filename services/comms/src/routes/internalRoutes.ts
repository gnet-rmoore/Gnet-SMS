import express from "express";
import { authenticateInternal } from "../middleware/auth";
import { sendSmsOtp } from "../services/smsOtpService";

const router = express.Router();

router.post("/api/internal/sms/otp", authenticateInternal, async (req, res) => {
  try {
    const to = String(req.body?.to || "").trim();
    const code = String(req.body?.code || "").trim();
    const purpose = String(req.body?.purpose || "mfa");
    const emailFallback = req.body?.emailFallback ? String(req.body.emailFallback) : null;
    if (!to || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "to and 6-digit code are required" });
    }
    const result = await sendSmsOtp({ to, code, purpose, emailFallback });
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "SMS OTP failed" });
  }
});

export default router;
