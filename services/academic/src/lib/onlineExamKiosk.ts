/**
 * Pure kiosk / proctoring policy helpers for online exams.
 * DB-free so they can be unit-tested (see tests/online-exam-kiosk.test.ts).
 */

/** All violation types the server will accept (client-reported, server-clamped). */
export const VIOLATION_TYPES = [
  "EXIT_FULLSCREEN",
  "TAB_BLUR",
  "VISIBILITY_HIDDEN",
  "CONTEXT_MENU",
  "COPY_ATTEMPT",
  "PASTE_ATTEMPT",
  "DEVTOOLS",
  "MULTI_MONITOR",
  "SCREEN_SHARE_STOPPED",
] as const;

export type ViolationType = (typeof VIOLATION_TYPES)[number];

const VIOLATION_TYPE_SET = new Set<string>(VIOLATION_TYPES);

export function isKnownViolationType(type: unknown): type is ViolationType {
  return VIOLATION_TYPE_SET.has(String(type || "").toUpperCase());
}

export type KioskConfig = {
  requireFullscreen: boolean;
  requireScreenShare: boolean;
  /** Number of *counted* violations before auto-submit. 0 = unlimited. */
  maxViolations: number;
  /** Counted violations at which to show a warning to the student. */
  warnAt: number;
  /** Violation types that count toward the limit (others are only recorded). */
  blockedEvents: string[];
  /** When false, a disconnect/expiry finalizes the attempt instead of allowing resume. */
  allowReconnect: boolean;
};

export const DEFAULT_KIOSK_CONFIG: KioskConfig = {
  requireFullscreen: true,
  requireScreenShare: false,
  maxViolations: 3,
  warnAt: 1,
  blockedEvents: [
    "EXIT_FULLSCREEN",
    "TAB_BLUR",
    "VISIBILITY_HIDDEN",
    "COPY_ATTEMPT",
  ],
  allowReconnect: true,
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

/**
 * Parse a stored kiosk config (JSON string) merged over defaults. When the
 * legacy `exam.maxViolations` is supplied, it seeds `maxViolations` for
 * backward compatibility with exams configured before kioskConfig existed.
 */
export function parseKioskConfig(
  raw: string | null | undefined,
  legacyMaxViolations?: number | null
): KioskConfig {
  const base: KioskConfig = { ...DEFAULT_KIOSK_CONFIG };
  if (typeof legacyMaxViolations === "number" && legacyMaxViolations >= 0) {
    base.maxViolations = Math.min(50, Math.trunc(legacyMaxViolations));
  }
  if (!raw) return base;

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return base;
  }
  if (!parsed || typeof parsed !== "object") return base;

  const blockedEvents = Array.isArray(parsed.blockedEvents)
    ? parsed.blockedEvents
        .map((t: unknown) => String(t || "").toUpperCase())
        .filter((t: string) => VIOLATION_TYPE_SET.has(t))
    : base.blockedEvents;

  const maxViolations =
    parsed.maxViolations === undefined
      ? base.maxViolations
      : clampInt(parsed.maxViolations, 0, 50, base.maxViolations);

  const warnAt =
    parsed.warnAt === undefined
      ? base.warnAt
      : clampInt(parsed.warnAt, 0, 50, base.warnAt);

  return {
    requireFullscreen:
      typeof parsed.requireFullscreen === "boolean"
        ? parsed.requireFullscreen
        : base.requireFullscreen,
    requireScreenShare:
      typeof parsed.requireScreenShare === "boolean"
        ? parsed.requireScreenShare
        : base.requireScreenShare,
    maxViolations,
    warnAt: Math.min(warnAt, maxViolations > 0 ? maxViolations : warnAt),
    blockedEvents,
    allowReconnect:
      typeof parsed.allowReconnect === "boolean"
        ? parsed.allowReconnect
        : base.allowReconnect,
  };
}

/** Whether a violation type counts toward the auto-submit limit. */
export function isCountedViolation(config: KioskConfig, type: string): boolean {
  return config.blockedEvents.includes(String(type || "").toUpperCase());
}

/**
 * Decide the server response for the current counted-violation tally.
 * `counted` is the number of *counted* violations including the new one.
 */
export function evaluateViolation(
  config: KioskConfig,
  counted: number
): { warn: boolean; autoSubmit: boolean } {
  if (!Number.isFinite(config.maxViolations) || config.maxViolations <= 0) {
    return { warn: false, autoSubmit: false };
  }
  const autoSubmit = counted >= config.maxViolations;
  const warn = !autoSubmit && config.warnAt > 0 && counted >= config.warnAt;
  return { warn, autoSubmit };
}

export function serializeKioskConfig(config: KioskConfig): string {
  return JSON.stringify(config);
}
