/**
 * Parse App.tsx ProtectedRoute roles + navByRole items → SPA inventory JSON.
 * Usage: npx tsx scripts/inventory-spa-routes.ts [--check]
 */
import fs from "node:fs";
import path from "node:path";
import { flattenNavSections, getNavSections } from "../src/constants/navByRole.ts";
import { SCHOOL_ASSIGNABLE_ROLES } from "../services/identity/src/lib/roleChange.ts";

const root = process.cwd();
const outPath = path.join(root, "docs/generated/spa-route-inventory.json");
const appPath = path.join(root, "src/App.tsx");

type SpaRoute = {
  segment: string;
  pathPattern: string;
  allowedRoles: string[];
};

type NavEntry = {
  role: string;
  segment: string;
  to: string;
  label: string;
};

function parseAppRoutes(src: string): SpaRoute[] {
  const routes: SpaRoute[] = [];
  // Require ProtectedRoute between path and roles (avoids grabbing next route's allow-list).
  const blockRe =
    /path=["']([^"']+)["']\s*(?:element=\{\s*)?<ProtectedRoute\s+allowedRoles=\{\[([^\]]*)\]\}/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = blockRe.exec(src))) {
    const pathPattern = m[1];
    const rolesRaw = m[2];
    const allowedRoles = [...rolesRaw.matchAll(/["']([A-Z_]+)["']/g)].map((x) => x[1]);
    if (allowedRoles.length === 0) continue;
    const key = `${pathPattern}|${allowedRoles.join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const segment =
      pathPattern === "/:slug/*"
        ? "*"
        : pathPattern.replace(/^\//, "").split("/")[0].replace(/:.*/, "") || pathPattern;
    routes.push({ segment, pathPattern, allowedRoles });
  }
  return routes;
}

function main() {
  const appSrc = fs.readFileSync(appPath, "utf8");
  const protectedRoutes = parseAppRoutes(appSrc);

  const slug = "demo-school";
  const roles = ["SUPER_ADMIN", ...SCHOOL_ASSIGNABLE_ROLES];
  const nav: NavEntry[] = [];
  for (const role of roles) {
    const items = flattenNavSections(getNavSections(role, slug));
    for (const item of items) {
      const parts = item.to.split("/").filter(Boolean);
      const segment =
        role === "SUPER_ADMIN"
          ? parts.slice(1).join("/") || "dashboard"
          : parts[parts.length - 1] || "dashboard";
      nav.push({ role, segment, to: item.to, label: item.label });
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    roles: roles.length,
    protectedRouteCount: protectedRoutes.length,
    navEntryCount: nav.length,
    protectedRoles: roles,
    protectedRoutes,
    nav,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  if (process.argv.includes("--check")) {
    if (!fs.existsSync(outPath)) {
      console.error("MISSING inventory file:", outPath);
      process.exit(1);
    }
    const prev = JSON.parse(fs.readFileSync(outPath, "utf8"));
    const key = (o: typeof payload) =>
      JSON.stringify({
        routes: o.protectedRoutes,
        nav: o.nav.map((n) => `${n.role}|${n.to}`).sort(),
      });
    if (key(prev) !== key(payload)) {
      console.error("SPA route inventory drift — run: npm run inventory:spa");
      process.exit(1);
    }
    console.log(
      `SPA inventory OK (${payload.protectedRouteCount} routes, ${payload.navEntryCount} nav entries)`
    );
    return;
  }

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `Wrote ${outPath} (${payload.protectedRouteCount} protected routes, ${payload.navEntryCount} nav)`
  );
}

main();
