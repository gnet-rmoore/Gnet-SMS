import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canManageParentAccess,
  generateParentAccessCode,
  hashParentAccessCode,
  isParentAccessCodeExpired,
  isParentLocked,
  makeParentAccessGlobalLookupHash,
  makeParentAccessLookupHash,
  maskParentAccessCode,
  normalizePhone,
  getParentPacSecret,
  getParentPacSecretVersion,
  parentAccessExpiry,
  PARENT_ACCESS_MAX_LIFETIME_WEEKS,
  PARENT_ACCESS_UNUSED_EXPIRY_DAYS,
  verifyParentAccessCode,
} from "../services/identity/src/domain/parentAccess";
import { decryptCredentialSecret, encryptCredentialSecret } from "../services/identity/src/lib/credentialCrypto";
import { accessCodeLoginSchema } from "../services/identity/src/validation/schemas";
import { classifyLoginError } from "../src/lib/loginError";
import { formatParentAccessCodeInput } from "../src/lib/parentAccessCode";
import { getPostLoginPath, requiresPasswordChange } from "../src/lib/postLoginPath";

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

assert.equal(PARENT_ACCESS_UNUSED_EXPIRY_DAYS, 10);
assert.equal(PARENT_ACCESS_MAX_LIFETIME_WEEKS, 6);
const issuedAt = new Date("2026-01-01T00:00:00.000Z");
const deliveredAt = new Date("2026-01-02T00:00:00.000Z");
const expiry = parentAccessExpiry({ issuedAt, deliveredAt });
assert.equal(expiry.unusedExpiresAt.toISOString(), "2026-01-12T00:00:00.000Z");
assert.equal(expiry.absoluteExpiresAt.toISOString(), "2026-02-12T00:00:00.000Z");
assert.equal(expiry.expiresAt.toISOString(), "2026-01-12T00:00:00.000Z");
assert.equal(
  isParentAccessCodeExpired({ issuedAt, deliveredAt }, new Date("2026-01-11T23:59:59.999Z")),
  false
);
assert.equal(
  isParentAccessCodeExpired({ issuedAt, deliveredAt }, new Date("2026-01-12T00:00:00.000Z")),
  true
);
assert.equal(
  isParentAccessCodeExpired({ issuedAt, deliveredAt: null }, new Date("2026-01-11T00:00:00.000Z")),
  true
);
const usedAt = new Date("2026-01-09T00:00:00.000Z");
assert.equal(
  parentAccessExpiry({ issuedAt, deliveredAt, usedAt }).expiresAt.toISOString(),
  "2026-02-12T00:00:00.000Z"
);
assert.equal(
  isParentAccessCodeExpired(
    { issuedAt, deliveredAt, usedAt },
    new Date("2026-02-11T23:59:59.999Z")
  ),
  false
);
assert.equal(
  isParentAccessCodeExpired(
    { issuedAt, deliveredAt, usedAt },
    new Date("2026-02-12T00:00:00.000Z")
  ),
  true
);
assert.equal(
  parentAccessExpiry({ issuedAt, deliveredAt: new Date("2026-02-05T00:00:00.000Z") }).expiresAt.toISOString(),
  "2026-02-12T00:00:00.000Z"
);

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

const pendingPasswordChangeUser = {
  id: "parent-1",
  email: "parent@example.com",
  name: "Parent",
  role: "PARENT",
  mustChangePassword: true,
};
const school = { slug: "demo-school" };
assert.equal(requiresPasswordChange({ ...pendingPasswordChangeUser, authMethod: "PASSWORD" }), true);
assert.equal(requiresPasswordChange({ ...pendingPasswordChangeUser, authMethod: "ACCESS_CODE" }), false);
assert.equal(requiresPasswordChange({ ...pendingPasswordChangeUser, authMethod: "PHONE_OTP" }), false);
assert.equal(requiresPasswordChange(pendingPasswordChangeUser), true);
assert.equal(
  getPostLoginPath({ ...pendingPasswordChangeUser, authMethod: "PASSWORD" }, school),
  "/change-password-required"
);
assert.equal(
  getPostLoginPath({ ...pendingPasswordChangeUser, authMethod: "ACCESS_CODE" }, school),
  "/demo-school/dashboard"
);
assert.equal(
  getPostLoginPath({ ...pendingPasswordChangeUser, authMethod: "PHONE_OTP" }, school),
  "/demo-school/dashboard"
);

const authServiceSource = readFileSync(
  new URL("../services/identity/src/services/authService.ts", import.meta.url),
  "utf8"
);
const completeSchoolLoginSource = authServiceSource.slice(
  authServiceSource.indexOf("async completeSchoolLogin"),
  authServiceSource.indexOf("async parentAccessCodeLogin")
);
assert.match(completeSchoolLoginSource, /const authMethod = input\.authMethod \|\| "PASSWORD";/);
assert.equal((completeSchoolLoginSource.match(/\bauthMethod,/g) || []).length >= 2, true);

const authControllerSource = readFileSync(
  new URL("../services/identity/src/controllers/authController.ts", import.meta.url),
  "utf8"
);
assert.match(authControllerSource, /sessionForUserId\(req\.user\.id, req\.user\.authMethod\)/);

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
assert.match(enCatalog, /parentAccess: "Parents"/);
assert.match(enCatalog, /revealCode: "Reveal code"/);

const parentAccessRoutes = readFileSync(
  new URL("../services/identity/src/routes/parentAccessRoutes.ts", import.meta.url),
  "utf8"
);
assert.match(parentAccessRoutes, /\/api\/users\/:userId\/parent-password\/reset/);
assert.match(parentAccessRoutes, /requireCapability\(ADMIN_CAPABILITY, ADMIN_ROLES\)/);

const parentAccessController = readFileSync(
  new URL("../services/identity/src/controllers/parentAccessController.ts", import.meta.url),
  "utf8"
);
assert.match(parentAccessController, /assertCanResetParentPassword\(/);
assert.match(parentAccessController, /parent_password_reset/);

const parentAccessPage = readFileSync(
  new URL("../src/features/parent-access/Page.tsx", import.meta.url),
  "utf8"
);
assert.match(parentAccessPage, /DetailDrawerShell/);
assert.match(parentAccessPage, /parent-password\/reset/);
assert.match(parentAccessPage, /canResetParentPassword\(/);

const clientPasswordPolicy = readFileSync(
  new URL("../src/lib/passwordResetPolicy.ts", import.meta.url),
  "utf8"
);
assert.match(clientPasswordPolicy, /export function canResetParentPassword\(/);
assert.match(clientPasswordPolicy, /const PARENT_RESET_ROLES = new Set\(\["SCHOOL_ADMIN", "IT_ADMIN"\]\)/);

assert.match(parentAccessRoutes, /\/api\/users\/:userId\/parent-access-code\/reveal/);
assert.match(parentAccessController, /parent_access_code_revealed/);
assert.match(parentAccessPage, /parent-access-code\/reveal/);
assert.match(parentAccessPage, /codeEmailed/);
assert.match(parentAccessPage, /codeRevealUnavailable/);
assert.match(parentAccessPage, /roleAccessApi\.refreshSession\(\)/);
assert.match(parentAccessPage, /load\(\{ clearError: false \}\)/);
assert.match(parentAccessPage, /revealCode/);
assert.match(parentAccessPage, /setSelectedParentId\(userId\)/);
assert.match(parentAccessPage, /p\("expiresAt"\)/);
assert.match(parentAccessPage, /p\("codeExpired"\)/);

const parentAccessService = readFileSync(
  new URL("../services/identity/src/services/parentAccessService.ts", import.meta.url),
  "utf8"
);
assert.match(parentAccessService, /encryptCredentialSecret\(code\)/);
assert.match(parentAccessService, /revealParentAccessCode\(/);
assert.match(parentAccessService, /decryptCredentialSecret\(row\.codeEncrypted\)/);
assert.match(parentAccessService, /parentAccessCode/);
assert.match(parentAccessService, /sendParentAccessCodeEmail\(user, code, schoolId\)/);
assert.match(parentAccessService, /where: \{ id: schoolId \}/);
assert.match(parentAccessService, /sensitive: true/);
assert.match(parentAccessService, /isParentAccessCodeExpired\(row\)/);
assert.match(parentAccessService, /markParentAccessCodeUsed\(/);
assert.match(parentAccessService, /expiresAt: expiry\.expiresAt/);
assert.match(parentAccessService, /usedAt: null/);
assert.match(authServiceSource, /parentAccessService\.markParentAccessCodeUsed\(/);

const encryptedCode = encryptCredentialSecret("123456");
assert.notEqual(encryptedCode, "123456");
assert.equal(decryptCredentialSecret(encryptedCode), "123456");

const emailCatalog = readFileSync(
  new URL("../services/identity/src/i18n/emailCatalogs.ts", import.meta.url),
  "utf8"
);
assert.match(emailCatalog, /parentAccessCode:/);
assert.match(emailCatalog, /expires in 10 days/);
assert.match(emailCatalog, /no later than 6 weeks after issue/);

const originalNodeEnv = process.env.NODE_ENV;
const originalPacSecret = process.env.PARENT_PAC_SECRET;
const originalPacVersion = process.env.PARENT_PAC_SECRET_VERSION;
try {
  delete process.env.PARENT_PAC_SECRET;
  process.env.NODE_ENV = "development";
  assert.equal(getParentPacSecret(), "dev-parent-pac-secret");
  process.env.NODE_ENV = "production";
  assert.throws(() => getParentPacSecret(), /PARENT_PAC_SECRET is required in production/);
  process.env.PARENT_PAC_SECRET = "   ";
  assert.throws(() => getParentPacSecret(), /PARENT_PAC_SECRET is required in production/);
  process.env.PARENT_PAC_SECRET = "configured-parent-pac-secret";
  assert.equal(getParentPacSecret(), "configured-parent-pac-secret");
  process.env.PARENT_PAC_SECRET_VERSION = "7";
  assert.equal(getParentPacSecretVersion(), 7);
} finally {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalPacSecret === undefined) delete process.env.PARENT_PAC_SECRET;
  else process.env.PARENT_PAC_SECRET = originalPacSecret;
  if (originalPacVersion === undefined) delete process.env.PARENT_PAC_SECRET_VERSION;
  else process.env.PARENT_PAC_SECRET_VERSION = originalPacVersion;
}

const readConfig = (file: string) =>
  readFileSync(new URL(file, import.meta.url), "utf8");
for (const file of [
  "../docker-compose.yml",
  "../docker-compose.dev.yml",
  "../docker-compose.prod.yml",
  "../deploy/docker-compose.yml",
  "../deploy/docker-compose.prod.yml",
]) {
  assert.match(readConfig(file), /PARENT_PAC_SECRET:/, `${file} passes PARENT_PAC_SECRET to Identity`);
}
assert.match(
  readConfig("../docker-compose.prod.yml"),
  /PARENT_PAC_SECRET: \$\{PARENT_PAC_SECRET:\?set in \.env\}/,
  "production compose requires PARENT_PAC_SECRET"
);
assert.match(
  readConfig("../deploy/docker-compose.prod.yml"),
  /PARENT_PAC_SECRET: \$\{PARENT_PAC_SECRET:\?set in \.env\}/,
  "deploy production compose requires PARENT_PAC_SECRET"
);
assert.match(
  readConfig("../.env.example"),
  /PARENT_PAC_SECRET=/,
  "root env template documents PARENT_PAC_SECRET"
);
assert.match(
  readConfig("../deploy/.env.example"),
  /PARENT_PAC_SECRET=/,
  "deploy env template documents PARENT_PAC_SECRET"
);

console.log("parent access unit tests passed");
