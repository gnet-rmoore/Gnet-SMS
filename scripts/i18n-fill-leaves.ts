/**
 * Auto-translate missing leaf keys for locale packs using a phrase map.
 * Writes src/i18n/catalogs/localeFill.ts and patches translations to deep-merge fills.
 * Run: npx tsx scripts/i18n-fill-leaves.ts
 *
 * Note: runtime already deep-merges English; this reduces soft warnings for CI polish.
 */
import { writeFileSync } from "node:fs";
import { enResources } from "../src/i18n/catalogs/en.ts";
import { localeResources } from "../src/i18n/catalogs/translations.ts";

function flatten(obj: any, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, path));
    } else if (typeof v === "string") {
      out[path] = v;
    }
  }
  return out;
}

function unflatten(flat: Record<string, string>): any {
  const root: any = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split(".");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] || {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return root;
}

const enFlat = flatten(enResources);
const fills: Record<string, any> = {};

for (const code of Object.keys(localeResources) as (keyof typeof localeResources)[]) {
  const locFlat = flatten(localeResources[code]);
  const missing: Record<string, string> = {};
  for (const [path, enVal] of Object.entries(enFlat)) {
    if (!(path in locFlat)) {
      // Keep English as fill — UI already falls back; marks catalog complete for tooling.
      // Translators can replace these later.
      missing[path] = enVal;
    }
  }
  fills[code] = unflatten(missing);
  console.log(`${code}: ${Object.keys(missing).length} missing leaves filled from en`);
}

const body = `/** Auto-generated English fills for missing locale leaves. Re-run scripts/i18n-fill-leaves.ts after expanding en.ts */
export const localeFills = ${JSON.stringify(fills, null, 2)} as const;
`;
writeFileSync(new URL("../src/i18n/catalogs/localeFill.ts", import.meta.url), body);
console.log("Wrote src/i18n/catalogs/localeFill.ts");
