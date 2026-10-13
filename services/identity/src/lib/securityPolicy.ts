/** Default + parse helpers for Identity.School.securityPolicy JSON. */

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
  let parsed: any = {};
  if (typeof raw === "string" && raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
  } else if (raw && typeof raw === "object") {
    parsed = raw;
  }
  const minLen = Math.min(
    32,
    Math.max(6, Number(parsed.passwordMinLength) || DEFAULT_SECURITY_POLICY.passwordMinLength)
  );
  const mfaMode = VALID_MFA_MODES.has(parsed.mfaMode) ? parsed.mfaMode : DEFAULT_SECURITY_POLICY.mfaMode;
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

export function serializeSecurityPolicy(
  policy: Partial<SecurityPolicy> | null | undefined
): string {
  const merged = { ...DEFAULT_SECURITY_POLICY, ...(policy || {}) };
  return JSON.stringify({
    ...merged,
    passwordMinLength: Math.min(
      32,
      Math.max(6, Number(merged.passwordMinLength) || DEFAULT_SECURITY_POLICY.passwordMinLength)
    ),
    mfaMode: VALID_MFA_MODES.has(merged.mfaMode) ? merged.mfaMode : "OFF",
    mfaRequiredRoles: Array.isArray(merged.mfaRequiredRoles)
      ? merged.mfaRequiredRoles.map(String)
      : [],
    allowSmsMfa: Boolean(merged.allowSmsMfa),
  });
}

/** Returns an error message if password fails policy; otherwise null. */
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
