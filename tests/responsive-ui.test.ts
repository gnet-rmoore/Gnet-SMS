/**
 * Responsive UI contracts (Layout drawer, padding, primitives).
 * Run: npm run test:responsive  (or via test:unit after package.json wire-up)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pageShellClass } from "../src/components/ui/tokens.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
console.log(" RESPONSIVE UI CONTRACTS");
console.log("=========================================\n");

const layout = fs.readFileSync(path.join(root, "src/components/Layout.tsx"), "utf8");
assert(layout.includes('matchMedia("(min-width: 1024px)")'), "Layout tracks lg breakpoint");
assert(layout.includes("mobileNavOpen"), "Layout has mobile overlay nav state");
assert(layout.includes("p-4 sm:p-6 lg:p-8"), "Layout main uses responsive padding");
assert(layout.includes("fixed inset-0") || layout.includes("bg-slate-900/40"), "Layout mobile backdrop");
assert(layout.includes("closeMobileNav") || layout.includes("setMobileNavOpen(false)"), "Layout closes mobile nav");

const search = fs.readFileSync(path.join(root, "src/components/GlobalSearch.tsx"), "utf8");
assert(search.includes("hidden sm:block") || search.includes("sm:w-48"), "GlobalSearch compact on phone");

assert(!pageShellClass.default.includes("px-6"), "PageShell does not double-pad horizontally");
assert(pageShellClass.default.includes("min-w-0"), "PageShell min-w-0 for flex children");

const dataTable = fs.readFileSync(path.join(root, "src/components/ui/DataTable.tsx"), "utf8");
assert(dataTable.includes("table-fixed"), "DataTable uses fixed layout for list tables");
assert(!dataTable.includes("overflow-x-auto"), "DataTable avoids horizontal scroll wrapper");

const tableScroll = fs.readFileSync(path.join(root, "src/components/ui/TableScroll.tsx"), "utf8");
assert(tableScroll.includes("overflow-x-auto"), "TableScroll scrolls horizontally for matrix tables");

const matrixHint = fs.readFileSync(path.join(root, "src/components/ui/MatrixScrollHint.tsx"), "utf8");
assert(matrixHint.includes("lg:hidden"), "MatrixScrollHint phone-only");

const gradebook = fs.readFileSync(
  path.join(root, "src/features/gradebook/components/GradebookSheet.tsx"),
  "utf8"
);
assert(gradebook.includes("MatrixScrollHint"), "Gradebook shows matrix scroll tip");

const schedule = fs.readFileSync(path.join(root, "src/features/class-schedule/Page.tsx"), "utf8");
assert(schedule.includes("MatrixScrollHint"), "Class schedule shows matrix scroll tip");

// Soft drift: interactive files should not introduce bare grid-cols-2 without grid-cols-1
const allow = /(Template|ReportCard|GradeSheet|gradesheets|Pdf\.tsx$|print|report-cards|RichTextEditor|PageSkeleton|CalendarMainGrid|WeekStrip)/i;
// Frozen reviewed count of bare grid-cols-2..6 still awaiting a mobile
// `grid-cols-1` prefix (see docs/RESPONSIVE_UI_PLAN.md). Lower as waves land;
// never raise without review.
const BARE_GRID_BASELINE = 20;
let bareGrid = 0;
const samples: string[] = [];
function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx$/.test(entry.name)) {
      const rel = path.relative(root, full);
      if (allow.test(rel)) continue;
      const text = fs.readFileSync(full, "utf8");
      const re = /(?<![a-z0-9\-:])grid-cols-[2-6]\b/g;
      const hits = text.match(re);
      if (hits?.length) {
        bareGrid += hits.length;
        if (samples.length < 8) samples.push(`${rel} (${hits.length})`);
      }
    }
  }
}
walk(path.join(root, "src"));
assert(
  bareGrid <= BARE_GRID_BASELINE,
  `bare grid-cols-2..6 outside allowlist drift ${bareGrid} > ${BARE_GRID_BASELINE} (${samples.join(", ")})`,
);

console.log("\n=========================================");
if (failed) {
  console.error(` ${failed} assertion(s) failed`);
  process.exit(1);
}
console.log(" All responsive contracts passed");
console.log("=========================================\n");
