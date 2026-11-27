import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export const PARENT_ACCESS_ROLES = ["SCHOOL_ADMIN", "REGISTRAR", "PRINCIPAL", "IT_ADMIN"] as const;

export const PARENT_ACCESS_UNUSED_EXPIRY_DAYS = 10;
export const PARENT_ACCESS_MAX_LIFETIME_WEEKS = 6;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const PARENT_SMS_PURPOSES = {
  ENROLL: "ENROLL",
  LOGIN: "LOGIN",
  PARENT_PHONE_VERIFY: "PARENT_PHONE_VERIFY",
  PARENT_PHONE_LOGIN: "PARENT_PHONE_LOGIN",
} as const;

export type ParentAccessActor = {
  role?: string | null;
  schoolId?: string | null;
};

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getParentPacSecret(): string {
  const raw = String(process.env.PARENT_PAC_SECRET || "").trim();
  if (raw) return raw;
  if (process.env.NODE_ENV === "production") {
    throw Object.assign(new Error("PARENT_PAC_SECRET is required in production"), {
      code: "PARENT_ACCESS_CONFIG_MISSING",
      status: 500,
    });
  }
  return "dev-parent-pac-secret";
}

export function getParentPacSecretVersion(): number {
  return positiveInt(process.env.PARENT_PAC_SECRET_VERSION, 1);
}

export function isParentPhoneLoginEnabled(): boolean {
  return String(process.env.PARENT_PHONE_LOGIN_ENABLED || "").toLowerCase() === "true";
}

export function parentAccessAttemptLimit(): number {
  return positiveInt(process.env.PARENT_ACCESS_ATTEMPT_LIMIT, 5);
}

export function parentAccessLockMinutes(): number {
  return positiveInt(process.env.PARENT_ACCESS_LOCK_MINUTES, 15);
}

export function parentPhoneOtpTtlMinutes(): number {
  return positiveInt(process.env.PARENT_PHONE_OTP_TTL_MINUTES, 10);
}

export function parentPhoneResendSeconds(): number {
  return positiveInt(process.env.PARENT_PHONE_OTP_RESEND_SECONDS, 60);
}

export function parentPhoneMaxSends(): number {
  return positiveInt(process.env.PARENT_PHONE_OTP_MAX_SENDS, 3);
}

export function generateParentAccessCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function makeParentAccessLookupHash(
  schoolId: string,
  code: string,
  secretVersion = getParentPacSecretVersion()
): string {
  return crypto
    .createHmac("sha256", getParentPacSecret())
    .update(`${secretVersion}:${schoolId}:${code}`)
    .digest("hex");
}

export function makeParentAccessGlobalLookupHash(
  code: string,
  secretVersion = getParentPacSecretVersion()
): string {
  return crypto
    .createHmac("sha256", getParentPacSecret())
    .update(`global:${secretVersion}:${code}`)
    .digest("hex");
}

export function hashParentAccessCode(code: string): string {
  return bcrypt.hashSync(code, 10);
}

export function verifyParentAccessCode(code: string, hash: string): boolean {
  return bcrypt.compareSync(code, hash);
}

export function maskParentAccessCode(code: string): string {
  const normalized = String(code || "").replace(/\D/g, "");
  if (normalized.length < 2) return "••••••";
  return `••••${normalized.slice(-2)}`;
}

export function maskPhone(phoneE164: string): string {
  const digits = String(phoneE164 || "").replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `••••${digits.slice(-4)}`;
}

export function normalizePhone(input: string, defaultCountryCode?: string | null): string | null {
  const raw = String(input || "").trim().replace(/[\s().-]/g, "");
  if (!raw) return null;
  let digits: string;
  if (raw.startsWith("+")) {
    digits = raw.replace(/\D/g, "");
  } else {
    const country = String(defaultCountryCode ?? process.env.DEFAULT_COUNTRY_CODE ?? "").replace(/\D/g, "");
    if (!country) return null;
    digits = `${country}${raw.replace(/\D/g, "")}`;
  }
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `+${digits}`;
}

export function canManageParentAccess(actor: ParentAccessActor, targetSchoolId: string): boolean {
  const role = String(actor.role || "");
  if (!(PARENT_ACCESS_ROLES as readonly string[]).includes(role)) return false;
  if (!targetSchoolId) return false;
  return actor.schoolId === targetSchoolId;
}

export function parentLockUntil(failedCount: number): Date | null {
  if (failedCount < parentAccessAttemptLimit()) return null;
  return new Date(Date.now() + parentAccessLockMinutes() * 60_000);
}

export function isParentLocked(lockedUntil: Date | null | undefined): boolean {
  return Boolean(lockedUntil && lockedUntil.getTime() > Date.now());
}

export type ParentAccessExpiryRow = {
  issuedAt: Date;
  deliveredAt?: Date | null;
  usedAt?: Date | null;
};

export type ParentAccessExpiry = {
  unusedExpiresAt: Date;
  absoluteExpiresAt: Date;
  expiresAt: Date;
  expired: boolean;
};

export function parentAccessExpiry(
  row: ParentAccessExpiryRow,
  now: Date = new Date()
): ParentAccessExpiry {
  const issuedAt = row.issuedAt instanceof Date ? row.issuedAt : new Date(row.issuedAt);
  const deliveredAt = row.deliveredAt
    ? row.deliveredAt instanceof Date
      ? row.deliveredAt
      : new Date(row.deliveredAt)
    : null;
  const unusedExpiresAt = new Date(
    (deliveredAt ?? issuedAt).getTime() + PARENT_ACCESS_UNUSED_EXPIRY_DAYS * DAY_IN_MS
  );
  const absoluteExpiresAt = new Date(
    issuedAt.getTime() + PARENT_ACCESS_MAX_LIFETIME_WEEKS * 7 * DAY_IN_MS
  );
  const expiresAt = row.usedAt
    ? absoluteExpiresAt
    : new Date(Math.min(unusedExpiresAt.getTime(), absoluteExpiresAt.getTime()));
  return {
    unusedExpiresAt,
    absoluteExpiresAt,
    expiresAt,
    expired: now.getTime() >= expiresAt.getTime(),
  };
}

export function isParentAccessCodeExpired(
  row: ParentAccessExpiryRow,
  now: Date = new Date()
): boolean {
  return parentAccessExpiry(row, now).expired;
}
