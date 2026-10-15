/**
 * Pure helpers for consent-gated live screen view (Phase 3).
 * Kept DB/S3-free so they can be unit-tested.
 */

export type ProctorLevel = "OFF" | "MONITOR" | "SCREEN_VIEW";

export const PROCTOR_LEVELS: ProctorLevel[] = ["OFF", "MONITOR", "SCREEN_VIEW"];

/** Only SCREEN_VIEW captures student screens. */
export function capturesScreen(proctorLevel: string | null | undefined): boolean {
  return String(proctorLevel || "").toUpperCase() === "SCREEN_VIEW";
}

const DEFAULT_INTERVAL_MS = 15_000;
const MIN_INTERVAL_MS = 5_000;
const MAX_INTERVAL_MS = 120_000;

/**
 * Resolve the snapshot cadence (ms) from an exam's kiosk config, clamped to a
 * sane range so a bad config can never spam capture or stall the loop.
 */
export function resolveFrameIntervalMs(kioskConfig: {
  screenFrameIntervalMs?: unknown;
} | null | undefined): number {
  const raw = Number(kioskConfig?.screenFrameIntervalMs);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_INTERVAL_MS;
  return Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, Math.trunc(raw)));
}

const DEFAULT_RETENTION_DAYS = 7;

/** Retention window (days) for stored frames; env overridable, clamped 1–90. */
export function resolveRetentionDays(raw?: string | number | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_RETENTION_DAYS;
  return Math.max(1, Math.min(90, Math.trunc(n)));
}

export function computeFrameExpiry(capturedAt: Date, retentionDays: number): Date {
  const days = Math.max(1, Math.trunc(retentionDays) || DEFAULT_RETENTION_DAYS);
  return new Date(capturedAt.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Deterministic object key for a frame (best-effort timestamp slug). */
export function proctorFrameStorageKey(opts: {
  schoolId: string;
  examId: string;
  attemptId: string;
  at: Date;
  ext?: string;
}): string {
  const rawExt = String(opts.ext || "jpg");
  const ext =
    rawExt.slice(rawExt.lastIndexOf(".") + 1).replace(/[^a-zA-Z0-9]/g, "") || "jpg";
  const parts = [
    "proctor-frames",
    opts.schoolId,
    opts.examId,
    opts.attemptId,
    `${opts.at.getTime()}`,
  ];
  return `${parts.join("/")}.${ext}`;
}

/**
 * Whether the student agent should perform capture. Requires SCREEN_VIEW, a
 * recorded consent, and working storage — otherwise nothing is captured.
 */
export function shouldCaptureScreen(opts: {
  proctorLevel: string | null | undefined;
  consented: boolean;
  storageEnabled: boolean;
}): boolean {
  if (!opts.storageEnabled) return false;
  if (!capturesScreen(opts.proctorLevel)) return false;
  return Boolean(opts.consented);
}

export function isFrameExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
