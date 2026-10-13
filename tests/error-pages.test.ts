/**
 * Error home-path helper + public error routes present in App.
 * Run: npx tsx tests/error-pages.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolveErrorHomePath } from "../src/lib/errorHomePath";

assert.equal(
  resolveErrorHomePath({ accessToken: null, role: null, schoolSlug: null }),
  "/"
);
assert.equal(
  resolveErrorHomePath({
    accessToken: "t",
    role: "SUPER_ADMIN",
    schoolSlug: "x",
  }),
  "/super-admin"
);
assert.equal(
  resolveErrorHomePath({
    accessToken: "t",
    role: "TEACHER",
    schoolSlug: "demo",
  }),
  "/demo/dashboard"
);

const appSrc = fs.readFileSync(path.join(process.cwd(), "src/App.tsx"), "utf8");
for (const p of ["/404", "/forbidden", "/error", "/offline", "/school-unavailable"]) {
  assert.match(appSrc, new RegExp(`path="${p.replace("/", "\\/")}"`));
}
assert.match(appSrc, /AppErrorBoundary/);
assert.match(appSrc, /OfflineGate/);
assert.match(appSrc, /path="\*"/);

const pr = fs.readFileSync(
  path.join(process.cwd(), "src/components/ProtectedRoute.tsx"),
  "utf8"
);
assert.match(pr, /\/forbidden\?reason=role/);
assert.match(pr, /\/forbidden\?reason=capability/);

console.log("error-pages: ok");
