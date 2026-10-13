/**
 * Classroom submission status helpers.
 * Run: npx tsx tests/classroom-workspace.test.ts
 */
import {
  canStudentEditSubmission,
  normalizePostType,
  SUBMISSION_STATUS,
} from "../services/classroom/src/lib/submissionStatus.ts";

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
console.log(" CLASSROOM WORKSPACE TESTS");
console.log("=========================================\n");

assert(canStudentEditSubmission(undefined) === true, "no submission → editable");
assert(canStudentEditSubmission(SUBMISSION_STATUS.SUBMITTED) === true, "SUBMITTED editable");
assert(canStudentEditSubmission(SUBMISSION_STATUS.REOPENED) === true, "REOPENED editable");
assert(canStudentEditSubmission(SUBMISSION_STATUS.RETURNED) === false, "RETURNED locked");

assert(normalizePostType("assignment") === "ASSIGNMENT", "normalize assignment");
assert(normalizePostType("MATERIAL") === "MATERIAL", "normalize material");
assert(normalizePostType("weird") === "ANNOUNCEMENT", "unknown → announcement");

/** Mirror gateway classroom prefixes (avoid importing server.ts which listens). */
function routesToClassroom(path: string): boolean {
  return (
    path === "/api/classrooms" ||
    path.startsWith("/api/classrooms/") ||
    path === "/api/posts" ||
    path.startsWith("/api/posts/") ||
    path === "/api/submissions" ||
    path.startsWith("/api/submissions/") ||
    path === "/api/topics" ||
    path.startsWith("/api/topics/") ||
    path === "/api/comments" ||
    path.startsWith("/api/comments/")
  );
}

assert(routesToClassroom("/api/posts/abc") === true, "posts path → classroom");
assert(routesToClassroom("/api/posts/abc/submissions") === true, "submissions path → classroom");
assert(routesToClassroom("/api/submissions/xyz/return") === true, "return path → classroom");
assert(routesToClassroom("/api/topics/abc") === true, "topics path → classroom");
assert(routesToClassroom("/api/comments/abc") === true, "comments path → classroom");
assert(routesToClassroom("/api/fees") === false, "fees not classroom");

import { canManageClassroomMembership } from "../services/classroom/src/lib/membershipPermissions.ts";

assert(canManageClassroomMembership("SCHOOL_ADMIN") === true, "admin manages roster");
assert(canManageClassroomMembership("REGISTRAR") === true, "registrar manages roster");
assert(canManageClassroomMembership("VPA") === true, "VPA manages roster");
assert(canManageClassroomMembership("TEACHER") === false, "teacher cannot manage roster");
assert(canManageClassroomMembership("STUDENT") === false, "student cannot manage roster");
assert(canManageClassroomMembership(null) === false, "null role cannot manage roster");

import { normalizeMime } from "../services/classroom/src/lib/storageMime.ts";

assert(normalizeMime("image/jpg") === "image/jpeg", "image/jpg → image/jpeg");
assert(normalizeMime("", "banner.PNG") === "image/png", "infer png from filename");
assert(normalizeMime("application/octet-stream", "cover.webp") === "image/webp", "infer webp");
assert(normalizeMime("image/png", "x.bin") === "image/png", "explicit mime wins");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All classroom-workspace tests passed");
