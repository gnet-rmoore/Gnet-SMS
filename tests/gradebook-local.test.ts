/**
 * Gradebook local store merge helpers.
 * Run: npx tsx tests/gradebook-local.test.ts
 * (or: node --experimental-strip-types tests/gradebook-local.test.ts)
 */
import {
  clampScore,
  mergeLocalOverServer,
  type LocalGradebookDraft,
} from "../src/features/gradebook/lib/gradebookLocalStore.ts";

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
console.log(" GRADEBOOK LOCAL STORE TESTS");
console.log("=========================================\n");

assert(clampScore("") === null, "empty → null");
assert(clampScore("85") === 85, "85");
assert(clampScore("120", 100) === 100, "clamp high with max 100");
assert(clampScore("15", 10) === 10, "clamp to column max");
assert(clampScore("-5") === 0, "clamp low");

const server = [
  { studentId: "a", grade: 70, updatedAt: "2026-01-01T00:00:00.000Z" },
  { studentId: "b", grade: 80, updatedAt: "2026-01-01T00:00:00.000Z" },
];

const olderLocal: LocalGradebookDraft = {
  version: 1,
  schoolId: "s",
  classId: "c",
  subjectId: "sub",
  examId: "e",
  updatedAt: "2025-12-01T00:00:00.000Z",
  entries: [{ studentId: "a", grade: 99 }],
  pendingSync: false,
};

const olderMerge = mergeLocalOverServer(server, olderLocal);
assert(olderMerge.usedLocal === false, "older local not preferred");
assert(olderMerge.entries.get("a") === 70, "keeps server score");

const pendingLocal: LocalGradebookDraft = {
  ...olderLocal,
  updatedAt: "2025-12-01T00:00:00.000Z",
  pendingSync: true,
  entries: [{ studentId: "a", grade: 91 }],
};
const pendingMerge = mergeLocalOverServer(server, pendingLocal);
assert(pendingMerge.usedLocal === true, "pendingSync prefers local");
assert(pendingMerge.entries.get("a") === 91, "applies local grade");

const newerLocal: LocalGradebookDraft = {
  ...olderLocal,
  updatedAt: "2026-06-01T00:00:00.000Z",
  pendingSync: false,
  entries: [
    { studentId: "a", grade: 88 },
    { studentId: "b", grade: null },
  ],
};
const newerMerge = mergeLocalOverServer(server, newerLocal);
assert(newerMerge.usedLocal === true, "newer local preferred");
assert(newerMerge.entries.get("b") === null, "null grade from local");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All gradebook-local tests passed");
