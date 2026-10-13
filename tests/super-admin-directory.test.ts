/**
 * Super Admin directory headcount helpers.
 */
import assert from "node:assert/strict";
import {
  emptyHeadcounts,
  headcountsFromRoleGroups,
  isStaffDirectoryRole,
  rolesForDirectoryKind,
} from "../services/identity/src/domain/superAdminDirectory";

assert.equal(isStaffDirectoryRole("TEACHER"), true);
assert.equal(isStaffDirectoryRole("SCHOOL_ADMIN"), true);
assert.equal(isStaffDirectoryRole("STUDENT"), false);
assert.equal(isStaffDirectoryRole("PARENT"), false);
assert.equal(isStaffDirectoryRole("SUPER_ADMIN"), false);

assert.deepEqual(rolesForDirectoryKind("students"), ["STUDENT"]);
assert.deepEqual(rolesForDirectoryKind("parents"), ["PARENT"]);
assert.equal(rolesForDirectoryKind("staff"), "staff");

const map = headcountsFromRoleGroups([
  { schoolId: "s1", role: "STUDENT", _count: { _all: 40 } },
  { schoolId: "s1", role: "TEACHER", _count: { _all: 8 } },
  { schoolId: "s1", role: "SCHOOL_ADMIN", _count: { _all: 1 } },
  { schoolId: "s1", role: "PARENT", _count: { _all: 20 } },
  { schoolId: "s2", role: "STUDENT", _count: 5 },
  { schoolId: null, role: "SUPER_ADMIN", _count: { _all: 1 } },
]);

const s1 = map.get("s1")!;
assert.equal(s1.studentCount, 40);
assert.equal(s1.staffCount, 9);
assert.equal(s1.parentCount, 20);
assert.equal(s1.userCount, 69);

const s2 = map.get("s2")!;
assert.equal(s2.studentCount, 5);
assert.equal(s2.staffCount, 0);
assert.equal(s2.userCount, 5);

assert.deepEqual(emptyHeadcounts(), {
  studentCount: 0,
  staffCount: 0,
  parentCount: 0,
  userCount: 0,
});

console.log("super-admin-directory: ok");
