/** RFC 6238 TOTP helpers (no external deps). */

import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateBase32Secret(byteLength = 20): string {
  const bytes = crypto.randomBytes(byteLength);
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function decodeBase32(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/g, "").replace(/\s/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function hotp(secretBase32: string, counter: number): string {
  const key = decodeBase32(secretBase32);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

export function totp(secretBase32: string, window = 0, stepSec = 30): string {
  const counter = Math.floor(Date.now() / 1000 / stepSec) + window;
  return hotp(secretBase32, counter);
}

export function verifyTotp(
  secretBase32: string,
  token: string,
  window = 1,
  stepSec = 30
): boolean {
  const normalized = String(token || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  for (let w = -window; w <= window; w++) {
    if (totp(secretBase32, w, stepSec) === normalized) return true;
  }
  return false;
}

export function otpauthUrl(secret: string, label: string, issuer = "Gnet SMS"): string {
  const enc = encodeURIComponent;
  return `otpauth://totp/${enc(label)}?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
