/**
 * AES-256-GCM encryption for SystemCredential secrets at rest.
 *
 * Stored format: `enc:v1:<base64(iv | authTag | ciphertext)>`.
 * Legacy rows written before encryption are plaintext and are returned as-is
 * by `decryptCredentialSecret` so reads remain backward compatible.
 */

import crypto from "node:crypto";

export const CREDENTIAL_ENC_PREFIX = "enc:v1:";

const DEV_KEY = crypto.createHash("sha256").update("dev-credential-key").digest();

function getCredentialKey(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.MFA_ENCRYPTION_KEY;
  if (raw) {
    const buf = Buffer.from(raw, /^[A-Za-z0-9+/=]+$/.test(raw) ? "base64" : "utf8");
    if (buf.length >= 32) return buf.subarray(0, 32);
    return crypto.createHash("sha256").update(buf).digest();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY (or MFA_ENCRYPTION_KEY) is required in production"
    );
  }
  return DEV_KEY;
}

export function isEncryptedCredentialSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(CREDENTIAL_ENC_PREFIX);
}

export function encryptCredentialSecret(plain: string): string {
  const key = getCredentialKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return CREDENTIAL_ENC_PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Decrypts encrypted values; passes legacy plaintext through unchanged. */
export function decryptCredentialSecret(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined) return null;
  const value = String(stored);
  if (!isEncryptedCredentialSecret(value)) return value;
  const buf = Buffer.from(value.slice(CREDENTIAL_ENC_PREFIX.length), "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const key = getCredentialKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
