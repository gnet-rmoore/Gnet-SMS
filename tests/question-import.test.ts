/**
 * Exam/quiz question import + normalization rules.
 * Imports the REAL shared lib (no mirrored logic) so the manual editor and the
 * spreadsheet import can never drift.
 * Run: npm run test:question-import
 */
import {
  canonicalHeaderKey,
  isRowEmpty,
  MAX_QUESTIONS,
  normalizeQuestion,
  QUESTION_IMPORT_HEADERS,
  serializeImportRows,
  validateImportRows,
  type NormalizedQuestion,
} from "../services/academic/src/lib/questionImport.ts";
import {
  QUESTION_TEMPLATE_EXAMPLES,
  QUESTION_TEMPLATE_HEADERS,
} from "../src/features/online-exam/parseQuestionSheet.ts";
import { prepareQuestionBankImport } from "../src/features/online-exam/questionBankImport.ts";

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
console.log(" QUESTION IMPORT TESTS");
console.log("=========================================\n");

// ---------------------------------------------------------------------------
// normalizeQuestion — the shared core used by manual save AND import
// ---------------------------------------------------------------------------

const mcqRaw = {
  type: "MULTIPLE_CHOICE",
  prompt: "Capital of France?",
  points: 2,
  choices: [
    { label: "A", text: "Paris", isCorrect: true },
    { label: "B", text: "London", isCorrect: false },
    { label: "C", text: "Rome", isCorrect: false },
    { label: "D", text: "Madrid", isCorrect: false },
  ],
};

{
  const r = normalizeQuestion(mcqRaw, 0);
  assert(r.ok, "normalizeQuestion accepts a valid MCQ");
  assert(r.normalized?.orderIndex === 0, "normalizeQuestion sets orderIndex");
  assert(r.normalized?.choices.length === 4, "normalizeQuestion keeps 4 choices");
  assert(
    r.normalized?.choices.filter((c) => c.isCorrect).length === 1,
    "normalizeQuestion keeps exactly one correct choice"
  );
}

{
  const r = normalizeQuestion({ type: "TRUE_FALSE", prompt: "2+2=4", points: 1, correctBoolean: true }, 0);
  assert(r.ok, "normalizeQuestion accepts a valid True/False");
  assert(r.normalized?.choices.length === 2, "True/False synthesizes two choices");
  assert(r.normalized?.choices[0].isCorrect === true, "True/False marks True correct");
}

{
  const r = normalizeQuestion({ type: "FILL_BLANK", prompt: "The sky is ___", points: 1, correctAnswer: "blue" }, 0);
  assert(r.ok, "normalizeQuestion accepts a valid fill-in-the-blank");
  assert(r.normalized?.correctAnswer === "blue", "normalizeQuestion keeps the expected answer");
}

{
  const r = normalizeQuestion({ type: "ESSAY", prompt: "Discuss...", points: 5 }, 0);
  assert(r.ok, "normalizeQuestion accepts an essay");
  assert(r.normalized?.choices.length === 0, "Essay has no choices");
}

// Rejections
{
  assert(!normalizeQuestion({ type: "WEIRD", prompt: "x", points: 1 }, 0).ok, "rejects unknown type");
  assert(!normalizeQuestion({ type: "ESSAY", prompt: "", points: 1 }, 0).ok, "rejects empty prompt");
  assert(!normalizeQuestion({ type: "ESSAY", prompt: "x", points: 0 }, 0).ok, "rejects zero points");
  assert(!normalizeQuestion({ type: "ESSAY", prompt: "x", points: 101 }, 0).ok, "rejects points > 100");
  assert(
    !normalizeQuestion({ type: "MULTIPLE_CHOICE", prompt: "x", points: 1, choices: [{ text: "only", isCorrect: true }] }, 0).ok,
    "rejects MCQ with fewer than 2 options"
  );
  assert(
    !normalizeQuestion(
      { type: "MULTIPLE_CHOICE", prompt: "x", points: 1, choices: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: true }] },
      0
    ).ok,
    "rejects MCQ with two correct answers"
  );
  assert(
    !normalizeQuestion(
      { type: "MULTIPLE_CHOICE", prompt: "x", points: 1, choices: [{ text: "a", isCorrect: true }, { text: "", isCorrect: false }] },
      0
    ).ok,
    "rejects MCQ with empty option text"
  );
  assert(!normalizeQuestion({ type: "TRUE_FALSE", prompt: "x", points: 1 }, 0).ok, "rejects True/False without a boolean");
  assert(!normalizeQuestion({ type: "FILL_BLANK", prompt: "x", points: 1 }, 0).ok, "rejects fill-blank without an answer");
}

{
  const { validation, questions } = prepareQuestionBankImport([
    {
      Type: "Multiple Choice",
      Question: "Which is a mammal?",
      "Option A": "Whale",
      "Option B": "Trout",
      "Correct Answer": "A",
      Points: 2,
    },
    {
      Type: "True/False",
      Question: "A whale is a mammal.",
      "Correct Answer": "True",
      Points: 1,
    },
    {
      Type: "Fill in the blank",
      Question: "A whale is a ___.",
      "Correct Answer": "mammal",
      Points: 1,
    },
    {
      Type: "Essay",
      Question: "Explain why whales are mammals.",
      Points: 5,
    },
  ]);
  assert(validation.errorCount === 0, "Question Bank import validates all supported question types");
  assert(questions.length === 4, "Question Bank import maps all valid rows");
  assert(questions[0]?.choices?.[0]?.isCorrect, "Question Bank import preserves MCQ answers");
  assert(questions[1]?.correctBoolean === true, "Question Bank import maps True/False answers");
  assert(questions[2]?.correctAnswer === "mammal", "Question Bank import maps fill-in answers");
  assert(questions[3]?.type === "ESSAY", "Question Bank import maps essay prompts");
}

// ---------------------------------------------------------------------------
// Header mapping
// ---------------------------------------------------------------------------

{
  assert(canonicalHeaderKey("Type") === "type", "header alias: Type");
  assert(canonicalHeaderKey("  question TYPE ") === "type", "header alias is trimmed/case-insensitive");
  assert(canonicalHeaderKey("Question") === "question", "header alias: Question");
  assert(canonicalHeaderKey("Prompt") === "question", "header alias: Prompt -> question");
  assert(canonicalHeaderKey("Option A") === "optionA", "header alias: Option A");
  assert(canonicalHeaderKey("option c") === "optionC", "header alias: option c");
  assert(canonicalHeaderKey("Choice D") === "optionD", "header alias: Choice D");
  assert(canonicalHeaderKey("Correct Answer") === "correct", "header alias: Correct Answer");
  assert(canonicalHeaderKey("Marks") === "points", "header alias: Marks -> points");
  assert(canonicalHeaderKey("Case Sensitive") === "caseSensitive", "header alias: Case Sensitive");
  assert(canonicalHeaderKey("Nonsense Column") === null, "unknown header returns null");
}

{
  assert(isRowEmpty({ Question: "", "Option A": "   " }), "blank row detected as empty");
  assert(!isRowEmpty({ Question: "hi" }), "non-empty row detected");
}

// ---------------------------------------------------------------------------
// validateImportRows — end to end row mapping
// ---------------------------------------------------------------------------

function workbook(rows: Record<string, unknown>[]) {
  return rows;
}

{
  const rows = workbook([
    {
      Type: "Multiple Choice",
      Question: "Capital of France?",
      "Option A": "Paris",
      "Option B": "London",
      "Option C": "Rome",
      "Option D": "Madrid",
      "Correct Answer": "A",
      Points: 2,
    },
    {
      Type: "True/False",
      Question: "The earth is flat",
      "Correct Answer": "False",
      Points: 1,
    },
    {
      Type: "Fill in the blank",
      Question: "Water freezes at ___ degrees",
      "Correct Answer": "0",
      Points: 1,
    },
    { Type: "Essay", Question: "Explain photosynthesis", Points: 5 },
  ]);

  const v = validateImportRows(rows);
  assert(v.rowCount === 4, "all four rows counted");
  assert(v.errorCount === 0, "no errors for a clean file");
  assert(v.validCount === 4, "all four rows valid");
  assert(v.validQuestions[0].type === "MULTIPLE_CHOICE", "MCQ type normalized");
  assert(
    v.validQuestions[0].choices.find((c) => c.isCorrect)?.text === "Paris",
    "correct answer letter A maps to Paris"
  );
  assert(v.validQuestions[1].choices[0].isCorrect === false, "True/False 'False' marks False correct");
  assert(v.validQuestions[2].correctAnswer === "0", "fill-blank answer captured");
  assert(v.validQuestions[3].type === "ESSAY", "essay type normalized");
}

// Correct answer by option text (not just letter)
{
  const v = validateImportRows([
    {
      Type: "MCQ",
      Question: "Which is a fruit?",
      "Option A": "Carrot",
      "Option B": "Apple",
      "Correct Answer": "Apple",
    },
  ]);
  assert(v.errorCount === 0, "correct answer by option text is accepted");
  assert(
    v.validQuestions[0].choices.find((c) => c.isCorrect)?.text === "Apple",
    "option text match marks the right choice"
  );
}

// Default points = 1
{
  const v = validateImportRows([{ Type: "Essay", Question: "Short", "Correct Answer": "" }]);
  assert(v.errorCount === 0, "blank points defaults cleanly");
  assert(v.validQuestions[0].points === 1, "points default to 1");
}

// Blank rows are ignored and do not shift row numbers
{
  const v = validateImportRows([
    { Type: "Essay", Question: "One" },
    { Type: "", Question: "", "Option A": "" },
    { Type: "Essay", Question: "Two" },
  ]);
  assert(v.rowCount === 2, "blank row ignored");
  assert(v.rows[1].rowNumber === 4, "row numbers count the header and blank rows");
}

// Error rows carry row numbers and messages, and do not stop the batch
{
  const v = validateImportRows([
    { Type: "Multiple Choice", Question: "Bad MCQ", "Option A": "only", "Correct Answer": "A" },
    { Type: "True/False", Question: "Fine", "Correct Answer": "True" },
    { Type: "Banana", Question: "Wrong type", "Correct Answer": "x" },
  ]);
  assert(v.rowCount === 3, "three rows counted");
  assert(v.errorCount === 2, "two invalid rows detected");
  assert(v.validCount === 1, "one valid row survives");
  assert(!v.rows[0].ok && v.rows[0].rowNumber === 2, "first error row is spreadsheet row 2");
  assert(v.rows[0].errors.length > 0, "first error row has a message");
  assert(v.rows[2].rowNumber === 4, "third error row is spreadsheet row 4");
  assert(v.rows[2].errors.some((e) => /Type must be/i.test(e)), "unknown type reported clearly");
}

// Correct answer that matches no option
{
  const v = validateImportRows([
    { Type: "MCQ", Question: "?", "Option A": "yes", "Option B": "no", "Correct Answer": "E" },
  ]);
  assert(v.errorCount === 1, "unmatched correct letter is an error");
  assert(v.rows[0].errors.some((e) => /does not match/i.test(e)), "unmatched answer explains itself");
}

// Result shape sanity (what the API serializes)
{
  const v = validateImportRows([{ Type: "Essay", Question: "Hi" }]);
  const row = serializeImportRows(v.rows)[0];
  const keys = Object.keys(row).sort();
  assert(
    keys.join(",") === "errors,index,ok,preview,rowNumber",
    "serialized row exposes index/rowNumber/ok/errors/preview only"
  );
}

// MAX_QUESTIONS constant is exported and sane
assert(MAX_QUESTIONS === 100, "MAX_QUESTIONS is 100");
assert(QUESTION_IMPORT_HEADERS.type === "Type", "canonical template header exposed");

// ---------------------------------------------------------------------------
// NormalizedQuestion type guard (compile-time usage)
// ---------------------------------------------------------------------------
const sample: NormalizedQuestion | undefined = validateImportRows([
  { Type: "Essay", Question: "typing" },
]).validQuestions[0];
assert(Boolean(sample), "validQuestions returns NormalizedQuestion objects");

// ---------------------------------------------------------------------------
// Client template <-> server validator contract
// Ensures the workbook the app hands to educators is exactly what the server
// accepts, so the two can never silently drift apart.
// ---------------------------------------------------------------------------
{
  const unmapped = QUESTION_TEMPLATE_HEADERS.filter((h) => canonicalHeaderKey(h) === null);
  assert(
    unmapped.length === 0,
    `template headers all map to canonical keys${unmapped.length ? ` (unmapped: ${unmapped.join(", ")})` : ""}`
  );

  const rows = QUESTION_TEMPLATE_EXAMPLES.map((values) => {
    const row: Record<string, unknown> = {};
    QUESTION_TEMPLATE_HEADERS.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
  const v = validateImportRows(rows);
  const problem = v.rows
    .filter((r) => !r.ok)
    .map((r) => `row ${r.rowNumber}: ${r.errors.join("|")}`)
    .join(" ; ");
  assert(v.rowCount === QUESTION_TEMPLATE_EXAMPLES.length, "template examples are all counted");
  assert(v.errorCount === 0, `template examples all valid${problem ? ` (${problem})` : ""}`);
  assert(v.validQuestions[0]?.type === "MULTIPLE_CHOICE", "template example 1 is multiple choice");
  assert(v.validQuestions[1]?.type === "TRUE_FALSE", "template example 2 is true/false");
  assert(v.validQuestions[2]?.type === "FILL_BLANK", "template example 3 is fill-blank");
  assert(v.validQuestions[3]?.type === "ESSAY", "template example 4 is essay");
  assert(
    v.validQuestions[0]?.choices.find((c) => c.isCorrect)?.text === "Paris",
    "template example 1 marks Paris correct"
  );
}

// ---------------------------------------------------------------------------
// Math + image rich content in imported cells
// ---------------------------------------------------------------------------

{
  const v = validateImportRows([
    {
      Type: "MCQ",
      Question: "Solve $\\frac{x}{2} = 3$",
      "Option A": "$x = 6$",
      "Option B": "$x = 3$",
      "Correct Answer": "A",
    },
  ]);
  assert(v.errorCount === 0, "math in question and options is accepted");
  assert(
    v.validQuestions[0].prompt === "Solve $\\frac{x}{2} = 3$",
    "inline math is preserved in the prompt"
  );
  assert(v.validQuestions[0].choices[0].text === "$x = 6$", "inline math is preserved in a choice");
}

{
  const v = validateImportRows([
    { Type: "Essay", Question: "Label the diagram.", Image: "https://example.com/d.png" },
  ]);
  assert(v.errorCount === 0, "a dedicated Image column is accepted");
  assert(
    v.validQuestions[0].prompt.includes("![image](https://example.com/d.png)"),
    "Image column is appended to the prompt as an image token"
  );
}

{
  const v = validateImportRows([
    { Type: "Essay", Question: '=IMAGE("https://example.com/x.png")' },
  ]);
  assert(v.errorCount === 0, '=IMAGE("…") in the question cell is accepted');
  assert(
    v.validQuestions[0].prompt.trim() === "![image](https://example.com/x.png)",
    '=IMAGE("…") becomes an image token'
  );
}

{
  const v = validateImportRows([{ Type: "Essay", Question: "Plain text", Image: "not a url" }]);
  assert(v.errorCount === 0, "a non-URL Image cell is ignored, not an error");
  assert(
    !v.validQuestions[0].prompt.includes("[image]"),
    "a non-URL Image cell never becomes an image token"
  );
}

{
  const v = validateImportRows([
    { Type: "Essay", Question: "A ", Image: "![cap](https://example.com/a.png)" },
  ]);
  assert(
    v.validQuestions[0].prompt === "A\n![cap](https://example.com/a.png)",
    "existing markdown image in the Image column is kept with its alt text"
  );
}

console.log(`\nQuestion import tests: ${failed === 0 ? "ALL PASSED" : failed + " FAILED"}`);
if (failed > 0) process.exit(1);
