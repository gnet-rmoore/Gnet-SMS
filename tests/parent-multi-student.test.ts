import { existsSync, readFileSync } from "fs";
import path from "path";
import { createAssert } from "./helpers/assert";

const { assert, summary } = createAssert();
const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const userService = read("services/identity/src/services/userService.ts");
const identitySeed = read("services/identity/prisma/seed.ts");
const financeController = read("services/finance/src/controllers/financeController.ts");
const financeService = read("services/finance/src/services/financeService.ts");
const classroomController = read("services/classroom/src/controllers/classroomController.ts");
const classroomIdentityClient = read("services/classroom/src/lib/identityClient.ts");
const app = read("src/App.tsx");
const navByRole = read("src/constants/navByRole.ts");
const studentGrades = read("src/pages/School/StudentGrades.tsx");
const reportCard = read("src/pages/School/ReportCard.tsx");
const attendance = read("src/features/attendance/Page.tsx");
const fees = read("src/features/fees/Page.tsx");
const parentChildContext = read("src/context/ParentChildContext.tsx");

console.log("=========================================");
console.log(" PARENT MULTI-STUDENT REGRESSION TESTS");
console.log("=========================================\n");

assert(
  userService.includes("return joinRelations.map((r) => ({ ...r.student }));"),
  "parent child lookup returns explicit ParentStudent links only"
);
assert(!userService.includes('"student_of_"'), "legacy student_of_ child fallback is removed");
assert(
  userService.includes('code: "PARENT_STUDENT_LINK_REQUIRED"'),
  "explicit parent-student assert remains authoritative"
);
assert(
  identitySeed.includes("prisma.parentStudent.upsert") &&
    identitySeed.includes("parentId_studentId"),
  "demo parent has an explicit student link after seed"
);

assert(
  financeController.includes("listPaymentsForFee(req.params.id, schoolId, actor)"),
  "fee payment history passes the caller into the service"
);
assert(
  financeController.includes("user: (req as any).user"),
  "fee checkout passes the caller into the service"
);
assert(
  financeService.includes("Unauthorized to view these payments"),
  "fee payment history rejects parents linked to another student"
);
assert(
  financeService.includes("Unauthorized to check out this fee"),
  "fee checkout rejects parents linked to another student"
);

assert(
  classroomController.indexOf('if (user.role === "PARENT")') <
    classroomController.indexOf("const { membership, isStaff } = await resolveClassroomStaff"),
  "PARENT classroom access is checked before generic membership"
);
assert(
  classroomIdentityClient.includes("/assert-link"),
  "classroom parent authorization uses the explicit Identity assert endpoint"
);
assert(
  !classroomIdentityClient.includes("return ids.includes(studentId)"),
  "classroom no longer approves parents from a heuristic child list"
);

assert(
  existsSync(path.join(root, "src/context/ParentChildContext.tsx")),
  "shared parent-child context exists"
);
assert(
  app.includes("<ParentChildProvider>") && app.includes("</ParentChildProvider>"),
  "parent-child provider wraps the application routes"
);
assert(
  parentChildContext.includes("if (!isParent) return requestedStudentId;") &&
    parentChildContext.includes("? searchParams.get(\"studentId\") || localStorage.getItem(storageKey)"),
  "non-parent child scope ignores parent-specific localStorage selection"
);
assert(
  parentChildContext.includes("if (loading || !children.length) return \"\";"),
  "parent child scope stays empty until explicit links load"
);

const parentChildPages = [
  "src/pages/School/Children.tsx",
  "src/pages/School/StudentGrades.tsx",
  "src/pages/School/ReportCard.tsx",
  "src/features/my-campus/Page.tsx",
  "src/features/online-exam/ListPage.tsx",
  "src/features/classroom-workspace/Page.tsx",
  "src/features/class-schedule/MySchedulePage.tsx",
  "src/features/calendar-page/hooks/useCalendarPageQuery.ts",
  "src/features/attendance/Page.tsx",
  "src/features/fees/Page.tsx",
];
for (const file of parentChildPages) {
  const source = read(file);
  assert(source.includes("useParentChild"), `${file} uses shared parent-child context`);
  assert(!source.includes("useSelectedChild"), `${file} does not use unvalidated local child state`);
}

assert(
  studentGrades.includes("{!isParent && (") &&
    studentGrades.includes("report-card/${exam.id}${studentId") &&
    studentGrades.includes("children.some((child) => child.id === paramStudentId)") &&
    !studentGrades.includes("paramStudentId ? `/${paramStudentId}`"),
  "grade document actions use the resolved and validated child and hide Grade Sheet from parents"
);
assert(
  reportCard.includes("children.some((child) => child.id === paramStudentId)") &&
    reportCard.includes(": parentStudentId") &&
    !reportCard.includes('paramStudentId || (user?.role === "PARENT" ? parentStudentId : user?.id)'),
  "report card validates route child and falls back to the parent's selected child"
);
assert(
  attendance.includes("studentId: user?.role === \"PARENT\" ? studentId || undefined : undefined"),
  "parent attendance queries are scoped to the selected child"
);
assert(
  fees.includes("allFeeRecords.filter((fee) => fee.studentId === studentId)"),
  "parent fee rows are filtered to the selected child"
);
assert(
  !/path="exams\/:examId"[\s\S]{0,240}?"PARENT"/.test(app) &&
    !navByRole.includes('exams: ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT"]'),
  "formal exams routes and role map exclude PARENT"
);

summary("Parent multi-student regressions");
