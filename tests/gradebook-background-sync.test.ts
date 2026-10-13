/**
 * Background sync for all pending gradebook drafts.
 * Run: npx tsx tests/gradebook-background-sync.test.ts
 */

const storage = new Map<string, string>();
const g = globalThis as typeof globalThis & { localStorage?: Storage; window?: Window };
g.localStorage = {
  get length() {
    return storage.size;
  },
  key(i: number) {
    return [...storage.keys()][i] ?? null;
  },
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => {
    storage.set(k, v);
  },
  removeItem: (k: string) => {
    storage.delete(k);
  },
  clear: () => storage.clear(),
};
g.window = g.window || ({} as Window);
g.window.dispatchEvent = g.window.dispatchEvent || (() => true);

import {
  countPendingGradebookDrafts,
  listPendingGradebookDrafts,
  scopesMatch,
} from "../src/features/gradebook/lib/gradebookBackgroundSync.ts";
import { writeGradebookDraft, clearGradebookDraft } from "../src/features/gradebook/lib/gradebookLocalStore.ts";

const SCHOOL = "school-bg-test";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed++;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

function cleanup() {
  storage.clear();
}

console.log("=========================================");
console.log(" GRADEBOOK BACKGROUND SYNC TESTS");
console.log("=========================================\n");

cleanup();

writeGradebookDraft({
  version: 1,
  schoolId: SCHOOL,
  classId: "class-a",
  subjectId: "sub-math",
  examComponentId: "assess-1",
  examId: null,
  updatedAt: new Date().toISOString(),
  pendingSync: true,
  entries: [{ studentId: "s1", grade: 8, structureColumnId: "hw1" }],
});

writeGradebookDraft({
  version: 1,
  schoolId: SCHOOL,
  classId: "class-b",
  subjectId: "sub-science",
  examComponentId: "assess-2",
  examId: null,
  updatedAt: new Date().toISOString(),
  pendingSync: true,
  entries: [{ studentId: "s2", grade: 9, structureColumnId: "hw1" }],
});

writeGradebookDraft({
  version: 1,
  schoolId: SCHOOL,
  classId: "class-c",
  subjectId: "sub-english",
  examId: "exam-1",
  examComponentId: null,
  updatedAt: new Date().toISOString(),
  pendingSync: false,
  entries: [{ studentId: "s3", grade: 70 }],
});

assert(listPendingGradebookDrafts(SCHOOL).length === 2, "lists 2 pending drafts");
assert(countPendingGradebookDrafts(SCHOOL) === 2, "counts 2 pending");

assert(
  scopesMatch(
    { schoolId: SCHOOL, classId: "class-a", examComponentId: "assess-1" },
    { schoolId: SCHOOL, classId: "class-a", examComponentId: "assess-1" }
  ),
  "scopes match same draft"
);

assert(
  countPendingGradebookDrafts(SCHOOL, {
    schoolId: SCHOOL,
    classId: "class-a",
    examComponentId: "assess-1",
  }) === 1,
  "exclude one scope leaves 1 pending"
);

clearGradebookDraft({
  schoolId: SCHOOL,
  classId: "class-a",
  examComponentId: "assess-1",
});
clearGradebookDraft({
  schoolId: SCHOOL,
  classId: "class-b",
  examComponentId: "assess-2",
});
clearGradebookDraft({
  schoolId: SCHOOL,
  classId: "class-c",
  examId: "exam-1",
});

cleanup();

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All gradebook-background-sync tests passed");
