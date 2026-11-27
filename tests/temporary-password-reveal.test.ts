import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CAPABILITY_CATALOG as IDENTITY_CAPABILITY_CATALOG,
  DEFAULT_ROLE_CAPABILITIES as IDENTITY_ROLE_CAPABILITIES,
} from "../services/identity/src/lib/capabilities";
import {
  CAPABILITY_CATALOG as SPA_CAPABILITY_CATALOG,
  DEFAULT_ROLE_CAPABILITIES as SPA_ROLE_CAPABILITIES,
} from "../src/lib/capabilities";
import {
  clearTemporaryPasswordFields,
  decryptCredentialSecret,
  temporaryPasswordFields,
} from "../services/identity/src/lib/credentialCrypto";
import { generateTemporaryPassword } from "../services/identity/src/lib/tempPassword";
import {
  isTemporaryPasswordExpired,
  isTemporaryPasswordRevealableRole,
  TEMPORARY_PASSWORD_REVEAL_CAPABILITY,
  TEMPORARY_PASSWORD_REVEAL_ROLES,
} from "../services/identity/src/services/temporaryPasswordService";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

assert.equal(
  TEMPORARY_PASSWORD_REVEAL_CAPABILITY,
  "action.users.reveal_temporary_password"
);
assert.deepEqual([...TEMPORARY_PASSWORD_REVEAL_ROLES], [
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "REGISTRAR",
  "IT_ADMIN",
]);

const stored = temporaryPasswordFields("St@mp123!");
assert.match(stored.temporaryPasswordEncrypted!, /^enc:v1:/);
assert.notEqual(stored.temporaryPasswordEncrypted, "St@mp123!");
assert.equal(decryptCredentialSecret(stored.temporaryPasswordEncrypted), "St@mp123!");
assert.ok(stored.temporaryPasswordIssuedAt instanceof Date);
assert.deepEqual(clearTemporaryPasswordFields(), {
  temporaryPasswordEncrypted: null,
  temporaryPasswordIssuedAt: null,
});

const generatedPassword = generateTemporaryPassword("St");
assert.ok(generatedPassword.length >= 12);
assert.match(generatedPassword, /[A-Z]/);
assert.match(generatedPassword, /[0-9]/);
assert.match(generatedPassword, /[@!#$%^&*\-_]/);
assert.notEqual(generatedPassword, generateTemporaryPassword("St"));

assert.equal(isTemporaryPasswordRevealableRole("STUDENT"), true);
assert.equal(isTemporaryPasswordRevealableRole("TEACHER"), true);
assert.equal(isTemporaryPasswordRevealableRole("PARENT"), true);
assert.equal(isTemporaryPasswordRevealableRole("API_CLIENT"), false);
const now = Date.now();
assert.equal(isTemporaryPasswordExpired(new Date(now - 31 * 24 * 60 * 60 * 1000), now), true);
assert.equal(isTemporaryPasswordExpired(new Date(now - 60_000), now), false);
assert.equal(isTemporaryPasswordExpired(null, now), true);

for (const catalog of [IDENTITY_CAPABILITY_CATALOG, SPA_CAPABILITY_CATALOG]) {
  assert.ok(catalog.some((capability) => capability.key === TEMPORARY_PASSWORD_REVEAL_CAPABILITY));
}
for (const role of TEMPORARY_PASSWORD_REVEAL_ROLES) {
  assert.ok(IDENTITY_ROLE_CAPABILITIES[role]?.includes(TEMPORARY_PASSWORD_REVEAL_CAPABILITY), role);
  assert.ok(SPA_ROLE_CAPABILITIES[role]?.includes(TEMPORARY_PASSWORD_REVEAL_CAPABILITY), role);
}

const schema = read("../services/identity/prisma/schema.prisma");
assert.match(schema, /temporaryPasswordEncrypted\s+String\?/);
assert.match(schema, /temporaryPasswordIssuedAt\s+DateTime\?/);

const migration = read(
  "../services/identity/prisma/migrations/20261126140000_add_temporary_password_reveal/migration.sql"
);
assert.match(migration, /ADD COLUMN IF NOT EXISTS "temporaryPasswordEncrypted"/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS "temporaryPasswordIssuedAt"/);

const userServiceSource = read("../services/identity/src/services/userService.ts");
assert.match(userServiceSource, /temporaryPasswordFields\(temporaryPassword\)/);
assert.match(userServiceSource, /temporaryPasswordFields\(tempMustChange \? temporaryPassword : null\)/);
assert.match(userServiceSource, /temporaryPasswordFields\(tempPassword\)/);
assert.match(userServiceSource, /clearTemporaryPasswordFields\(\)/);
assert.match(userServiceSource, /if \(updateData\.mustChangePassword === false\)/);

const parentAccessServiceSource = read(
  "../services/identity/src/services/parentAccessService.ts"
);
assert.match(parentAccessServiceSource, /temporaryPasswordFields\(password\)/);
assert.match(parentAccessServiceSource, /mustChangePassword: Boolean\(parent\.mustChangePassword\)/);
assert.match(
  parentAccessServiceSource,
  /temporaryPasswordIssuedAt: parent\.temporaryPasswordIssuedAt\?\.toISOString\(\)/
);

const tempPasswordHelperSource = read("../services/identity/src/lib/tempPassword.ts");
assert.match(tempPasswordHelperSource, /crypto\.randomBytes\(20\)/);
assert.doesNotMatch(tempPasswordHelperSource, /Math\.random/);

const domainBulkImportSource = read("../services/identity/src/domain/bulkImport.ts");
assert.match(domainBulkImportSource, /generateTemporaryPassword\(prefix\)/);
assert.doesNotMatch(
  domainBulkImportSource.slice(
    domainBulkImportSource.indexOf("export function generateTempPassword"),
    domainBulkImportSource.indexOf("const EMAIL_PATTERN")
  ),
  /Math\.random/
);

const superAdminSource = read("../services/identity/src/services/superAdminService.ts");
assert.match(superAdminSource, /mustChange \? temporaryPasswordFields\(password\) : clearTemporaryPasswordFields\(\)/);

const emailAuthSource = read("../services/identity/src/services/emailAuthService.ts");
assert.match(emailAuthSource, /mustChangePassword: false,\s*\.\.\.clearTemporaryPasswordFields\(\)/);

const bulkImportSource = read("../services/identity/src/services/bulkImportService.ts");
assert.equal(
  (bulkImportSource.match(/\.\.\.temporaryPasswordFields\(row\.temporaryPassword\)/g) || []).length,
  2
);

const temporaryPasswordServiceSource = read(
  "../services/identity/src/services/temporaryPasswordService.ts"
);
assert.match(temporaryPasswordServiceSource, /TEMPORARY_PASSWORD_TTL_MS/);
assert.match(temporaryPasswordServiceSource, /decryptCredentialSecret\(user\.temporaryPasswordEncrypted\)/);
assert.match(temporaryPasswordServiceSource, /clearTemporaryPasswordFields\(\)/);
assert.match(temporaryPasswordServiceSource, /role === "STUDENT"/);
assert.match(temporaryPasswordServiceSource, /role === "PARENT"/);
assert.match(temporaryPasswordServiceSource, /children: \{ some: \{ student: \{ schoolId \} \} \}/);
assert.match(temporaryPasswordServiceSource, /!user\.mustChangePassword/);

const routes = read("../services/identity/src/routes/userRoutes.ts");
assert.match(routes, /\/api\/users\/:userId\/temporary-password\/reveal/);
assert.match(routes, /requireResourceTenant\(resourceLoaders\.user\)/);
assert.match(routes, /requireRoles\(\[\.\.\.TEMPORARY_PASSWORD_REVEAL_ROLES, "SUPER_ADMIN"\]\)/);
assert.match(
  routes,
  /requireCapability\(TEMPORARY_PASSWORD_REVEAL_CAPABILITY, \[\.\.\.TEMPORARY_PASSWORD_REVEAL_ROLES\]\)/
);

const controller = read("../services/identity/src/controllers/userController.ts");
const revealMethodStart = controller.indexOf("async revealTemporaryPassword");
const revealMethodEnd = controller.indexOf("async listSchoolUsers", revealMethodStart);
const revealMethod = controller.slice(revealMethodStart, revealMethodEnd);
assert.match(revealMethod, /user_temporary_password_revealed/);
assert.match(revealMethod, /user_temporary_password_reveal_failed/);
assert.match(revealMethod, /dataSensitivity: "SECRET"/);
assert.match(revealMethod, /auditFailed = true/);
assert.match(revealMethod, /if \(auditFailed\)/);
assert.doesNotMatch(revealMethod, /temporaryPassword:/);

const modal = read("../src/components/TemporaryPasswordRevealModal.tsx");
assert.match(modal, /\/api\/users\/\$\{target\.id\}\/temporary-password\/reveal/);
assert.match(modal, /roleAccessApi\.refreshSession\(\)/);
assert.match(modal, /navigator\.clipboard\.writeText\(revealed\.temporaryPassword\)/);
assert.match(modal, /No active temporary password is available/);

for (const file of [
  "../src/features/students/Page.tsx",
  "../src/pages/School/StaffManagement.tsx",
]) {
  const source = read(file);
  assert.match(source, /TemporaryPasswordRevealModal/);
  assert.match(source, /action\.users\.reveal_temporary_password/);
  assert.match(source, /View temporary password/);
}

const parentAccessPageSource = read("../src/features/parent-access/Page.tsx");
assert.match(parentAccessPageSource, /TemporaryPasswordRevealModal/);
assert.match(parentAccessPageSource, /action\.users\.reveal_temporary_password/);
assert.match(parentAccessPageSource, /viewTemporaryPassword/);
assert.match(parentAccessPageSource, /parent\.mustChangePassword/);
assert.match(parentAccessPageSource, /passwordChanged/);

console.log("temporary password reveal tests passed");
