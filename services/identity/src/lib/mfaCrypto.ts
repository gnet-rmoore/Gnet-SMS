/** AES-256-GCM encryption for MFA secrets at rest. */

import crypto from "node:crypto";

const DEV_MFA_KEY = crypto.createHash("sha256").update("dev-mfa-key").digest();

function getMfaKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (raw) {
    const buf = Buffer.from(raw, raw.match(/^[A-Za-z0-9+/=]+$/) ? "base64" : "utf8");
    if (buf.length >= 32) return buf.subarray(0, 32);
    return crypto.createHash("sha256").update(buf).digest();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("MFA_ENCRYPTION_KEY is required in production");
  }
  return DEV_MFA_KEY;
}

export function encryptMfaSecret(plain: string): string {
  const key = getMfaKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptMfaSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const key = getMfaKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
