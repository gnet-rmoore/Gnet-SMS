import assert from "node:assert/strict";
import {
  canManageParentAccess,
  generateParentAccessCode,
  hashParentAccessCode,
  isParentLocked,
  makeParentAccessLookupHash,
  maskParentAccessCode,
  normalizePhone,
  verifyParentAccessCode,
} from "../services/identity/src/domain/parentAccess";
import { classifyLoginError } from "../src/lib/loginError";

const code = generateParentAccessCode();
assert.match(code, /^\d{6}$/);
assert.equal(maskParentAccessCode("000042"), "••••42");
assert.equal(maskParentAccessCode("42"), "••••42");

const lookup = makeParentAccessLookupHash("school-1", code, 3);
assert.equal(lookup.length, 64);
assert.notEqual(lookup, makeParentAccessLookupHash("school-2", code, 3));
assert.notEqual(lookup, makeParentAccessLookupHash("school-1", code, 4));

const hash = hashParentAccessCode(code);
assert.equal(verifyParentAccessCode(code, hash), true);
assert.equal(verifyParentAccessCode("000000", hash), false);

assert.equal(normalizePhone("+1 (555) 123-4567"), "+15551234567");
assert.equal(normalizePhone("+15551234567", ""), "+15551234567");
assert.equal(normalizePhone("5551234567", "+1"), "+15551234567");
assert.equal(normalizePhone("123", "+1"), null);
assert.equal(normalizePhone("+0123456789"), null);

assert.equal(
  canManageParentAccess({ role: "SCHOOL_ADMIN", schoolId: "s1" }, "s1"),
  true
);
assert.equal(
  canManageParentAccess({ role: "SCHOOL_ADMIN", schoolId: "s1" }, "s2"),
  false
);
assert.equal(canManageParentAccess({ role: "TEACHER", schoolId: "s1" }, "s1"), false);
assert.equal(canManageParentAccess({ role: "REGISTRAR" }, "s1"), false);
assert.equal(canManageParentAccess({ role: "REGISTRAR", schoolId: "s1" }, "s1"), true);

assert.equal(isParentLocked(null), false);
assert.equal(isParentLocked(new Date(Date.now() + 60_000)), true);
assert.equal(isParentLocked(new Date(Date.now() - 60_000)), false);

assert.equal(
  classifyLoginError({ status: 401, code: "INVALID_CREDENTIALS", mode: "parent-code" }).case,
  "parentCode"
);
assert.equal(
  classifyLoginError({ status: 401, code: "INVALID_CREDENTIALS", mode: "parent-phone" }).case,
  "parentPhone"
);
assert.equal(
  classifyLoginError({ status: 403, code: "PARENT_PHONE_LOGIN_NOT_ALLOWED" }).case,
  "parentPhoneUnavailable"
);
assert.equal(
  classifyLoginError({ status: 401, code: "INVALID_CREDENTIALS", mode: "password" }).case,
  "invalid"
);

console.log("parent access unit tests passed");
