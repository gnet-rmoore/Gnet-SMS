/**
 * Walk services/<name>/src/routes for .ts files and emit API endpoint inventory JSON.
 * Usage: npx tsx scripts/inventory-api-routes.ts [--check]
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outPath = path.join(root, "docs/generated/api-endpoint-inventory.json");
const servicesRoot = path.join(root, "services");

const ROUTE_RE =
  /\brouter\.(get|post|put|patch|delete|all)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi;

type Endpoint = {
  method: string;
  path: string;
  service: string;
  file: string;
  internal: boolean;
};

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walk(full, out);
    } else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const endpoints: Endpoint[] = [];
  const serviceDirs = fs
    .readdirSync(servicesRoot)
    .filter((d) => fs.statSync(path.join(servicesRoot, d)).isDirectory());

  for (const service of serviceDirs) {
    const routesDir = path.join(servicesRoot, service, "src", "routes");
    for (const file of walk(routesDir)) {
      const src = fs.readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      ROUTE_RE.lastIndex = 0;
      while ((m = ROUTE_RE.exec(src))) {
        const method = m[1].toUpperCase();
        const routePath = m[2];
        endpoints.push({
          method,
          path: routePath,
          service,
          file: path.relative(root, file).replace(/\\/g, "/"),
          internal: routePath.includes("/internal/"),
        });
      }
    }
  }

  endpoints.sort((a, b) =>
    a.service === b.service
      ? a.path === b.path
        ? a.method.localeCompare(b.method)
        : a.path.localeCompare(b.path)
      : a.service.localeCompare(b.service)
  );

  const byService: Record<string, number> = {};
  for (const e of endpoints) {
    byService[e.service] = (byService[e.service] || 0) + 1;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    total: endpoints.length,
    publicOrSchool: endpoints.filter((e) => !e.internal).length,
    internal: endpoints.filter((e) => e.internal).length,
    byService,
    endpoints,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  if (process.argv.includes("--check")) {
    if (!fs.existsSync(outPath)) {
      console.error("MISSING inventory file:", outPath);
      process.exit(1);
    }
    const prev = JSON.parse(fs.readFileSync(outPath, "utf8"));
    const prevKey = (prev.endpoints || [])
      .map((e: Endpoint) => `${e.service}|${e.method}|${e.path}`)
      .sort()
      .join("\n");
    const nextKey = endpoints
      .map((e) => `${e.service}|${e.method}|${e.path}`)
      .sort()
      .join("\n");
    if (prevKey !== nextKey) {
      console.error("API endpoint inventory drift — run: npm run inventory:api");
      process.exit(1);
    }
    console.log(`API inventory OK (${payload.total} endpoints)`);
    return;
  }

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote ${outPath} (${payload.total} endpoints)`);
  console.log(JSON.stringify(byService, null, 2));
}

main();
