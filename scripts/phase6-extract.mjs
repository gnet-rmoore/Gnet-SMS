#!/usr/bin/env node
/**
 * Phase 6 helper: extract line ranges from Page.tsx into component files,
 * then replace those ranges with a placeholder comment for manual JSX swap.
 *
 * Usage:
 *   node scripts/phase6-extract.mjs <feature> <ComponentName> <startLine> <endLine>
 * Lines are 1-indexed inclusive.
 */
import fs from "fs";
import path from "path";

const [,, feature, componentName, startStr, endStr] = process.argv;
if (!feature || !componentName || !startStr || !endStr) {
  console.error("Usage: node scripts/phase6-extract.mjs <feature> <ComponentName> <start> <end>");
  process.exit(1);
}

const start = Number(startStr);
const end = Number(endStr);
const pagePath = path.join("src/features", feature, "Page.tsx");
const lines = fs.readFileSync(pagePath, "utf8").split("\n");
const slice = lines.slice(start - 1, end);
const outDir = path.join("src/features", feature, "components");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${componentName}.tsx`);

const body = slice.join("\n");
fs.writeFileSync(outPath, `// EXTRACTED from Page.tsx lines ${start}-${end}\n// Wrap as a proper component with props before use.\n\n${body}\n`);
console.log(`Wrote ${outPath} (${slice.length} lines)`);
