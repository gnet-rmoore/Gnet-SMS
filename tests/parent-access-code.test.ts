import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canManageParentAccess,
  generateParentAccessCode,
  hashParentAccessCode,
  isParentLocked,
  makeParentAccessGlobalLookupHash,
  makeParentAccessLookupHash,
  maskParentAccessCode,
  normalizePhone,
  verifyParentAccessCode,
} from "../services/identity/src/domain/parentAccess";
import { accessCodeLoginSchema } from "../services/identity/src/validation/schemas";
import { classifyLoginError } from "../src/lib/loginError";
import { formatParentAccessCodeInput } from "../src/lib/parentAccessCode";

const code = generateParentAccessCode();
assert.match(code, /^\d{6}$/);
assert.equal(maskParentAccessCode("000042"), "••••42");
assert.equal(maskParentAccessCode("42"), "••••42");

const lookup = makeParentAccessLookupHash("school-1", code, 3);
assert.equal(lookup.length, 64);
assert.notEqual(lookup, makeParentAccessLookupHash("school-2", code, 3));
assert.notEqual(lookup, makeParentAccessLookupHash("school-1", code, 4));

const globalLookup = makeParentAccessGlobalLookupHash(code, 3);
const otherCode = code === "123456" ? "654321" : "123456";
assert.equal(globalLookup.length, 64);
assert.equal(globalLookup, makeParentAccessGlobalLookupHash(code, 3));
assert.notEqual(globalLookup, makeParentAccessGlobalLookupHash(code, 4));
assert.notEqual(globalLookup, makeParentAccessGlobalLookupHash(otherCode, 3));

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

assert.deepEqual(accessCodeLoginSchema.parse({ code: "123456", schoolSlug: "ignored" }), {
  code: "123456",
});
assert.equal(accessCodeLoginSchema.safeParse({ code: "12345" }).success, false);

const loginSource = readFileSync(new URL("../src/pages/Login.tsx", import.meta.url), "utf8");
const accessCodeRequestStart = loginSource.indexOf('"/api/auth/parent/access-code/login"');
assert.notEqual(accessCodeRequestStart, -1);
const accessCodeRequest = loginSource.slice(accessCodeRequestStart, accessCodeRequestStart + 220);
assert.match(accessCodeRequest, /\{ code: parentAccessCode \}/);
assert.doesNotMatch(accessCodeRequest, /schoolSlug/);
assert.deepEqual(formatParentAccessCodeInput("12", 2), {
  digits: "12",
  formatted: "12",
  caret: 2,
});
assert.deepEqual(formatParentAccessCodeInput("1234", 4), {
  digits: "1234",
  formatted: "123-4",
  caret: 5,
});
assert.deepEqual(formatParentAccessCodeInput("1234567", 8), {
  digits: "123456",
  formatted: "123-456",
  caret: 7,
});
assert.deepEqual(formatParentAccessCodeInput("12-34-56", 8), {
  digits: "123456",
  formatted: "123-456",
  caret: 7,
});
assert.match(loginSource, /value=\{formatParentAccessCode\(parentAccessCode\)\}/);
assert.match(loginSource, /formatParentAccessCodeInput\(/);
assert.match(loginSource, /placeholder="000-000"/);

const enCatalog = readFileSync(new URL("../src/i18n/catalogs/en.ts", import.meta.url), "utf8");
assert.match(enCatalog, /subtitle: "Use the 6-digit code issued by the school"/);

console.log("parent access unit tests passed");
