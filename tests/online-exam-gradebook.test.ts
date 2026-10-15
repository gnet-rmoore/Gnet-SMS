/**
 * Online-exam → gradebook push mapping (Phase 0 correctness fixes).
 * Run: npx tsx tests/online-exam-gradebook.test.ts
 */
import {
  computeScorePercent,
  resolveExamGradeColumn,
  resolvePublishScore,
  scaleScoreToColumn,
  shouldSkipManualEntry,
} from "../services/academic/src/lib/onlineExamGradebook.ts";
import { serializeAssessmentStructure } from "../services/academic/src/lib/assessmentStructure.ts";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    failed += 1;
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

console.log("=========================================");
console.log(" ONLINE EXAM GRADEBOOK PUSH TESTS");
console.log("=========================================\n");

// --- resolveExamGradeColumn: array-shaped structure (the B1 regression) ---
const arrayShaped = serializeAssessmentStructure([
  { id: "hw", shortCode: "HW", componentType: "ASSIGNMENT", weightPct: 20 },
  { id: "exam", shortCode: "EXAM", componentType: "EXAM", weightPct: 50 },
]);
const arrayCol = resolveExamGradeColumn(
  { gradebookStructure: arrayShaped, gradebookStructureCustom: true },
  null
);
assert(arrayCol?.id === "exam", "resolves EXAM column from array-shaped structure");

// guard against the old { columns } assumption: parsing array JSON has no .columns
assert(
  !(JSON.parse(arrayShaped) as any).columns,
  "serialized structure is a bare array (regression guard)"
);

// --- resolveExamGradeColumn: object { columns } shaped structure ---
const objectShaped = JSON.stringify({
  columns: [
    { id: "cw", code: "CW", componentType: "CLASSWORK", weightPct: 30 },
    { id: "qz", code: "QZ", componentType: "QUIZ", weightPct: 70 },
  ],
});
const objectCol = resolveExamGradeColumn(
  { gradebookStructure: objectShaped, gradebookStructureCustom: true, componentType: "QUIZ" },
  null
);
assert(objectCol?.id === "qz", "resolves QUIZ column from { columns } structure");

// --- fallback: no EXAM-like column → last column, still non-null id ---
const onlyCw = serializeAssessmentStructure([
  { id: "cw", shortCode: "CW", componentType: "CLASSWORK", weightPct: 100 },
]);
const fallbackCol = resolveExamGradeColumn(
  { gradebookStructure: onlyCw, gradebookStructureCustom: true },
  null
);
assert(fallbackCol?.id === "cw", "falls back to last column when no EXAM column");

assert(
  resolveExamGradeColumn(null, null) === null,
  "no component → null column"
);

// --- school template drives columns when component structure is not custom ---
const schoolConfig = JSON.stringify([
  { shortCode: "QZ", componentType: "QUIZ", weightPct: 40 },
  { shortCode: "EX", componentType: "EXAM", weightPct: 60 },
]);
const schoolCol = resolveExamGradeColumn(
  { gradebookStructure: null, gradebookStructureCustom: false, componentType: "EXAM" },
  schoolConfig
);
assert(schoolCol?.id === "EX", "school template EXAM column resolved by component type");

// component type disambiguates QUIZ vs EXAM when both columns exist
const quizCol = resolveExamGradeColumn(
  { gradebookStructure: null, gradebookStructureCustom: false, componentType: "QUIZ" },
  schoolConfig
);
assert(quizCol?.id === "QZ", "component type pins QUIZ column over EXAM");

// --- resolvePublishScore: last / best / average ---
const attempts = [
  { score: 30, maxScore: 50 }, // 60%
  { score: 40, maxScore: 50 }, // 80%
  { score: 10, maxScore: 50 }, // 20%
];

const last = resolvePublishScore({ retakePolicy: null }, attempts[2], attempts);
assert(last.score === 10 && last.maxScore === 50, "no policy → uses this attempt (last)");

const bestPolicy = JSON.stringify({ maxRetakes: 3, scoreRetention: "best" });
const best = resolvePublishScore({ retakePolicy: bestPolicy }, attempts[2], attempts);
assert(best.score === 40 && best.maxScore === 50, "best retention picks highest %");

const avgPolicy = JSON.stringify({ maxRetakes: 3, scoreRetention: "average" });
const avg = resolvePublishScore({ retakePolicy: avgPolicy }, attempts[2], attempts);
assert(
  Math.abs(avg.score - 53.33) < 0.01 && avg.maxScore === 100,
  "average retention returns avg % out of 100"
);

const single = resolvePublishScore({ retakePolicy: bestPolicy }, attempts[0], [attempts[0]]);
assert(single.score === 30 && single.maxScore === 50, "single attempt → no aggregation");

const malformed = resolvePublishScore({ retakePolicy: "{not json" }, attempts[1], attempts);
assert(malformed.score === 40 && malformed.maxScore === 50, "malformed policy → last fallback");

// --- scaleScoreToColumn: scale raw points onto the column denominator ---
const examColumn = { id: "exam", shortCode: "EXAM", componentType: "EXAM", weightPct: 50 };
// 40/40 = 100% → EXAM column default max 50 → 50 points
assert(
  scaleScoreToColumn(40, 40, examColumn as any) === 50,
  "40/40 scales to full 50-pt exam column"
);
// 20/40 = 50% → 25 points
assert(
  scaleScoreToColumn(20, 40, examColumn as any) === 25,
  "20/40 scales to 25 on 50-pt column"
);
// no column → raw unchanged
assert(
  scaleScoreToColumn(20, 40, null) === 20,
  "no column → raw points unchanged"
);
// no denominator → raw unchanged
assert(
  scaleScoreToColumn(20, 0, examColumn as any) === 20,
  "zero denominator → raw points unchanged"
);

// --- computeScorePercent (provenance) ---
assert(computeScorePercent(40, 40) === 100, "40/40 → 100%");
assert(computeScorePercent(20, 40) === 50, "20/40 → 50%");
assert(computeScorePercent(1, 3) === 33.33, "1/3 → 33.33% (2-dec)");
assert(computeScorePercent(5, 0) === null, "zero denominator → null percent");

// --- shouldSkipManualEntry (auto-post must not clobber human grades) ---
assert(!shouldSkipManualEntry(null, { skipManualEntry: true }), "no existing → never skip");
assert(
  !shouldSkipManualEntry({ source: "ONLINE_EXAM" }, { skipManualEntry: true }),
  "existing online-exam entry is re-postable"
);
assert(
  shouldSkipManualEntry({ source: "MANUAL" }, { skipManualEntry: true }),
  "existing manual entry is skipped"
);
assert(
  shouldSkipManualEntry({ source: "IMPORT" }, { skipManualEntry: true }),
  "existing imported entry is skipped"
);
assert(
  !shouldSkipManualEntry({ source: "MANUAL" }, { skipManualEntry: true, force: true }),
  "force overrides the manual-entry guard"
);
assert(
  !shouldSkipManualEntry({ source: "MANUAL" }, { skipManualEntry: false }),
  "guard disabled → does not skip"
);
assert(
  !shouldSkipManualEntry({ source: null }, { skipManualEntry: true }),
  "entry without source is treated as safe to update"
);

if (failed > 0) {
  console.error(`\n${failed} gradebook-push assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll gradebook-push checks passed");
