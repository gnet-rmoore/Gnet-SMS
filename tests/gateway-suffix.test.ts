/**
 * Gateway school-suffix map completeness vs API route inventory.
 * Run: npm run test:gateway
 */
import fs from "node:fs";
import path from "node:path";
import { createAssert } from "./helpers/assert.ts";

const root = process.cwd();
const { assert, summary } = createAssert();

function parseSuffixMap(src: string): Set<string> {
  const m = src.match(
    /const SCHOOL_SUFFIX_TO_SERVICE:\s*Record<string,\s*ServiceKey>\s*=\s*\{([\s\S]*?)\n\};/
  );
  if (!m) throw new Error("Could not parse SCHOOL_SUFFIX_TO_SERVICE");
  const keys = new Set<string>();
  for (const km of m[1].matchAll(/^\s*(?:["']([^"']+)["']|([A-Za-z0-9_-]+))\s*:/gm)) {
    keys.add(km[1] ?? km[2]);
  }
  // empty string key ""
  if (/^\s*""\s*:/m.test(m[1]) || /^\s*'':/m.test(m[1])) keys.add("");
  return keys;
}

function schoolSuffixesFromInventory(): Set<string> {
  const invPath = path.join(root, "docs/generated/api-endpoint-inventory.json");
  if (!fs.existsSync(invPath)) {
    throw new Error("Missing api-endpoint-inventory.json — run npm run inventory:api");
  }
  const inv = JSON.parse(fs.readFileSync(invPath, "utf8"));
  const suffixes = new Set<string>();
  for (const e of inv.endpoints as { path: string; internal?: boolean }[]) {
    if (e.internal) continue;
    const m = e.path.match(/^\/api\/schools\/:[^/]+\/([^/:?]+)/);
    if (m) suffixes.add(m[1]);
  }
  return suffixes;
}

console.log("=========================================");
console.log(" GATEWAY SUFFIX COMPLETENESS");
console.log("=========================================\n");

const gatewaySrc = fs.readFileSync(
  path.join(root, "services/gateway/src/server.ts"),
  "utf8"
);
const mapKeys = parseSuffixMap(gatewaySrc);
const fromRoutes = schoolSuffixesFromInventory();

assert(mapKeys.has("documents"), "map includes documents → comms");
assert(mapKeys.has("classrooms"), "map includes classrooms → classroom");
assert(mapKeys.has("leave-requests"), "map includes leave-requests → staff");
assert(mapKeys.has("fees"), "map includes fees → finance");
assert(mapKeys.has("fee-payment-txns"), "map includes fee-payment-txns → finance");
assert(mapKeys.has("fee-billing-settings"), "map includes fee-billing-settings → finance");
assert(mapKeys.has("receipt-template"), "map includes receipt-template → identity");

const missing: string[] = [];
for (const s of fromRoutes) {
  if (!mapKeys.has(s)) missing.push(s);
}

assert(
  missing.length === 0,
  missing.length === 0
    ? `all ${fromRoutes.size} school suffixes mapped`
    : `unmapped school suffixes: ${missing.join(", ")}`
);

// Known public prefixes should still resolve via special-case (not suffix map)
assert(
  /\/api\/auth\/login/.test(gatewaySrc),
  "gateway special-cases auth login"
);

summary("gateway-suffix");
