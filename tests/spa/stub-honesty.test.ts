/**
 * Campus specialist pages must re-export live feature modules — no StubFeaturePage or fake KPIs.
 * Run: npm run test:spa-stub
 */
import fs from "node:fs";
import path from "node:path";
import { createAssert } from "../helpers/assert.ts";

const root = process.cwd();
const { assert, summary } = createAssert();

const LIVE_SPECIALIST_PAGES = [
  "Library.tsx",
  "Hostel.tsx",
  "Counseling.tsx",
  "BusRoutes.tsx",
  "Drivers.tsx",
  "VehicleMaintenance.tsx",
  "Clinic.tsx",
  "Cafeteria.tsx",
  "Athletics.tsx",
];

const LIVE_FEATURE_DIRS = [
  "library",
  "hostel",
  "counseling",
  "transport",
  "clinic",
  "cafeteria",
  "athletics",
];

/** Strings that previously appeared as fake telemetry / KPI filler. */
const FAKE_KPI_RE =
  /\b(1,240|1\.2k|99\.9%|seeded guests|sample visitors|fake certification|lorem ipsum|Active Routes:\s*8)\b/i;

console.log("=========================================");
console.log(" SPA STUB HONESTY");
console.log("=========================================\n");

const schoolDir = path.join(root, "src/pages/School");
for (const name of LIVE_SPECIALIST_PAGES) {
  const full = path.join(schoolDir, name);
  assert(fs.existsSync(full), `${name} exists`);
  const src = fs.readFileSync(full, "utf8");
  assert(
    src.includes("features/"),
    `${name} re-exports a live feature module`
  );
  assert(!src.includes("StubFeaturePage"), `${name} is not a stub page`);
  assert(!FAKE_KPI_RE.test(src), `${name} has no fake KPI strings`);
}

for (const dir of LIVE_FEATURE_DIRS) {
  const pagePath = path.join(root, "src/features", dir, "Page.tsx");
  const altPaths = [
    pagePath,
    path.join(root, "src/features", dir, "BusRoutesPage.tsx"),
    path.join(root, "src/features", dir, "DriversPage.tsx"),
    path.join(root, "src/features", dir, "VehicleMaintenancePage.tsx"),
  ].filter((p) => fs.existsSync(p));

  for (const full of altPaths) {
    const src = fs.readFileSync(full, "utf8");
    assert(!FAKE_KPI_RE.test(src), `${path.relative(root, full)} has no fake KPI strings`);
    assert(!src.includes("StubFeaturePage"), `${path.relative(root, full)} is not a stub`);
  }
}

const stubComp = fs.readFileSync(
  path.join(root, "src/components/StubFeaturePage.tsx"),
  "utf8"
);
assert(
  stubComp.includes("stubNotAvailable") ||
    stubComp.includes("stubEmptyTitle") ||
    stubComp.includes("no sample data") ||
    stubComp.includes("Nothing to show"),
  "StubFeaturePage empty copy present"
);
assert(!FAKE_KPI_RE.test(stubComp), "StubFeaturePage itself has no fake KPIs");

summary("spa-stub-honesty");
