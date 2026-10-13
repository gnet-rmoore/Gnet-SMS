/**
 * Role change policy tests (Identity).
 * Run: npx tsx tests/role-access.test.ts
 */
import {
  assertSchoolAdminRoleChange,
  isSchoolAssignableRole,
  SCHOOL_ASSIGNABLE_ROLES,
} from "../services/identity/src/lib/roleChange.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

console.log("=========================================");
console.log(" ROLE ACCESS TESTS");
console.log("=========================================\n");

assert(isSchoolAssignableRole("TEACHER") === true, "TEACHER assignable");
assert(isSchoolAssignableRole("SUPER_ADMIN") === false, "SUPER_ADMIN not assignable");
assert(SCHOOL_ASSIGNABLE_ROLES.includes("STUDENT"), "STUDENT in assignable list");

const admin = { id: "a1", role: "SCHOOL_ADMIN", schoolId: "s1" };
const teacher = { id: "t1", role: "TEACHER", schoolId: "s1" };

let r = assertSchoolAdminRoleChange({
  actor: admin,
  target: teacher,
  nextRole: "REGISTRAR",
  schoolAdminCount: 2,
});
assert(r.ok === true && r.ok && r.toRole === "REGISTRAR", "admin can promote teacher → registrar");

r = assertSchoolAdminRoleChange({
  actor: { id: "t1", role: "TEACHER", schoolId: "s1" },
  target: teacher,
  nextRole: "SCHOOL_ADMIN",
  schoolAdminCount: 1,
});
assert(r.ok === false && !r.ok && r.status === 403, "teacher cannot change roles");

r = assertSchoolAdminRoleChange({
  actor: admin,
  target: { id: "x", role: "TEACHER", schoolId: "s2" },
  nextRole: "REGISTRAR",
  schoolAdminCount: 1,
});
assert(r.ok === false && !r.ok && r.status === 403, "cross-tenant denied");

r = assertSchoolAdminRoleChange({
  actor: admin,
  target: teacher,
  nextRole: "SUPER_ADMIN",
  schoolAdminCount: 1,
});
assert(r.ok === false && !r.ok && r.status === 400, "cannot assign SUPER_ADMIN");

r = assertSchoolAdminRoleChange({
  actor: admin,
  target: { id: "sa", role: "SUPER_ADMIN", schoolId: "s1" },
  nextRole: "TEACHER",
  schoolAdminCount: 1,
});
assert(r.ok === false && !r.ok && r.status === 403, "cannot change SUPER_ADMIN user");

r = assertSchoolAdminRoleChange({
  actor: admin,
  target: { id: "a1", role: "SCHOOL_ADMIN", schoolId: "s1" },
  nextRole: "TEACHER",
  schoolAdminCount: 1,
});
assert(r.ok === false && !r.ok && r.status === 400, "cannot demote last school admin");

r = assertSchoolAdminRoleChange({
  actor: admin,
  target: { id: "a2", role: "SCHOOL_ADMIN", schoolId: "s1" },
  nextRole: "PRINCIPAL",
  schoolAdminCount: 2,
});
assert(r.ok === true, "can demote admin when another remains");

r = assertSchoolAdminRoleChange({
  actor: admin,
  target: teacher,
  nextRole: "TEACHER",
  schoolAdminCount: 1,
});
assert(r.ok === true && r.ok && r.fromRole === "TEACHER", "no-op same role ok");

// --- Capability merge / defaults ---
import {
  mergeCapabilities,
  defaultCapabilitiesForRole,
  hasCapability,
  LOCKED_KEYS_FOR_SCHOOL_ADMIN,
} from "../services/identity/src/lib/capabilities.ts";

const principalDefaults = defaultCapabilitiesForRole("PRINCIPAL");
assert(
  hasCapability(principalDefaults, "action.admissions.manage"),
  "Principal defaults include admissions.manage"
);
assert(
  hasCapability(principalDefaults, "action.schedules.manage"),
  "Principal defaults include schedules.manage"
);
assert(
  hasCapability(defaultCapabilitiesForRole("SCHOOL_ADMIN"), "nav.library"),
  "School Admin defaults include specialty library"
);
assert(
  hasCapability(defaultCapabilitiesForRole("SCHOOL_ADMIN"), "action.bulk_import.roster"),
  "School Admin defaults include bulk import"
);

const principalRevoked = mergeCapabilities("PRINCIPAL", [
  { capabilityKey: "action.admissions.manage", allowed: false },
  { capabilityKey: "action.lesson_plans.approve", allowed: false },
  { capabilityKey: "nav.admissions", allowed: false },
]);
assert(
  !hasCapability(principalRevoked, "action.admissions.manage"),
  "can revoke Principal admissions.manage"
);
assert(
  !hasCapability(principalRevoked, "action.lesson_plans.approve"),
  "can revoke Principal lesson_plans.approve"
);
assert(!hasCapability(principalRevoked, "nav.admissions"), "can revoke Principal nav.admissions");
assert(hasCapability(principalRevoked, "nav.dashboard"), "Principal still has dashboard");

const adminLocked = mergeCapabilities("SCHOOL_ADMIN", [
  { capabilityKey: "action.roles.customize", allowed: false },
]);
assert(
  hasCapability(adminLocked, "action.roles.customize"),
  "School Admin cannot lose locked roles.customize"
);
assert(LOCKED_KEYS_FOR_SCHOOL_ADMIN.includes("action.roles.assign"), "assign is locked for admin");

const teacherGranted = mergeCapabilities("TEACHER", [
  { capabilityKey: "action.lesson_plans.approve", allowed: true },
]);
assert(
  hasCapability(teacherGranted, "action.lesson_plans.approve"),
  "can grant lesson_plans.approve to Teacher"
);

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All role-access tests passed");
