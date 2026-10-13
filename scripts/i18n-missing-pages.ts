/**
 * Report pages.* keys used in SPA that are missing from enResources.pages.
 * Run: npx tsx scripts/i18n-missing-pages.ts
 */
import fs from "fs";
import path from "path";
import { enResources } from "../src/i18n/catalogs/en.ts";

function getPath(obj: unknown, p: string): unknown {
  return p.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = [...walk("src/features"), ...walk("src/pages")];
const keyRe = /\bt\(\s*["']([a-zA-Z][a-zA-Z0-9_.]*)["']/g;
const keys = new Set<string>();

for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  let m: RegExpExecArray | null;
  while ((m = keyRe.exec(text))) {
    const k = m[1];
    if (k.includes(":")) continue;
    if (/^(common|nav|auth|errors|roles|public)\./.test(k)) continue;
    // Public marketing + common sync helpers live outside `pages`
    if (/^(landing|sync)\./.test(k)) continue;
    if (k === "preview" || k === "selected") continue;
    keys.add(k);
  }
}

const pages = enResources.pages;
const common = enResources.common as Record<string, unknown>;
const missing = [...keys]
  .filter((k) => getPath(pages, k) === undefined)
  .filter((k) => getPath(common, k) === undefined)
  .sort();
const groups: Record<string, string[]> = {};
for (const k of missing) {
  const g = k.split(".")[0];
  (groups[g] ||= []).push(k);
}

console.log(`Missing pages keys: ${missing.length}`);
for (const [g, list] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n# ${g} (${list.length})`);
  for (const k of list) console.log(`  ${k}`);
}

if (missing.length) process.exitCode = 1;
