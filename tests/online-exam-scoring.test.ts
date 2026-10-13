/**
 * Online exam scoring + lockdown helpers.
 * Run: npm run test:online-exam
 */
import {
  computeEndsAt,
  scoreQuestion,
  shouldAutoSubmitForViolations,
  summarizeAttemptScore,
} from "../services/academic/src/lib/onlineExamScoring.ts";
import {
  sampleExamMeta,
  sampleQuestions,
} from "../services/academic/src/lib/onlineExamPreviewSample.ts";

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
console.log(" ONLINE EXAM SCORING TESTS");
console.log("=========================================\n");

const mcq = {
  id: "q1",
  type: "MULTIPLE_CHOICE",
  points: 2,
  choices: [
    { id: "a", isCorrect: false },
    { id: "b", isCorrect: true },
  ],
};

assert(
  scoreQuestion(mcq, { questionId: "q1", selectedChoiceId: "b" }).pointsAwarded === 2,
  "MCQ correct awards points"
);
assert(
  scoreQuestion(mcq, { questionId: "q1", selectedChoiceId: "a" }).isCorrect === false,
  "MCQ wrong is missed"
);

const tf = {
  id: "q2",
  type: "TRUE_FALSE",
  points: 1,
  choices: [
    { id: "t", isCorrect: true },
    { id: "f", isCorrect: false },
  ],
};
assert(
  scoreQuestion(tf, { questionId: "q2", selectedChoiceId: "t" }).isCorrect === true,
  "True/False correct"
);

const blank = {
  id: "q3",
  type: "FILL_BLANK",
  points: 3,
  correctAnswer: "Paris",
  caseSensitive: false,
};
assert(
  scoreQuestion(blank, { questionId: "q3", textAnswer: "  paris " }).isCorrect === true,
  "Fill-blank normalizes case/space"
);
assert(
  scoreQuestion(
    { ...blank, caseSensitive: true },
    { questionId: "q3", textAnswer: "paris" }
  ).isCorrect === false,
  "Fill-blank caseSensitive"
);

const essay = { id: "q4", type: "ESSAY", points: 5 };
assert(scoreQuestion(essay, { questionId: "q4", textAnswer: "long" }).pending === true, "Essay pending");

const summary = summarizeAttemptScore(
  [mcq, tf, blank, essay],
  [
    { questionId: "q1", selectedChoiceId: "b" },
    { questionId: "q2", selectedChoiceId: "f" },
    { questionId: "q3", textAnswer: "Paris" },
    { questionId: "q4", textAnswer: "…" },
  ]
);
assert(summary.passedCount === 2, "passed = MCQ + blank");
assert(summary.missedCount === 1, "missed = TF wrong");
assert(summary.pendingCount === 1, "pending = essay");
assert(summary.score === 5, "score = 2 + 0 + 3");
assert(summary.maxScore === 11, "max includes essay points");

const start = new Date("2026-07-24T10:00:00.000Z");
const examEnd = new Date("2026-07-24T12:00:00.000Z");
const ends = computeEndsAt(start, 30, examEnd);
assert(ends.toISOString() === "2026-07-24T10:30:00.000Z", "endsAt uses duration when shorter");
const endsClamped = computeEndsAt(start, 180, examEnd);
assert(
  endsClamped.toISOString() === examEnd.toISOString(),
  "endsAt clamps to exam endDate"
);

assert(shouldAutoSubmitForViolations(3, 3) === true, "auto-submit at max");
assert(shouldAutoSubmitForViolations(2, 3) === false, "under max no auto-submit");
assert(shouldAutoSubmitForViolations(10, 0) === false, "0 max = unlimited");

const sampleQs = sampleQuestions();
assert(sampleQs.length === 4, "sample preview has 4 questions");
assert(
  sampleQs.every((q) => q.choices.some((c) => c.isCorrect) || q.type === "FILL_BLANK" || q.type === "ESSAY"),
  "sample choice questions include an answer key"
);
const sampleMeta = sampleExamMeta();
assert(sampleMeta.id === "sample", "sample exam uses stable id");

const sampleSummary = summarizeAttemptScore(sampleQs, [
  { questionId: "sample-q1", selectedChoiceId: "sample-q1-b" },
  { questionId: "sample-q2", selectedChoiceId: "sample-q2-t" },
  { questionId: "sample-q3", textAnswer: "  paris " },
  { questionId: "sample-q4", textAnswer: "Evaporation, condensation, precipitation." },
]);
assert(sampleSummary.maxScore === 5, "sample maxScore = 5");
assert(sampleSummary.score === 3, "sample auto-scored score = 3 (MCQ + TF + blank)");
assert(sampleSummary.passedCount === 3, "sample passed = 3");
assert(sampleSummary.missedCount === 0, "sample missed = 0");
assert(sampleSummary.pendingCount === 1, "sample essay pending");

if (failed > 0) {
  console.error(`\n${failed} online-exam assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll online-exam checks passed");
