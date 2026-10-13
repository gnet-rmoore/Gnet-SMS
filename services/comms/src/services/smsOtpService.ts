/**
 * SMS OTP delivery — console provider logs code; email fallback when phone maps to user email.
 */
import { sendTransactionalEmail } from "../lib/mailClient";

const RATE = new Map<string, number[]>();
const MAX_PER_HOUR = 5;

function rateLimit(key: string): boolean {
  const now = Date.now();
  const window = RATE.get(key) || [];
  const recent = window.filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= MAX_PER_HOUR) return false;
  recent.push(now);
  RATE.set(key, recent);
  return true;
}

export async function sendSmsOtp(input: {
  to: string;
  code: string;
  purpose?: string;
  emailFallback?: string | null;
}): Promise<{ ok: boolean; provider: string }> {
  const key = input.to;
  if (!rateLimit(key)) {
    throw Object.assign(new Error("Too many OTP requests. Try again later."), { status: 429 });
  }
  const provider = process.env.SMS_PROVIDER || "console";
  const body = `Your Gnet SMS verification code is ${input.code}. It expires in 10 minutes.`;
  console.log(`[comms-sms-otp] to=${input.to} purpose=${input.purpose || "mfa"} code=${input.code}`);

  if (provider === "console" && input.emailFallback) {
    const mail = await sendTransactionalEmail({
      to: input.emailFallback,
      subject: "Your SMS verification code",
      text: `${body}\n\n(SMS provider is in console mode — code delivered via email.)`,
      html: `<p>${body}</p><p><em>SMS provider is in console mode — code delivered via email.</em></p>`,
    });
    return { ok: mail.ok, provider: mail.provider || "email-fallback" };
  }
  return { ok: true, provider };
}
