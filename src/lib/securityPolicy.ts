/** Client mirror of Identity `securityPolicy` helpers for Profile Security UI. */

export type MfaMode = "OFF" | "OPTIONAL" | "REQUIRED";

export type SecurityPolicy = {
  passwordMinLength: number;
  requireStrongPassword: boolean;
  sessionIdleMinutes: number;
  forcePasswordChangeDays: number;
  mfaMode: MfaMode;
  mfaRequiredRoles: string[];
  allowSmsMfa: boolean;
};

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  passwordMinLength: 6,
  requireStrongPassword: false,
  sessionIdleMinutes: 0,
  forcePasswordChangeDays: 0,
  mfaMode: "OFF",
  mfaRequiredRoles: [],
  allowSmsMfa: false,
};

const VALID_MFA_MODES = new Set<MfaMode>(["OFF", "OPTIONAL", "REQUIRED"]);

export function parseSecurityPolicy(
  raw: string | null | undefined | object
): SecurityPolicy {
  let parsed: Record<string, unknown> = {};
  if (typeof raw === "string" && raw.trim()) {
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  } else if (raw && typeof raw === "object") {
    parsed = raw as Record<string, unknown>;
  }
  const minLen = Math.min(
    32,
    Math.max(6, Number(parsed.passwordMinLength) || DEFAULT_SECURITY_POLICY.passwordMinLength)
  );
  const mfaMode = VALID_MFA_MODES.has(parsed.mfaMode as MfaMode)
    ? (parsed.mfaMode as MfaMode)
    : DEFAULT_SECURITY_POLICY.mfaMode;
  const mfaRequiredRoles = Array.isArray(parsed.mfaRequiredRoles)
    ? parsed.mfaRequiredRoles.map(String)
    : DEFAULT_SECURITY_POLICY.mfaRequiredRoles;
  return {
    passwordMinLength: minLen,
    requireStrongPassword: Boolean(parsed.requireStrongPassword),
    sessionIdleMinutes: Math.max(0, Number(parsed.sessionIdleMinutes) || 0),
    forcePasswordChangeDays: Math.max(0, Number(parsed.forcePasswordChangeDays) || 0),
    mfaMode,
    mfaRequiredRoles,
    allowSmsMfa: Boolean(parsed.allowSmsMfa),
  };
}

export type PasswordChecks = {
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  matchesConfirm: boolean;
  differsFromCurrent: boolean;
};

export function evaluatePassword(
  password: string,
  confirmPassword: string,
  currentPassword: string,
  policy: SecurityPolicy
): PasswordChecks {
  return {
    minLength: password.length >= policy.passwordMinLength,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    matchesConfirm: password.length > 0 && password === confirmPassword,
    differsFromCurrent: password.length > 0 && password !== currentPassword,
  };
}

/** 0–4 score for UI meter (length, letter, number, mixed case / symbol). */
export function passwordStrengthScore(password: string, policy: SecurityPolicy): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= policy.passwordMinLength) score += 1;
  if (password.length >= Math.max(policy.passwordMinLength + 4, 12)) score += 1;
  if (/[A-Za-z]/.test(password) && /[0-9]/.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}

export function validatePasswordAgainstPolicy(
  password: string,
  policy: SecurityPolicy = DEFAULT_SECURITY_POLICY
): string | null {
  if (!password || password.length < policy.passwordMinLength) {
    return `Password must be at least ${policy.passwordMinLength} characters`;
  }
  if (policy.requireStrongPassword) {
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return "Password must include at least one letter and one number";
    }
  }
  return null;
}
