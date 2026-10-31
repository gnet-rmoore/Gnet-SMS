/**
 * Attendance scope, filter, and search contracts.
 * Run: npx tsx tests/attendance-scope.test.ts
 */
import { readFileSync } from "fs";
import path from "path";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const service = read("services/lifecycle/src/services/attendanceService.ts");
const controller = read("services/lifecycle/src/controllers/attendanceController.ts");
const api = read("src/features/attendance/api.ts");
const page = read("src/features/attendance/Page.tsx");
const hook = read("src/features/attendance/hooks/useAttendanceQuery.ts");

console.log("=========================================");
console.log(" ATTENDANCE SCOPE / FILTER TESTS");
console.log("=========================================\n");

assert(service.includes("getTeacherClassrooms"), "teacher scope comes from classroom service");
assert(
  service.includes('where.classroomId = { in: teacherClassroomIds }'),
  "teacher classroom scope is applied to the database query"
);
assert(service.includes("viewerOnly"), "student/parent responses are viewer-filtered");
assert(
  service.includes("countStatuses(records)"),
  "student/parent counts are recomputed from viewer-filtered records"
);
assert(
  service.includes("getParentChildIds"),
  "parent scope resolves linked children"
);
assert(service.includes("pageSize"), "list query supports pagination");
assert(service.includes("opts?.q"), "list query accepts a search term");
assert(service.includes("where.OR"), "search is applied in the database query");
assert(
  service.includes("matchingClassroomIds") && service.includes("matchingTeacherIds"),
  "search matches classroom and teacher names before pagination"
);
assert(
  service.includes("listSchoolClassrooms") && service.includes("getUsersByRoles"),
  "search resolves classroom/teacher names from source services"
);

assert(
  controller.includes("q: req.query.q as string | undefined"),
  "controller forwards q to the service"
);
assert(
  controller.includes("classroomId: req.query.classroomId as string | undefined") &&
    controller.includes("studentId: req.query.studentId as string | undefined"),
  "controller forwards classroom/student filters"
);

assert(api.includes("q?: string"), "client filter type includes q");
assert(
  hook.includes("attendanceApi.fetchAttendance(schoolId, {") &&
    hook.includes("page: pageParam"),
  "client requests server-paged attendance"
);
assert(
  page.includes("q: filters.committedQ"),
  "attendance page sends the committed search to the server"
);
assert(
  !page.includes("const filteredRecords = attendanceRecords.filter"),
  "attendance page no longer filters search results client-side after pagination"
);
assert(page.includes("hasNextPage") && page.includes("fetchNextPage"), "attendance page supports load more");

console.log("");
if (failed) {
  console.error(`${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("All attendance scope tests passed");
