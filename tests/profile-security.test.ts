/**
 * Profile security tab — password policy helpers + self-change currentPassword rule.
 */
import assert from "node:assert/strict";
import {
  evaluatePassword,
  parseSecurityPolicy,
  passwordStrengthScore,
  validatePasswordAgainstPolicy,
} from "../src/lib/securityPolicy";

const policy = parseSecurityPolicy({
  passwordMinLength: 10,
  requireStrongPassword: true,
  sessionIdleMinutes: 30,
});
assert.equal(policy.passwordMinLength, 10);
assert.equal(policy.requireStrongPassword, true);
assert.equal(policy.sessionIdleMinutes, 30);

assert.notEqual(validatePasswordAgainstPolicy("short", policy), null);
assert.equal(validatePasswordAgainstPolicy("longenough1", policy), null);
assert.notEqual(validatePasswordAgainstPolicy("longenough", policy), null);

const checks = evaluatePassword("longenough1", "longenough1", "oldpass", policy);
assert.equal(checks.minLength, true);
assert.equal(checks.hasLetter, true);
assert.equal(checks.hasNumber, true);
assert.equal(checks.matchesConfirm, true);
assert.equal(checks.differsFromCurrent, true);

const same = evaluatePassword("oldpass12", "oldpass12", "oldpass12", policy);
assert.equal(same.differsFromCurrent, false);

assert.equal(passwordStrengthScore("", policy), 0);
assert.ok(passwordStrengthScore("longenough1", policy) >= 2);

console.log("profile-security.test.ts: ok");
