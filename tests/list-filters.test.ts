/**
 * Unit tests for list-filter URL encode/decode, API serializer, logic, saved views helpers.
 */
import assert from "node:assert/strict";
import {
  applyListQueryToSearchParams,
  parseListQueryFromSearchParams,
  toApiParams,
} from "../src/features/list-filters/urlState";
import { countActiveFilters, isFilterValueActive } from "../src/features/list-filters/types";
import {
  encodeFilterLogic,
  parseFilterLogic,
  matchFilterLogic,
} from "../src/features/list-filters/filterLogic";

assert.equal(isFilterValueActive(""), false);
assert.equal(isFilterValueActive("ALL"), false);
assert.equal(isFilterValueActive("PAID"), true);
assert.equal(countActiveFilters({ status: "PAID", method: "" }, "ama"), 2);
assert.equal(countActiveFilters({ status: "" }, ""), 0);

const keys = ["status", "method", "from", "to"];
const params = new URLSearchParams("tab=history&q=ama&status=PAID&page=2&pageSize=25");
const state = parseListQueryFromSearchParams(params, keys, { pageSize: 50 });
assert.equal(state.q, "ama");
assert.equal(state.values.status, "PAID");
assert.equal(state.page, 2);
assert.equal(state.pageSize, 25);

const next = new URLSearchParams("tab=history");
applyListQueryToSearchParams(
  next,
  {
    q: "bob",
    values: { status: "PARTIAL", method: "", from: "2026-01-01", to: "" },
    page: 1,
    pageSize: 50,
  },
  keys,
  { defaultPageSize: 50 }
);
assert.equal(next.get("tab"), "history");
assert.equal(next.get("q"), "bob");
assert.equal(next.get("status"), "PARTIAL");
assert.equal(next.get("from"), "2026-01-01");
assert.equal(next.get("method"), null);
assert.equal(next.get("page"), null);

const api = toApiParams(
  {
    q: "x",
    values: { status: "PAID", method: "ALL" },
    page: 3,
    pageSize: 50,
  },
  ["status", "method"]
);
assert.equal(api.q, "x");
assert.equal(api.status, "PAID");
assert.equal(api.method, undefined);
assert.equal(api.page, 3);

const encoded = encodeFilterLogic({
  logic: "OR",
  clauses: [
    { field: "level", op: "eq", value: "ERROR" },
    { field: "details", op: "contains", value: "timeout" },
  ],
});
assert.equal(encoded.logic, "OR");
assert.equal(encoded.c0, "level:eq:ERROR");
assert.equal(encoded.c1, "details:contains:timeout");

const parsed = parseFilterLogic({
  logic: "AND",
  c0: "module:eq:AUTH",
  c1: "action:contains:login",
});
assert.equal(parsed.logic, "AND");
assert.equal(parsed.clauses.length, 2);
assert.equal(
  matchFilterLogic({ module: "AUTH", action: "User login" }, parsed),
  true
);
assert.equal(
  matchFilterLogic({ module: "AUTH", action: "logout" }, parsed),
  false
);

import {
  pageRange,
  totalPages,
  canNextPage,
  canPrevPage,
  slicePage,
  toLimitOffset,
} from "../src/features/list-filters/paginate";

assert.deepEqual(pageRange(0, 1, 50), { from: 0, to: 0 });
assert.deepEqual(pageRange(120, 2, 50), { from: 51, to: 100 });
assert.deepEqual(pageRange(55, 2, 50), { from: 51, to: 55 });
assert.equal(totalPages(0, 50), 1);
assert.equal(totalPages(101, 50), 3);
assert.equal(canPrevPage(1), false);
assert.equal(canPrevPage(2), true);
assert.equal(canNextPage(100, 2, 50), false);
assert.equal(canNextPage(101, 2, 50), true);
assert.deepEqual(slicePage([1, 2, 3, 4, 5], 2, 2), [3, 4]);
assert.deepEqual(toLimitOffset(3, 25), { limit: 25, offset: 50 });

console.log("PASSED: list-filter URL + serializer + logic + pagination contracts");
console.log("\n=========================================");
console.log("All list-filter tests passed");
