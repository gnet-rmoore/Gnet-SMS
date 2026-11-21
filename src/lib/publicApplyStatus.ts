/** Token-free public application status URL. */
export function buildStatusUrl(slug: string): string {
  return `/apply/${encodeURIComponent(slug)}/status`;
}

export const APPLY_REFERENCE_STORAGE_KEY = "sms:apply-reference";

function referenceKey(slug: string): string {
  return `${APPLY_REFERENCE_STORAGE_KEY}:${slug}`;
}

export function saveReference(slug: string, reference: string) {
  try {
    const value = String(reference || "").trim();
    if (!value) return;
    sessionStorage.setItem(referenceKey(slug), value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadReference(slug: string): string {
  try {
    return sessionStorage.getItem(referenceKey(slug)) || "";
  } catch {
    return "";
  }
}
