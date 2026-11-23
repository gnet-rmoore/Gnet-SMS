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
  pickEntranceFeeTemplate,
  scopeSnapshotJson,
  staleScopeMismatchMessage,
} from "../services/finance/src/lib/feeScope.ts";
import { serializeBillingSettings } from "../services/finance/src/lib/feePaymentMath.ts";

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
assert(normalizeScopeMode("class") === "CLASS", "normalize CLASS");
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

const class8A = {
  scopeMode: "CLASS" as const,
  classroomId: "c8a",
  cohort: "ALL" as const,
  name: "Grade 8A",
};

assert(
  feeScopeMismatchMessage(class8A, {
    id: "s9",
    classroomId: "c8a",
    feeCohort: "RETURNING",
  }) === null,
  "class match"
);

assert(
  !!feeScopeMismatchMessage(class8A, {
    id: "s10",
    classroomId: "c8b",
  }),
  "class mismatch rejected"
);

assert(
  !!feeScopeMismatchMessage(class8A, {
    id: "s11",
    feeCohort: "NEW",
  }),
  "missing classroom rejected"
);

const classSnapshot = parseScopeSnapshot(scopeSnapshotJson(class8A));
assert(classSnapshot?.scopeMode === "CLASS", "snapshot round-trip class mode");
assert(classSnapshot?.classroomId === "c8a", "snapshot round-trip classroom");

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

const entranceTemplates = [
  { id: "school", scopeMode: "SCHOOL", cohort: "ALL" },
  { id: "division", scopeMode: "DIVISION", divisionId: "high", cohort: "ALL" },
  { id: "grade", scopeMode: "GRADE", gradeLevelId: "g8", cohort: "ALL" },
  { id: "class", scopeMode: "CLASS", classroomId: "c8a", cohort: "ALL" },
  { id: "archived-class", scopeMode: "CLASS", classroomId: "c8a", cohort: "ALL", active: false },
];

assert(
  pickEntranceFeeTemplate(entranceTemplates, {
    classroomId: "c8a",
    gradeLevelId: "g8",
    divisionId: "high",
    cohort: "NEW",
  })?.id === "class",
  "CLASS scope wins entrance precedence"
);
assert(
  pickEntranceFeeTemplate(entranceTemplates, {
    classroomId: "other",
    gradeLevelId: "g8",
    divisionId: "high",
  })?.id === "grade",
  "GRADE scope wins when CLASS does not match"
);
assert(
  pickEntranceFeeTemplate(entranceTemplates, {
    gradeLevelId: "other",
    divisionId: "high",
  })?.id === "division",
  "DIVISION scope wins when GRADE does not match"
);
assert(
  pickEntranceFeeTemplate(entranceTemplates, { divisionId: "other" })?.id === "school",
  "SCHOOL scope is the final fallback"
);
assert(
  pickEntranceFeeTemplate(
    [{ id: "archived", scopeMode: "CLASS", classroomId: "c8a", cohort: "ALL", active: false }],
    { classroomId: "c8a" }
  ) === null,
  "archived templates are ignored"
);

const cohortTemplates = [
  { id: "general", scopeMode: "CLASS", classroomId: "c8a", cohort: "ALL" },
  { id: "new", scopeMode: "CLASS", classroomId: "c8a", cohort: "NEW" },
  { id: "returning", scopeMode: "CLASS", classroomId: "c8a", cohort: "RETURNING" },
];

assert(
  pickEntranceFeeTemplate(cohortTemplates, { classroomId: "c8a", cohort: "new" })?.id === "new",
  "cohort-specific template preferred"
);
assert(
  pickEntranceFeeTemplate(cohortTemplates, {
    classroomId: "c8a",
    cohort: "returning",
  })?.id === "returning",
  "returning cohort template preferred"
);
assert(
  pickEntranceFeeTemplate(
    [
      { id: "general", scopeMode: "CLASS", classroomId: "c8a", cohort: "ALL" },
      { id: "new", scopeMode: "CLASS", classroomId: "c8a", cohort: "NEW" },
    ],
    { classroomId: "c8a", cohort: "unknown" }
  )?.id === "general",
  "ALL-cohort template preferred when cohort is unknown"
);

const defaultSettings = serializeBillingSettings("s1", null);
assert(defaultSettings.entranceFeesEnabled === false, "entrance fees default to disabled");
assert(defaultSettings.minPaymentAmount === 1, "default minimum payment serialized");

const enabledSettings = serializeBillingSettings("s1", {
  minPaymentAmount: 2.5,
  entranceFeesEnabled: true,
});
assert(enabledSettings.entranceFeesEnabled === true, "entrance fees switch serialized");
assert(enabledSettings.minPaymentAmount === 2.5, "minimum payment serialized");

console.log("\n=========================================");
if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}
console.log("All fee-scope tests passed");
