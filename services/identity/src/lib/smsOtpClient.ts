const COMMS_URL = process.env.COMMS_URL || "http://localhost:3017";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";

export async function sendSmsOtpViaComms(input: {
  phoneE164: string;
  code: string;
  purpose: string;
  emailFallback?: string | null;
}) {
  const res = await fetch(`${COMMS_URL}/api/internal/sms/otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(INTERNAL_TOKEN ? { "x-internal-token": INTERNAL_TOKEN } : {}),
    },
    body: JSON.stringify({
      to: input.phoneE164,
      code: input.code,
      purpose: input.purpose,
      emailFallback: input.emailFallback,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || "Failed to send SMS OTP"), { status: res.status });
  }
  return data;
}
