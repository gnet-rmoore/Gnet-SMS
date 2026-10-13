/**
 * Nav ⊆ App ProtectedRoute roles (+ ROUTE_ROLES alignment where defined).
 * Run: npm run test:spa
 */
import fs from "node:fs";
import path from "node:path";
import {
  flattenNavSections,
  getNavSections,
  ROUTE_ROLES,
} from "../../src/constants/navByRole.ts";
import { SCHOOL_ASSIGNABLE_ROLES } from "../../services/identity/src/lib/roleChange.ts";
import { createAssert } from "../helpers/assert.ts";

const root = process.cwd();
const { assert, summary } = createAssert();

type SpaRoute = { segment: string; pathPattern: string; allowedRoles: string[] };

/** Only bind path → roles when ProtectedRoute sits between them. */
function parseAppRoutes(src: string): SpaRoute[] {
  const routes: SpaRoute[] = [];
  const blockRe =
    /path=["']([^"']+)["']\s*(?:element=\{\s*)?<ProtectedRoute\s+allowedRoles=\{\[([^\]]*)\]\}/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(src))) {
    const pathPattern = m[1];
    const allowedRoles = [...m[2].matchAll(/["']([A-Z_]+)["']/g)].map((x) => x[1]);
    if (!allowedRoles.length) continue;
    const segment =
      pathPattern === "/:slug/*"
        ? "*"
        : pathPattern.replace(/^\//, "").split("/")[0].replace(/:.*/, "") || pathPattern;
    routes.push({ segment, pathPattern, allowedRoles });
  }
  return routes;
}

/**
 * Roles for a nav segment: prefer the route whose pathPattern equals the segment
 * exactly (list page), not nested `segment/:id/...` take/edit routes.
 */
function rolesForSegment(routes: SpaRoute[], segment: string): string[] | null {
  // Exact pathPattern match first (including nested "settings/academic-calendar")
  const exact = routes.find((r) => r.pathPattern === segment);
  if (exact) return exact.allowedRoles;
  const nested = routes.filter(
    (r) => r.segment === segment && r.pathPattern !== "/:slug/*"
  );
  if (nested.length) {
    return nested.reduce((best, r) =>
      r.allowedRoles.length > best.length ? r.allowedRoles : best
    , nested[0].allowedRoles);
  }
  const shell = routes.find((r) => r.pathPattern === "/:slug/*");
  return shell?.allowedRoles ?? null;
}

/** Segments that inherit the school shell only (no nested ProtectedRoute). */
const SHELL_ONLY = new Set([
  "dashboard",
  "profile",
  "reports",
  "staff",
  "staff-portal",
  "staff-tasks",
  "attendance",
  "curriculum",
  "children",
  "transcripts",
  "leave-approval",
]);

console.log("=========================================");
console.log(" SPA ROUTE / NAV MATRIX");
console.log("=========================================\n");

const appSrc = fs.readFileSync(path.join(root, "src/App.tsx"), "utf8");
const routes = parseAppRoutes(appSrc);
assert(routes.length > 20, `parsed protected routes (${routes.length})`);

const slug = "demo-school";
const schoolRoles = [...SCHOOL_ASSIGNABLE_ROLES];

let navChecked = 0;
for (const role of schoolRoles) {
  const items = flattenNavSections(getNavSections(role, slug));
  for (const item of items) {
    const parts = item.to.split("/").filter(Boolean);
    // Under /:slug/... take remaining path as segment (supports nested e.g. settings/academic-calendar)
    const slugIdx = parts[0] === slug ? 1 : 0;
    const segment = parts.slice(slugIdx).join("/") || parts[parts.length - 1];
    if (!segment) continue;

    const effectiveSegment = segment;

    if (SHELL_ONLY.has(effectiveSegment)) {
      const shell = rolesForSegment(routes, "*") || rolesForSegment(routes, "/:slug/*");
      if (shell) {
        assert(
          shell.includes(role),
          `nav ${role} → /${effectiveSegment} allowed via school shell`
        );
      }
      navChecked += 1;
      continue;
    }

    const appRoles = rolesForSegment(routes, effectiveSegment);
    if (!appRoles) {
      assert(
        false,
        `nav ${role} → ${item.to}: no App ProtectedRoute for segment "${effectiveSegment}"`
      );
      continue;
    }

    assert(
      appRoles.includes(role),
      `nav ${role} → /${effectiveSegment} allowed in App`
    );
    navChecked += 1;

    const routeRoles = ROUTE_ROLES[effectiveSegment];
    if (routeRoles) {
      assert(
        routeRoles.includes(role),
        `ROUTE_ROLES[${effectiveSegment}] includes ${role}`
      );
      // App guard and ROUTE_ROLES should agree on this role
      assert(
        appRoles.includes(role) === routeRoles.includes(role),
        `App ↔ ROUTE_ROLES agree for ${role} on ${effectiveSegment}`
      );
    }
  }
}

assert(navChecked > 50, `checked ${navChecked} nav→route pairs`);

const studentsRoles = rolesForSegment(routes, "students");
assert(!!studentsRoles?.includes("COUNSELOR"), "Counselor on students route");
const calendarRoles = rolesForSegment(routes, "calendar");
assert(!!calendarRoles?.includes("LIBRARIAN"), "Librarian on calendar route");
assert(!!calendarRoles?.includes("NURSE"), "Nurse on calendar route");

const onboardingRoles = rolesForSegment(routes, "onboarding");
assert(!!onboardingRoles?.includes("SCHOOL_ADMIN"), "Admin onboarding");
assert(!onboardingRoles?.includes("TEACHER"), "Teacher not on onboarding");

const teacherNav = flattenNavSections(getNavSections("TEACHER", slug)).map((i) => i.to);
assert(
  !teacherNav.some((t) => t.endsWith("/roles")),
  "Teacher has no Roles nav item"
);

summary("spa-route-matrix");
