/**
 * Fee scope eligibility helpers (Finance).
 * Run: npx tsx tests/fee-scope.test.ts
 */
import {
  assertFeeScopeEligible,
  feeScopeMismatchMessage,
  normalizeCohort,
  normalizeScopeMode,
  parseScopeSnapshot,
  scopeSnapshotJson,
  staleScopeMismatchMessage,
} from "../services/finance/src/lib/feeScope.ts";

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
console.log(" FEE SCOPE UNIT TESTS");
console.log("=========================================\n");

assert(normalizeScopeMode(undefined) === "SCHOOL", "default scope SCHOOL");
assert(normalizeScopeMode("grade") === "GRADE", "normalize GRADE");
assert(normalizeScopeMode("DIVISION") === "DIVISION", "normalize DIVISION");
assert(normalizeCohort(null) === "ALL", "default cohort ALL");
assert(normalizeCohort("new") === "NEW", "normalize NEW");

const grade8New = {
  scopeMode: "GRADE" as const,
  gradeLevelId: "g8",
  cohort: "NEW" as const,
  name: "Grade 8 New",
};

assert(
  feeScopeMismatchMessage(grade8New, {
    id: "s1",
    name: "Ada",
    gradeLevelId: "g8",
    feeCohort: "NEW",
  }) === null,
  "Grade 8 New matches"
);

assert(
  !!feeScopeMismatchMessage(grade8New, {
    id: "s2",
    name: "Bob",
    gradeLevelId: "g7",
    feeCohort: "NEW",
    gradeLevelName: "Grade 7",
  }),
  "wrong grade rejected"
);

assert(
  !!feeScopeMismatchMessage(grade8New, {
    id: "s3",
    name: "Cara",
    gradeLevelId: "g8",
    feeCohort: "RETURNING",
  }),
  "wrong cohort rejected"
);

assert(
  feeScopeMismatchMessage(
    { scopeMode: "SCHOOL", cohort: "ALL" },
    { id: "s4", gradeLevelId: "g1", feeCohort: "RETURNING" }
  ) === null,
  "SCHOOL scope always eligible"
);

const hs = {
  scopeMode: "DIVISION" as const,
  divisionId: "high",
  cohort: "ALL" as const,
  name: "High School",
};

assert(
  feeScopeMismatchMessage(hs, {
    id: "s5",
    divisionId: "high",
    feeCohort: "NEW",
  }) === null,
  "division match"
);

assert(
  !!feeScopeMismatchMessage(hs, {
    id: "s6",
    divisionId: "elem",
    divisionName: "Elementary",
    feeCohort: "NEW",
  }),
  "division mismatch rejected"
);

try {
  assertFeeScopeEligible(grade8New, {
    id: "s7",
    gradeLevelId: "g7",
    feeCohort: "NEW",
  });
  assert(false, "assertFeeScopeEligible should throw");
} catch (err: any) {
  assert(err.code === "FEE_SCOPE_MISMATCH", "FEE_SCOPE_MISMATCH code");
  assert(err.status === 409, "409 status");
}

const snap = scopeSnapshotJson(grade8New);
const parsed = parseScopeSnapshot(snap);
assert(parsed?.scopeMode === "GRADE", "snapshot round-trip mode");
assert(parsed?.gradeLevelId === "g8", "snapshot round-trip grade");
assert(
  !!staleScopeMismatchMessage(parsed!, {
    id: "s8",
    gradeLevelId: "g9",
    feeCohort: "NEW",
  }),
  "stale scope detects grade change"
);

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All fee-scope tests passed");
