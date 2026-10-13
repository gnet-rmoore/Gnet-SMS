/** Build a bookmarkable public application status URL. */
export function buildApplyStatusUrl(slug: string, id: string, token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({ id, token });
  return `${origin}/apply/${encodeURIComponent(slug)}/status?${params.toString()}`;
}

/** Parse id + token from a pasted status link. */
export function parseApplyStatusUrl(input: string): { id: string; token: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(trimmed, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const id = url.searchParams.get("id");
    const token = url.searchParams.get("token");
    if (id && token) return { id, token };
  } catch {
    /* not a URL */
  }
  return null;
}

export const APPLY_STATUS_STORAGE_KEY = "sms:apply-status-credentials";

export type SavedApplyStatus = {
  slug: string;
  id: string;
  token: string;
  applicationNumber?: string | null;
};

export function saveApplyStatusCredentials(payload: SavedApplyStatus) {
  try {
    sessionStorage.setItem(APPLY_STATUS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadApplyStatusCredentials(slug: string): SavedApplyStatus | null {
  try {
    const raw = sessionStorage.getItem(APPLY_STATUS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedApplyStatus;
    if (parsed.slug !== slug || !parsed.id || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}
