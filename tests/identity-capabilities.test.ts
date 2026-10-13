/**
 * Identity capability merge / lock rules (pure).
 * Run: npm run test:identity-capabilities
 */
import {
  LOCKED_KEYS_FOR_SCHOOL_ADMIN,
  mergeCapabilities,
  isKnownCapability,
  DEFAULT_ROLE_CAPABILITIES,
} from "../services/identity/src/lib/capabilities.ts";
import { createAssert } from "./helpers/assert.ts";

const { assert, summary } = createAssert();

console.log("=========================================");
console.log(" IDENTITY CAPABILITIES");
console.log("=========================================\n");

assert(isKnownCapability("nav.dashboard"), "nav.dashboard is known");
assert(isKnownCapability("action.roles.assign"), "action.roles.assign is known");

const teacherDefaults = DEFAULT_ROLE_CAPABILITIES.TEACHER || [];
assert(teacherDefaults.length > 0, "TEACHER has default capabilities");

const key = teacherDefaults[0];
assert(
  mergeCapabilities("TEACHER", [{ capabilityKey: key, allowed: true }]).includes(key),
  "allow override keeps key"
);
assert(
  !mergeCapabilities("TEACHER", [{ capabilityKey: key, allowed: false }]).includes(key),
  "revoke override removes key"
);

assert(LOCKED_KEYS_FOR_SCHOOL_ADMIN.includes("action.roles.assign"), "roles.assign locked");
assert(
  mergeCapabilities("SCHOOL_ADMIN", [
    { capabilityKey: "action.roles.assign", allowed: false },
  ]).includes("action.roles.assign"),
  "SCHOOL_ADMIN cannot revoke locked action.roles.assign"
);

const adminDefaults = DEFAULT_ROLE_CAPABILITIES.SCHOOL_ADMIN || [];
assert(adminDefaults.includes("nav.schedules"), "admin has class schedules");
assert(adminDefaults.includes("nav.transcripts"), "admin has transcripts");
assert(adminDefaults.includes("nav.library"), "admin has specialty library");
assert(adminDefaults.includes("nav.notifications"), "admin has notifications");
assert(adminDefaults.includes("nav.student-records"), "admin has student records");
assert(adminDefaults.includes("action.schedules.manage"), "admin can manage schedules");
assert(adminDefaults.includes("action.bulk_import.roster"), "admin can bulk import");
assert(adminDefaults.includes("action.fees.manage"), "admin can manage fees");
assert(!adminDefaults.includes("nav.children"), "admin does not get parent-only children nav");

const registrarDefaults = DEFAULT_ROLE_CAPABILITIES.REGISTRAR || [];
assert(registrarDefaults.includes("nav.settings"), "registrar can open settings for receipt templates");
assert(registrarDefaults.includes("action.settings.templates"), "registrar can manage receipt templates");

const accountantDefaults = DEFAULT_ROLE_CAPABILITIES.ACCOUNTANT || [];
assert(accountantDefaults.includes("nav.settings"), "accountant can open settings for receipt templates");
assert(accountantDefaults.includes("action.settings.templates"), "accountant can manage receipt templates");

assert(isKnownCapability("action.schedules.manage"), "schedules.manage is known");
assert(isKnownCapability("nav.student-records"), "student-records is known");

summary("identity-capabilities");
