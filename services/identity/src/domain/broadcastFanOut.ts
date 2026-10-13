/**
 * Pure helpers for platform broadcast fan-out diagnostics (unit-testable).
 */

export type FanOutResult = { email: string; ok: boolean; provider?: string; error?: string };

export function summarizeBroadcastFanOut(results: FanOutResult[]) {
  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  return {
    queued: results.length,
    sent,
    failed,
    recipientsPreview: results.slice(0, 20).map((r) => r.email),
  };
}

/** Active school-admin emails only (mirrors broadcast recipient filter intent). */
export function filterBroadcastRecipients(
  users: Array<{ email: string; role: string; isActive: boolean; schoolId: string | null }>
): Array<{ email: string; schoolId: string }> {
  return users
    .filter((u) => u.role === "SCHOOL_ADMIN" && u.isActive && u.schoolId)
    .map((u) => ({ email: u.email, schoolId: u.schoolId as string }));
}
