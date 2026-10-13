/**
 * Drift guard for legacy density recipes on interactive screens.
 * Fails only on *new* files outside the baseline snapshot + allowlist.
 * Run: npm run test:ui-drift
 *
 * After Wave migrations, refresh BASELINE_COUNTS downward (never raise without review).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");

/** Print / PDF / report templates may keep micro type. */
const ALLOWLIST_PATH_RE =
  /(Template|ReportCard|report-cards|GradeSheet|gradesheets|lessonPlanPdf|schedulePdf|Pdf\.tsx$|print|landing\/components\/previews|GradebookPeriodSheet|GradebookSheet)/i;

/**
 * Frozen counts after Phases 2–4 (2026-07-24). Drift fails if any metric
 * exceeds its baseline (new legacy usage). Migrations should lower counts over time.
 * Refresh downward after Wave migrations — never raise without review.
 */
const BASELINE = {
  rounded3xl: 0,
  cardShadowSm: 28,
  text10px: 19,
} as const;

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function countMatches(files: string[], re: RegExp): { total: number; samples: string[] } {
  let total = 0;
  const samples: string[] = [];
  for (const file of files) {
    const rel = path.relative(root, file);
    if (ALLOWLIST_PATH_RE.test(rel)) continue;
    const text = fs.readFileSync(file, "utf8");
    const hits = text.match(re);
    if (hits?.length) {
      total += hits.length;
      if (samples.length < 5) samples.push(`${rel} (${hits.length})`);
    }
  }
  return { total, samples };
}

console.log("=========================================");
console.log(" UI DENSITY DRIFT GUARD");
console.log("=========================================\n");

const files = walk(srcRoot);
assert(files.length > 50, `scanned src files (${files.length})`);

const rounded3xl = countMatches(files, /rounded-3xl/g);
const cardShadowSm = countMatches(
  files,
  /(?:rounded-(?:2xl|3xl|\[32px\]).*?shadow-sm|shadow-sm.*?rounded-(?:2xl|3xl|\[32px\]))/g,
);
// Count card shadow-sm on class strings. Exclude `drop-shadow-sm` (text/icon
// drop shadow utility, unrelated to surface elevation) which would otherwise
// be caught by a naive substring match.
const shadowSm = countMatches(files, /(?<!drop-)shadow-sm/g);
const text10 = countMatches(files, /text-\[10px\]/g);

console.log(`rounded-3xl: ${rounded3xl.total} (baseline ≤ ${BASELINE.rounded3xl})`);
if (rounded3xl.samples.length) console.log("  e.g.", rounded3xl.samples.join(", "));
console.log(`shadow-sm: ${shadowSm.total} (baseline ≤ ${BASELINE.cardShadowSm})`);
if (shadowSm.samples.length) console.log("  e.g.", shadowSm.samples.join(", "));
console.log(`text-[10px]: ${text10.total} (baseline ≤ ${BASELINE.text10px})`);
if (text10.samples.length) console.log("  e.g.", text10.samples.join(", "));

assert(
  rounded3xl.total <= BASELINE.rounded3xl,
  `rounded-3xl drift ${rounded3xl.total} > ${BASELINE.rounded3xl}`,
);
assert(
  shadowSm.total <= BASELINE.cardShadowSm,
  `shadow-sm drift ${shadowSm.total} > ${BASELINE.cardShadowSm}`,
);
assert(
  text10.total <= BASELINE.text10px,
  `text-[10px] drift ${text10.total} > ${BASELINE.text10px}`,
);

// Primitives must exist and avoid legacy recipes
const uiDir = path.join(srcRoot, "components", "ui");
assert(fs.existsSync(path.join(uiDir, "Button.tsx")), "ui/Button.tsx exists");
assert(fs.existsSync(path.join(uiDir, "Field.tsx")), "ui/Field.tsx exists");
assert(fs.existsSync(path.join(uiDir, "Surface.tsx")), "ui/Surface.tsx exists");
assert(fs.existsSync(path.join(uiDir, "PageShell.tsx")), "ui/PageShell.tsx exists");

const uiFiles = walk(uiDir);
const uiLegacy = countMatches(uiFiles, /rounded-3xl|text-\[10px\]/g);
assert(uiLegacy.total === 0, "ui primitives have no rounded-3xl / text-[10px]");

const weakShadow = countMatches(files, /shadow-\[0_4px_20px_rgb\(0,0,0,0\.015\)\]/g);
console.log(`legacy ultra-weak card shadow: ${weakShadow.total} (must be 0)`);
if (weakShadow.samples.length) console.log("  e.g.", weakShadow.samples.join(", "));
assert(weakShadow.total === 0, "no legacy ultra-weak surface shadow (0.015) in src");

const tokensPath = path.join(uiDir, "tokens.ts");
const tokensText = fs.readFileSync(tokensPath, "utf8");
assert(tokensText.includes('smsCanvasClass = "bg-slate-100"'), "tokens smsCanvasClass is slate-100");
assert(tokensText.includes("border-slate-200"), "surfaceClass uses border-slate-200");

const skeleton = fs.readFileSync(path.join(srcRoot, "components", "PageSkeleton.tsx"), "utf8");
assert(!skeleton.includes("rounded-3xl"), "PageSkeleton migrated off rounded-3xl");
assert(!skeleton.includes("shadow-sm"), "PageSkeleton migrated off shadow-sm");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("UI drift guard passed");
process.exit(0);
