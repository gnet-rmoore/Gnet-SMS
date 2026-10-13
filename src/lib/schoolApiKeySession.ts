const STORAGE_PREFIX = "gnet_school_api_key:";
export const SCHOOL_API_KEY_SAVED_EVENT = "sms:school-api-key-saved";

export type StoredSchoolApiKey = {
  secret: string;
  keyPrefix?: string;
  name?: string;
  savedAt: number;
};

/** Keep a freshly created API key in sessionStorage for in-browser docs testing (this tab/session only). */
export function saveSchoolApiKeyForSession(
  schoolId: string,
  payload: Omit<StoredSchoolApiKey, "savedAt">
): void {
  if (!schoolId || !payload.secret?.startsWith("gnet_live_")) return;
  try {
    sessionStorage.setItem(
      `${STORAGE_PREFIX}${schoolId}`,
      JSON.stringify({ ...payload, savedAt: Date.now() } satisfies StoredSchoolApiKey)
    );
    window.dispatchEvent(
      new CustomEvent(SCHOOL_API_KEY_SAVED_EVENT, { detail: { schoolId } })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadSchoolApiKeyForSession(schoolId: string): StoredSchoolApiKey | null {
  if (!schoolId) return null;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${schoolId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSchoolApiKey;
    if (!parsed?.secret?.startsWith("gnet_live_")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSchoolApiKeyForSession(schoolId: string): void {
  if (!schoolId) return;
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${schoolId}`);
  } catch {
    /* ignore */
  }
}

export function maskApiKey(secret: string): string {
  if (secret.length <= 16) return "gnet_live_…";
  return `${secret.slice(0, 14)}…${secret.slice(-4)}`;
}
