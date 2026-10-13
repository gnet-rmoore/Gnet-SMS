/**
 * HTTP authZ policy table — PR smoke subset (P0 permissions + core auth).
 * Full matrix grows toward inventory coverage over time.
 */
export type ExpectStatus = number | number[];

export type Policy = {
  id: string;
  method: string;
  /** Path with :schoolId replaced at runtime */
  path: string;
  asRole: "anon" | "schoolAdmin" | "teacher" | "student" | "parent" | "superAdmin";
  expect: ExpectStatus;
  body?: unknown;
  /** Extra query string (without leading ?) */
  query?: string;
};

/** Critical policies for `npm run test:http-smoke`. */
export const SMOKE_POLICIES: Policy[] = [
  {
    id: "anon-login-bad",
    method: "POST",
    path: "/api/auth/login",
    asRole: "anon",
    expect: [400, 401],
    body: { email: "nobody@example.com", password: "wrong" },
  },
  {
    id: "admin-me",
    method: "GET",
    path: "/api/auth/me",
    asRole: "schoolAdmin",
    expect: 200,
  },
  {
    id: "anon-me",
    method: "GET",
    path: "/api/auth/me",
    asRole: "anon",
    expect: 401,
  },
  {
    id: "student-docs-ok",
    method: "GET",
    path: "/api/schools/:schoolId/documents",
    asRole: "student",
    expect: 200,
  },
  {
    id: "student-docs-spoof-role-still-200",
    method: "GET",
    path: "/api/schools/:schoolId/documents",
    asRole: "student",
    query: "role=SCHOOL_ADMIN",
    expect: 200,
  },
  {
    id: "teacher-docs-create-403",
    method: "POST",
    path: "/api/schools/:schoolId/documents",
    asRole: "teacher",
    expect: 403,
    body: { title: "x", content: "y", roles: ["TEACHER"] },
  },
  {
    id: "student-docs-create-403",
    method: "POST",
    path: "/api/schools/:schoolId/documents",
    asRole: "student",
    expect: 403,
    body: { title: "x", content: "y", roles: ["STUDENT"] },
  },
  {
    id: "admin-docs-ok",
    method: "GET",
    path: "/api/schools/:schoolId/documents",
    asRole: "schoolAdmin",
    expect: 200,
  },
  {
    id: "teacher-leave-list",
    method: "GET",
    path: "/api/schools/:schoolId/leave-requests",
    asRole: "teacher",
    expect: 200,
  },
  {
    id: "teacher-leave-spoof-userId",
    method: "GET",
    path: "/api/schools/:schoolId/leave-requests",
    asRole: "teacher",
    query: "userId=00000000-0000-0000-0000-000000000099",
    expect: 200,
  },
  {
    id: "admin-classrooms",
    method: "GET",
    path: "/api/schools/:schoolId/classrooms",
    asRole: "schoolAdmin",
    expect: 200,
  },
  {
    id: "student-classrooms",
    method: "GET",
    path: "/api/schools/:schoolId/classrooms",
    asRole: "student",
    expect: 200,
  },
  {
    id: "parent-fees",
    method: "GET",
    path: "/api/schools/:schoolId/fees",
    asRole: "parent",
    expect: [200, 403],
  },
  {
    id: "internal-classrooms-no-jwt",
    method: "GET",
    path: "/api/internal/classrooms/count",
    asRole: "anon",
    // 401/403 = auth middleware; 404/503 = gateway refuses unauthenticated external path
    expect: [401, 403, 404, 503],
  },
  {
    id: "student-cannot-payroll",
    method: "GET",
    path: "/api/schools/:schoolId/payrolls",
    asRole: "student",
    expect: [401, 403],
  },
];
