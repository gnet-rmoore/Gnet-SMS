/** Same Turnstile verify as Identity — keep in sync. */
export function captchaConfigured(): boolean {
  return Boolean(process.env.CAPTCHA_SECRET?.trim());
}

export function captchaRequired(): boolean {
  return captchaConfigured();
}

export async function verifyCaptchaToken(
  token: string | undefined | null,
  remoteIp?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!captchaRequired()) return { ok: true };
  const t = String(token || "").trim();
  if (!t) return { ok: false, error: "CAPTCHA required" };

  const secret = process.env.CAPTCHA_SECRET!.trim();
  try {
    const body = new URLSearchParams({ secret, response: t });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success) return { ok: true };
    return {
      ok: false,
      error: data["error-codes"]?.join(", ") || "CAPTCHA verification failed",
    };
  } catch (err: any) {
    console.warn("[captcha] verify error:", err?.message || err);
    return { ok: false, error: "CAPTCHA verification unavailable" };
  }
}

export async function assertCaptcha(
  token: string | undefined | null,
  remoteIp?: string
): Promise<void> {
  const result = await verifyCaptchaToken(token, remoteIp);
  if (!result.ok) {
    throw Object.assign(new Error(result.error || "CAPTCHA required"), {
      status: 400,
      code: "CAPTCHA_REQUIRED",
    });
  }
}
