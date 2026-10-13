/** Public Turnstile site key for register-school and public apply. */
export function turnstileSiteKey(): string {
  return (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || "";
}

export function captchaEnabledOnClient(): boolean {
  return Boolean(turnstileSiteKey());
}
