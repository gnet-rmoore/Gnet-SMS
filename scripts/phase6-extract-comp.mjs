#!/usr/bin/env node
/**
 * Phase 6: extract JSX line ranges into presentational components.
 *
 * node scripts/phase6-extract-comp.mjs <feature> <ComponentName> <start> <end> [--strip-cond]
 *
 * --strip-cond: remove outer `{foo && (` ... `)}` wrapper so the parent keeps the condition.
 */
import fs from "fs";
import path from "path";

const [,, feature, name, startStr, endStr, ...flags] = process.argv;
const stripCond = flags.includes("--strip-cond");
const start = Number(startStr);
const end = Number(endStr);

const pagePath = path.join("src/features", feature, "Page.tsx");
const page = fs.readFileSync(pagePath, "utf8");
const lines = page.split("\n");
let body = lines.slice(start - 1, end).join("\n");

if (stripCond) {
  // Remove first line like `      {showX && (` or `      {selectedX && (`
  body = body.replace(/^\s*\{[^{}\n]+&&\s*\(\s*\n/, "");
  // Remove trailing `      )}`
  body = body.replace(/\n\s*\)\}\s*$/, "");
}

// Collect likely free identifiers from the Page (state, setters, handlers, consts)
const pageIdents = new Set();
const idPatterns = [
  /\bconst\s+\[(\w+),\s*(set\w+)\]/g,
  /\bconst\s+(handle\w+|fetch\w+|load\w+|open\w+|parse\w+|save\w+)\s*=/g,
  /\bconst\s+(\w+)\s*=\s*use/g,
  /\bfunction\s+(\w+)/g,
];
for (const re of idPatterns) {
  let m;
  while ((m = re.exec(page))) {
    for (let i = 1; i < m.length; i++) if (m[i]) pageIdents.add(m[i]);
  }
}
// Also common imports used in JSX
["format", "school", "user", "accessToken", "motion", "AnimatePresence"].forEach((x) => pageIdents.add(x));

// Icons / components used as JSX tags or as values with className
const used = new Set();
const wordRe = /\b([A-Za-z_][A-Za-z0-9_]*)\b/g;
let m;
while ((m = wordRe.exec(body))) {
  const w = m[1];
  if (pageIdents.has(w)) used.add(w);
  // Lucide icons and similar: Capitalized identifiers appearing before className or as <Icon
  if (/^[A-Z]/.test(w) && w !== "React" && (body.includes(`<${w}`) || body.includes(`${w} className`) || body.includes(`${w} size`))) {
    used.add(w);
  }
}

// Always include format if used
if (/\bformat\(/.test(body)) used.add("format");

const props = [...used].filter((w) => !["true", "false", "null", "undefined", "String", "Number", "Date", "JSON", "Math", "Object", "Array", "Promise", "Error", "console", "window", "localStorage", "document"].includes(w)).sort();

// Detect lucide icons to import
const lucideCandidates = props.filter((p) => /^[A-Z]/.test(p) && page.includes(`  ${p},`) || page.includes(`\n  ${p}\n`) || page.match(new RegExp(`\\b${p}\\b`)));
const lucideImportMatch = page.match(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/);
const allLucide = lucideImportMatch
  ? lucideImportMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
  : [];
const lucideUsed = allLucide.filter((i) => body.includes(i));

const needsFormat = body.includes("format(");
const needsMotion = body.includes("motion.");
const needsAnimate = body.includes("AnimatePresence");

const imports = [];
imports.push(`import React from "react";`);
if (lucideUsed.length) {
  imports.push(`import {\n  ${lucideUsed.join(",\n  ")}\n} from "lucide-react";`);
}
if (needsFormat) imports.push(`import { format } from "date-fns";`);
if (needsMotion || needsAnimate) {
  const parts = [];
  if (needsMotion) parts.push("motion");
  if (needsAnimate) parts.push("AnimatePresence");
  imports.push(`import { ${parts.join(", ")} } from "motion/react";`);
}

// Props type: exclude things we import locally
const localNames = new Set(["format", "motion", "AnimatePresence", ...lucideUsed]);
const propNames = props.filter((p) => !localNames.has(p));

const file = `${imports.join("\n")}

export type ${name}Props = {
${propNames.map((p) => `  ${p}?: any;`).join("\n")}
  [key: string]: any;
};

/** Presentational extract from Page.tsx lines ${start}-${end}. */
export function ${name}({
${propNames.map((p) => `  ${p},`).join("\n")}
}: ${name}Props) {
  return (
${body.split("\n").map((l) => "    " + l).join("\n")}
  );
}
`;

const outDir = path.join("src/features", feature, "components");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${name}.tsx`);
fs.writeFileSync(outPath, file);
console.log(JSON.stringify({ outPath, propNames, lucideUsed, lines: end - start + 1 }, null, 2));
