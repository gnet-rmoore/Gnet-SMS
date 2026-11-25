/**
 * Admin password-reset policy (tenant-scoped).
 */
import assert from "node:assert/strict";
import {
  assertCanResetParentPassword,
  assertCanSetUserPassword,
  canAdminResetPassword,
  canResetParentPassword,
  PasswordResetDeniedError,
} from "../services/identity/src/domain/passwordResetPolicy";

const schoolA = "school-a";
const schoolB = "school-b";

const schoolAdminA = { id: "sa1", role: "SCHOOL_ADMIN", schoolId: schoolA };
const schoolAdminA2 = { id: "sa2", role: "SCHOOL_ADMIN", schoolId: schoolA };
const itAdminA = { id: "it1", role: "IT_ADMIN", schoolId: schoolA };
const itAdminA2 = { id: "it2", role: "IT_ADMIN", schoolId: schoolA };
const teacherA = { id: "t1", role: "TEACHER", schoolId: schoolA };
const principalA = { id: "p1", role: "PRINCIPAL", schoolId: schoolA };
const registrarA = { id: "r1", role: "REGISTRAR", schoolId: schoolA };
const parentA = { id: "pa1", role: "PARENT", schoolId: schoolA };
const parentB = { id: "pb1", role: "PARENT", schoolId: schoolB };
const teacherB = { id: "t2", role: "TEACHER", schoolId: schoolB };
const superAdmin = { id: "su1", role: "SUPER_ADMIN", schoolId: null };

// --- canAdminResetPassword (UI gate) ---
assert.equal(canAdminResetPassword(schoolAdminA, teacherA), true);
assert.equal(canAdminResetPassword(schoolAdminA, itAdminA), true);
assert.equal(canAdminResetPassword(schoolAdminA, principalA), true);
assert.equal(canAdminResetPassword(schoolAdminA, schoolAdminA2), false);
assert.equal(canAdminResetPassword(schoolAdminA, schoolAdminA), false);
assert.equal(canAdminResetPassword(itAdminA, teacherA), true);
assert.equal(canAdminResetPassword(itAdminA, itAdminA2), true);
assert.equal(canAdminResetPassword(itAdminA, schoolAdminA), false);
assert.equal(canAdminResetPassword(itAdminA, teacherB), false);
assert.equal(canAdminResetPassword(principalA, teacherA), false);
assert.equal(canAdminResetPassword(superAdmin, schoolAdminA), true);
assert.equal(canAdminResetPassword(superAdmin, teacherA), true);

// --- assertCanSetUserPassword ---
assert.doesNotThrow(() =>
  assertCanSetUserPassword(schoolAdminA, schoolAdminA, { isSelfChange: true })
);
assert.doesNotThrow(() =>
  assertCanSetUserPassword(schoolAdminA, teacherA, { isSelfChange: false })
);
assert.doesNotThrow(() =>
  assertCanSetUserPassword(schoolAdminA, itAdminA, { isSelfChange: false })
);
assert.doesNotThrow(() =>
  assertCanSetUserPassword(itAdminA, teacherA, { isSelfChange: false })
);
assert.doesNotThrow(() =>
  assertCanSetUserPassword(itAdminA, itAdminA2, { isSelfChange: false })
);
assert.doesNotThrow(() =>
  assertCanSetUserPassword(superAdmin, schoolAdminA, { isSelfChange: false })
);

assert.throws(
  () => assertCanSetUserPassword(schoolAdminA, schoolAdminA2, { isSelfChange: false }),
  (err: unknown) =>
    err instanceof PasswordResetDeniedError && err.code === "SCHOOL_ADMIN_PASSWORD_PROTECTED"
);
assert.throws(
  () => assertCanSetUserPassword(itAdminA, schoolAdminA, { isSelfChange: false }),
  (err: unknown) =>
    err instanceof PasswordResetDeniedError && err.code === "SCHOOL_ADMIN_PASSWORD_PROTECTED"
);
assert.throws(
  () => assertCanSetUserPassword(schoolAdminA, teacherB, { isSelfChange: false }),
  (err: unknown) =>
    err instanceof PasswordResetDeniedError && err.code === "PASSWORD_RESET_CROSS_TENANT"
);
assert.throws(
  () => assertCanSetUserPassword(principalA, teacherA, { isSelfChange: false }),
  (err: unknown) =>
    err instanceof PasswordResetDeniedError && err.code === "PASSWORD_RESET_FORBIDDEN"
);
assert.throws(
  () => assertCanSetUserPassword(undefined, teacherA, { isSelfChange: false }),
  (err: unknown) =>
    err instanceof PasswordResetDeniedError && err.code === "PASSWORD_RESET_FORBIDDEN"
);

assert.equal(canResetParentPassword(schoolAdminA, parentA), true);
assert.equal(canResetParentPassword(itAdminA, parentA), true);
assert.equal(canResetParentPassword(principalA, parentA), false);
assert.equal(canResetParentPassword(registrarA, parentA), false);
assert.equal(canResetParentPassword(superAdmin, parentA), false);
assert.equal(canResetParentPassword(schoolAdminA, parentB), false);
assert.equal(canResetParentPassword(teacherA, parentA), false);
assert.equal(canResetParentPassword(schoolAdminA, teacherA), false);

assert.doesNotThrow(() => assertCanResetParentPassword(schoolAdminA, parentA));
assert.doesNotThrow(() => assertCanResetParentPassword(itAdminA, parentA));
assert.throws(
  () => assertCanResetParentPassword(principalA, parentA),
  (err: unknown) =>
    err instanceof PasswordResetDeniedError && err.code === "PARENT_PASSWORD_RESET_FORBIDDEN"
);
assert.throws(
  () => assertCanResetParentPassword(teacherA, parentA),
  (err: unknown) =>
    err instanceof PasswordResetDeniedError && err.code === "PARENT_PASSWORD_RESET_FORBIDDEN"
);
assert.throws(
  () => assertCanResetParentPassword(schoolAdminA, parentB),
  (err: unknown) =>
    err instanceof PasswordResetDeniedError && err.code === "PASSWORD_RESET_CROSS_TENANT"
);

console.log("password-reset-policy.test.ts: ok");
