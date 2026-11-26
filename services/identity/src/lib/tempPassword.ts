import crypto from "node:crypto";

const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_";
const DIGITS = "23456789";
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateTemporaryPassword(prefix = "St"): string {
  const bytes = crypto.randomBytes(20);
  const suffix = Array.from(bytes, (byte) => PASSWORD_CHARS[byte % PASSWORD_CHARS.length])
    .join("")
    .slice(0, 18);
  const digit = DIGITS[bytes[0] % DIGITS.length];
  const letter = LETTERS[bytes[1] % LETTERS.length];
  return `${prefix}@${letter}${digit}${suffix.slice(2)}`;
}
