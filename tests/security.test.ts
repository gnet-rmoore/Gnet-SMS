import { Response, NextFunction } from "express";
import {
  requireTenant,
  requireRoles,
  requireSelfOrRoles,
  requireSchoolMembership,
} from "../services/identity/src/middleware/auth.ts";

let failedTestsCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    failedTestsCount++;
  } else {
    console.log(`PASSED: ${message}`);
  }
}

function createMockRequest(user: any, params: any = {}, query: any = {}, body: any = {}) {
  return { user, params, query, body } as any;
}

function createMockResponse() {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.jsonData = data;
    return res;
  };
  return res;
}

const mockNext: NextFunction = () => {
  (mockNext as any).called = true;
};

function resetNext() {
  (mockNext as any).called = false;
}

console.log("=========================================");
console.log(" RUNNING SECURITY MIDDLEWARE TEST SUITE  ");
console.log("=========================================\n");

console.log("[Testing requireTenant Middleware]");

resetNext();
const req1 = createMockRequest({ id: "user-1", schoolId: "school-A", role: "TEACHER" }, { schoolId: "school-A" });
const res1 = createMockResponse();
requireTenant(req1, res1, mockNext);
assert((mockNext as any).called === true, "Teacher can access their own school context");

resetNext();
const req2 = createMockRequest({ id: "user-1", schoolId: "school-A", role: "TEACHER" }, { schoolId: "school-B" });
const res2 = createMockResponse();
requireTenant(req2, res2, mockNext);
assert((mockNext as any).called === false, "Teacher cannot access another school context");
assert(res2.statusCode === 403, "Forbidden code 403 returned on cross-tenant access");
assert(res2.jsonData.error.includes("prohibited"), "Correct error message returned on cross-tenant access");

resetNext();
const req3 = createMockRequest({ id: "admin-1", role: "SUPER_ADMIN" }, { schoolId: "school-B" });
const res3 = createMockResponse();
requireTenant(req3, res3, mockNext);
assert((mockNext as any).called === true, "Super Admin bypasses school tenant restriction successfully");

resetNext();
const req4 = createMockRequest(undefined, { schoolId: "school-A" });
const res4 = createMockResponse();
requireTenant(req4, res4, mockNext);
assert((mockNext as any).called === false, "Missing user context triggers block");
assert(res4.statusCode === 401, "Missing user triggers 401 Unauthorized status");

// New: missing schoolId in request must not silently pass
resetNext();
const reqMissingSchool = createMockRequest({ id: "user-1", schoolId: "school-A", role: "TEACHER" }, {});
const resMissingSchool = createMockResponse();
requireTenant(reqMissingSchool, resMissingSchool, mockNext);
assert((mockNext as any).called === false, "requireTenant rejects when schoolId absent from request");
assert(resMissingSchool.statusCode === 403, "Missing schoolId returns 403");

// Student cannot patch school (role gate)
console.log("\n[Testing requireRoles Middleware]");

resetNext();
const req5 = createMockRequest({ id: "user-2", role: "ACCOUNTANT" });
const res5 = createMockResponse();
requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"])(req5, res5, mockNext);
assert((mockNext as any).called === true, "Accountant can access Accountant endpoints");

resetNext();
const req6 = createMockRequest({ id: "user-3", role: "STUDENT" });
const res6 = createMockResponse();
requireRoles(["SCHOOL_ADMIN", "ACCOUNTANT"])(req6, res6, mockNext);
assert((mockNext as any).called === false, "Student blocked from Accountant endpoints");
assert(res6.statusCode === 403, "Student triggers 403 Forbidden status");

resetNext();
const reqStudentSchool = createMockRequest({ id: "s1", role: "STUDENT", schoolId: "school-A" }, { schoolId: "school-A" });
const resStudentSchool = createMockResponse();
requireRoles(["SCHOOL_ADMIN", "IT_ADMIN", "PRINCIPAL"])(reqStudentSchool, resStudentSchool, mockNext);
assert((mockNext as any).called === false, "Student cannot PATCH school settings");

console.log("\n[Testing requireSelfOrRoles Middleware]");

resetNext();
const req7 = createMockRequest({ id: "student-100", role: "STUDENT" }, { studentId: "student-100" });
const res7 = createMockResponse();
requireSelfOrRoles(["SCHOOL_ADMIN", "TEACHER"])(req7, res7, mockNext);
assert((mockNext as any).called === true, "Student can access their own student profile data");

resetNext();
const req8 = createMockRequest({ id: "student-100", role: "STUDENT" }, { studentId: "student-200" });
const res8 = createMockResponse();
requireSelfOrRoles(["SCHOOL_ADMIN", "TEACHER"])(req8, res8, mockNext);
assert((mockNext as any).called === false, "Student cannot access another student's profile");
assert(res8.statusCode === 403, "Blocked student triggers 403 Forbidden status");

resetNext();
const req9 = createMockRequest({ id: "admin-1", role: "SCHOOL_ADMIN" }, { studentId: "student-200" });
const res9 = createMockResponse();
requireSelfOrRoles(["SCHOOL_ADMIN", "TEACHER"])(req9, res9, mockNext);
assert((mockNext as any).called === true, "School Admin can access student profiles");

// Parent children IDOR: other parent blocked
resetNext();
const reqParentIdor = createMockRequest({ id: "parent-1", role: "PARENT" }, { parentId: "parent-2" });
const resParentIdor = createMockResponse();
requireSelfOrRoles(["SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR"])(reqParentIdor, resParentIdor, mockNext);
assert((mockNext as any).called === false, "Parent cannot access another parent's children (IDOR blocked)");

resetNext();
const reqParentOk = createMockRequest({ id: "parent-1", role: "PARENT" }, { parentId: "parent-1" });
const resParentOk = createMockResponse();
requireSelfOrRoles(["SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR"])(reqParentOk, resParentOk, mockNext);
assert((mockNext as any).called === true, "Parent can access own children list");

console.log("\n[Testing requireSchoolMembership Middleware]");

resetNext();
const reqMember = createMockRequest({ id: "u1", schoolId: "school-A", role: "TEACHER" });
const resMember = createMockResponse();
requireSchoolMembership(reqMember, resMember, mockNext);
assert((mockNext as any).called === true, "School member passes requireSchoolMembership");

resetNext();
const reqNoSchool = createMockRequest({ id: "u2", role: "TEACHER" });
const resNoSchool = createMockResponse();
requireSchoolMembership(reqNoSchool, resNoSchool, mockNext);
assert((mockNext as any).called === false, "User without schoolId blocked by requireSchoolMembership");
assert(resNoSchool.statusCode === 403, "No school membership returns 403");

console.log("\n=========================================");
console.log("             TESTING SUMMARY             ");
console.log("=========================================");
if (failedTestsCount === 0) {
  console.log("ALL SECURITY TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
} else {
  console.error(`FAILURE: ${failedTestsCount} security test(s) failed.`);
  process.exit(1);
}
