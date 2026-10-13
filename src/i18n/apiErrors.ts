import i18n from "./instance";

type ErrLike = {
  code?: unknown;
  message?: unknown;
  error?: unknown;
  response?: { data?: { code?: unknown; error?: unknown; message?: unknown } };
};

function pickCode(err: ErrLike): string | null {
  const candidates = [
    err.code,
    err.response?.data?.code,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function pickMessage(err: ErrLike): string | null {
  const candidates = [
    err.response?.data?.error,
    err.response?.data?.message,
    err.error,
    err.message,
  ];
  for (const m of candidates) {
    if (typeof m === "string" && m.trim()) return m.trim();
  }
  return null;
}

/**
 * Map API / thrown errors to a localized user-facing string.
 * Prefer `errors:<CODE>` when present; fall back to a raw message, then generic.
 */
export function translateApiError(err: unknown): string {
  const e = (err && typeof err === "object" ? err : {}) as ErrLike;
  const code = pickCode(e);
  if (code) {
    const key = `errors:${code}`;
    if (i18n.exists(key)) return i18n.t(key);
  }
  const msg = pickMessage(e);
  if (msg) return msg;
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  return i18n.t("errors:generic");
}
