import { fetchAllItems, unwrapItems, unwrapTotal } from "../src/lib/apiEnvelope.ts";

let failed = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    failed += 1;
  } else {
    console.log(`PASSED: ${message}`);
  }
}

const rows = [{ id: "one" }, { id: "two" }];
assert(unwrapItems(rows).length === 2, "keeps array-shaped responses");
assert(unwrapItems<{ id: string }>({ items: rows, total: 2 })[0]?.id === "one", "unwraps paged items");
assert(unwrapItems({ items: "invalid" }).length === 0, "returns empty for malformed items");
assert(unwrapItems(null).length === 0, "returns empty for null");
assert(unwrapTotal({ total: 4 }) === 4, "unwraps total");
assert(unwrapTotal({ total: "4" }, 2) === 2, "uses fallback for invalid total");

const pages = [
  { items: [{ id: "one" }, { id: "two" }], total: 3 },
  { items: [{ id: "three" }], total: 3 },
];
const all = await fetchAllItems<{ id: string }>(async (page) => pages[page - 1]);
assert(all.map((row) => row.id).join(",") === "one,two,three", "loads all pages until total is reached");

if (failed) process.exit(1);
console.log("All API envelope tests passed");
