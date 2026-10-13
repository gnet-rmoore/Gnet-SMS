/** Seeded demo-school fixtures (identity seed). */
export const FIXTURES = {
  slug: "demo-school",
  password: "admin123",
  users: {
    schoolAdmin: { email: "schooladmin@yoursms.com", role: "SCHOOL_ADMIN" },
    teacher: { email: "teacher@yoursms.com", role: "TEACHER" },
    student: { email: "student@yoursms.com", role: "STUDENT" },
    parent: { email: "parent@yoursms.com", role: "PARENT" },
    superAdmin: { email: "superadmin@yoursms.com", role: "SUPER_ADMIN" },
  },
} as const;

export type SeededRole = keyof typeof FIXTURES.users;

/** Gateway direct (compose maps 8081). SPA proxies /api via 8080. */
export function gatewayBaseUrl(): string {
  return (
    process.env.GATEWAY_URL ||
    process.env.API_BASE_URL ||
    "http://localhost:8081"
  ).replace(/\/$/, "");
}

export function spaBaseUrl(): string {
  return (process.env.E2E_BASE_URL || process.env.APP_URL || "http://localhost:8080").replace(
    /\/$/,
    ""
  );
}
