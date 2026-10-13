/**
 * Permission / ACL rules tests for the 2026-07-24 fix report (P0).
 * Pure logic mirrors service controllers — no live HTTP.
 */
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed += 1;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

const DOC_MANAGE = new Set([
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VPI",
  "VPA",
  "REGISTRAR",
]);

function documentRoleFilter(userRole: string, queryRole?: string): string | undefined {
  const isManager = DOC_MANAGE.has(userRole);
  if (!isManager) return userRole;
  if (queryRole) return queryRole;
  return undefined;
}

const LEAVE_APPROVERS = new Set(["SCHOOL_ADMIN", "PRINCIPAL", "VPA", "SUPER_ADMIN"]);

function leaveListUserId(
  actorRole: string,
  actorId: string,
  queryUserId?: string
): string | undefined {
  if (LEAVE_APPROVERS.has(actorRole)) {
    return queryUserId || undefined;
  }
  return actorId;
}

function canStartRollCall(actorRole: string, isClassTeacher: boolean): boolean {
  if (["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "SUPER_ADMIN"].includes(actorRole)) {
    return true;
  }
  return isClassTeacher;
}

console.log("=========================================");
console.log(" PERMISSIONS FIX RULES");
console.log("=========================================\n");

assert(
  documentRoleFilter("STUDENT", "SCHOOL_ADMIN") === "STUDENT",
  "Student cannot spoof ?role=SCHOOL_ADMIN"
);
assert(
  documentRoleFilter("TEACHER", "SCHOOL_ADMIN") === "TEACHER",
  "Teacher is not a document manager; forced to own role"
);
assert(
  documentRoleFilter("SCHOOL_ADMIN", "TEACHER") === "TEACHER",
  "Admin may filter library by ?role="
);
assert(
  documentRoleFilter("SCHOOL_ADMIN") === undefined,
  "Admin without ?role= sees full library"
);

assert(
  leaveListUserId("NURSE", "nurse-1") === "nurse-1",
  "Nurse leave list scoped to self"
);
assert(
  leaveListUserId("NURSE", "nurse-1", "other-id") === "nurse-1",
  "Nurse cannot spoof ?userId="
);
assert(
  leaveListUserId("VPA", "vpa-1") === undefined,
  "VPA may list all leave when no ?userId="
);
assert(
  leaveListUserId("VPA", "vpa-1", "staff-9") === "staff-9",
  "VPA may filter leave by userId"
);

assert(canStartRollCall("TEACHER", true) === true, "Class teacher can take roll");
assert(canStartRollCall("TEACHER", false) === false, "Non-member teacher blocked");
assert(canStartRollCall("SCHOOL_ADMIN", false) === true, "Admin override roll call");

console.log("\n=========================================");
if (failed) {
  console.error(`${failed} permission rule(s) failed`);
  process.exit(1);
}
console.log("All permission-fix rule checks passed");
