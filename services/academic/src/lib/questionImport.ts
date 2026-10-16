/**
 * Pure helpers for exam/quiz question authoring and spreadsheet import.
 *
 * This module is the single source of truth for per-question rules. Both the
 * manual editor (`PUT /api/exams/:id/questions`) and the spreadsheet import
 * pipeline normalize through `normalizeQuestion`, so the two paths can never
 * drift. No DB access here so the rules are directly unit-testable.
 */

export const QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_BLANK",
  "ESSAY",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Server-enforced ceiling on questions per exam (mirrors the manual editor). */
export const MAX_QUESTIONS = 100;
/** Upper bound on raw spreadsheet rows accepted before per-row validation. */
export const MAX_IMPORT_ROWS = 500;
/**
 * Prompts/choices are stored as plain text that may embed inline LaTeX
 * (`$...$`) and image tokens (`![alt](url)`), so a hand-drawn diagram encoded
 * as a `data:image/png;base64,...` URL can push a prompt well past plain text.
 */
export const MAX_PROMPT_LENGTH = 120000;
export const MAX_CHOICE_LENGTH = 40000;
export const MAX_ANSWER_LENGTH = 2000;

const QUESTION_TYPE_SET = new Set<string>(QUESTION_TYPES);

export type NormalizedChoice = {
  label: string;
  text: string;
  isCorrect: boolean;
};

export type NormalizedQuestion = {
  type: QuestionType;
  prompt: string;
  points: number;
  orderIndex: number;
  correctAnswer: string | null;
  caseSensitive: boolean;
  choices: NormalizedChoice[];
};

export type NormalizeResult = {
  ok: boolean;
  errors: string[];
  normalized?: NormalizedQuestion;
};

export type RowResult = {
  /** 0-based index among the data rows that were considered. */
  index: number;
  /** 1-based spreadsheet row number (header row is 1, first data row is 2). */
  rowNumber: number;
  ok: boolean;
  errors: string[];
  /** Short preview of the question text, for the import review table. */
  preview: string;
  normalized?: NormalizedQuestion;
};

export type ImportValidation = {
  rowCount: number;
  validCount: number;
  errorCount: number;
  rows: RowResult[];
  validQuestions: NormalizedQuestion[];
};

// ---------------------------------------------------------------------------
// Header aliases (spreadsheet column names). The rules:
//  - matching is case-insensitive and ignores surrounding whitespace
//  - "Type" and "Question" are required; the rest are optional
// ---------------------------------------------------------------------------

export const QUESTION_IMPORT_HEADERS = {
  type: "Type",
  question: "Question",
  optionPrefix: "Option", // Option A .. Option H
  correct: "Correct Answer",
  points: "Points",
  caseSensitive: "Case Sensitive",
  image: "Image", // optional image URL / =IMAGE("…") appended to the prompt
} as const;

export const MAX_OPTIONS = 8;
export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

const TYPE_ALIASES: Record<string, QuestionType> = {
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  "MULTIPLE CHOICE": "MULTIPLE_CHOICE",
  "MULTIPLE-CHOICE": "MULTIPLE_CHOICE",
  MULTIPLE: "MULTIPLE_CHOICE",
  MC: "MULTIPLE_CHOICE",
  MCQ: "MULTIPLE_CHOICE",
  MCS: "MULTIPLE_CHOICE",
  TRUE_FALSE: "TRUE_FALSE",
  "TRUE/FALSE": "TRUE_FALSE",
  "TRUE FALSE": "TRUE_FALSE",
  TRUEFALSE: "TRUE_FALSE",
  TF: "TRUE_FALSE",
  "T/F": "TRUE_FALSE",
  T_F: "TRUE_FALSE",
  FILL_BLANK: "FILL_BLANK",
  "FILL IN THE BLANK": "FILL_BLANK",
  "FILL-IN-THE-BLANK": "FILL_BLANK",
  "FILL IN BLANK": "FILL_BLANK",
  FILLBLANK: "FILL_BLANK",
  FILL: "FILL_BLANK",
  BLANK: "FILL_BLANK",
  GAP_FILL: "FILL_BLANK",
  ESSAY: "ESSAY",
  "LONG ANSWER": "ESSAY",
  LONG_ANSWER: "ESSAY",
  "SHORT ANSWER": "ESSAY",
  SHORT_ANSWER: "ESSAY",
  WRITTEN: "ESSAY",
};

const HEADER_ALIASES: Record<string, string> = {
  type: "type",
  "question type": "type",
  questiontype: "type",
  kind: "type",
  question: "question",
  prompt: "question",
  "question text": "question",
  questiontext: "question",
  text: "question",
  "correct answer": "correct",
  correctanswer: "correct",
  correct: "correct",
  answer: "correct",
  "correct option": "correct",
  points: "points",
  point: "points",
  marks: "points",
  mark: "points",
  score: "points",
  "case sensitive": "caseSensitive",
  casesensitive: "caseSensitive",
  "case-sensitive": "caseSensitive",
  image: "image",
  "image url": "image",
  imageurl: "image",
  picture: "image",
  diagram: "image",
};

export function canonicalHeaderKey(raw: string): string | null {
  const key = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  if (HEADER_ALIASES[key]) return HEADER_ALIASES[key];
  const optionMatch = key.match(/^(?:option|choice)\s*([a-h])$/);
  if (optionMatch) return `option${optionMatch[1].toUpperCase()}`;
  const bareLetter = key.match(/^option_?([a-h])$/);
  if (bareLetter) return `option${bareLetter[1].toUpperCase()}`;
  return null;
}

// ---------------------------------------------------------------------------
// Core per-question normalization (shared by manual save + import)
// ---------------------------------------------------------------------------

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

const EXCEL_IMAGE_RE = /^=?\s*IMAGE\(\s*["']([^"']+)["']\s*\)$/i;
const MD_IMAGE_RE = /^!\[[^\]]*\]\(([^)]+)\)$/;
const BARE_URL_RE = /^https?:\/\/\S+$/i;

/**
 * Normalize a spreadsheet cell into question text that may contain image
 * tokens. `=IMAGE("url")` and existing markdown images always become tokens;
 * bare URLs only when `allowBareUrl` is true (dedicated Image column).
 */
function cellToRich(raw: unknown, allowBareUrl: boolean): string {
  const text = asString(raw).trim();
  if (!text) return "";
  const token = imageTokenFromCell(text, allowBareUrl);
  return token || text;
}

/** Return an image token for a cell, or "" when it is not an image. */
function imageTokenFromCell(raw: unknown, allowBareUrl: boolean): string {
  const text = asString(raw).trim();
  if (!text) return "";
  const excel = text.match(EXCEL_IMAGE_RE);
  if (excel) return `![image](${excel[1].trim()})`;
  if (MD_IMAGE_RE.test(text)) return text;
  if (allowBareUrl && BARE_URL_RE.test(text)) return `![image](${text})`;
  return "";
}

/**
 * Validate and normalize a single question input.
 * Never throws; returns collected human-readable errors.
 * `index` is 0-based and only affects `orderIndex`.
 */
export function normalizeQuestion(raw: any, index: number): NormalizeResult {
  const errors: string[] = [];
  const source = raw && typeof raw === "object" ? raw : {};

  const rawType = asString(source.type).trim().toUpperCase().replace(/\s+/g, " ");
  const type = (QUESTION_TYPE_SET.has(rawType)
    ? rawType
    : rawType.replace(/ /g, "_")) as QuestionType;
  if (!QUESTION_TYPE_SET.has(type)) {
    errors.push("Question type is not one of Multiple Choice, True/False, Fill in the blank, Essay.");
  }

  const prompt = asString(source.prompt).trim();
  if (!prompt) errors.push("Prompt is required.");
  else if (prompt.length > MAX_PROMPT_LENGTH) {
    errors.push(`Prompt is too long (max ${MAX_PROMPT_LENGTH} characters).`);
  }

  const points = Number(source.points);
  if (!Number.isFinite(points) || points <= 0 || points > 100) {
    errors.push("Points must be a number greater than 0 and at most 100.");
  }

  const caseSensitive = Boolean(source.caseSensitive);
  let choices: NormalizedChoice[] = [];
  let correctAnswer: string | null = null;

  if (type === "MULTIPLE_CHOICE") {
    const rawChoices = Array.isArray(source.choices) ? source.choices : [];
    choices = rawChoices.map((c: any, ci: number) => ({
      label: asString(c?.label).trim().slice(0, 4) || String.fromCharCode(65 + ci),
      text: asString(c?.text).trim(),
      isCorrect: Boolean(c?.isCorrect),
    }));
    if (choices.length < 2 || choices.length > MAX_OPTIONS) {
      errors.push(`Multiple choice needs between 2 and ${MAX_OPTIONS} options.`);
    }
    if (choices.some((c) => !c.text)) {
      errors.push("Every multiple-choice option needs text.");
    }
    if (choices.filter((c) => c.isCorrect).length !== 1) {
      errors.push("Multiple choice must have exactly one correct answer.");
    }
  } else if (type === "TRUE_FALSE") {
    const truth = source.correctBoolean;
    if (typeof truth !== "boolean") {
      errors.push("True/False needs a correct answer of True or False.");
    } else {
      choices = [
        { label: "T", text: "True", isCorrect: truth === true },
        { label: "F", text: "False", isCorrect: truth === false },
      ];
    }
  } else if (type === "FILL_BLANK") {
    correctAnswer = asString(source.correctAnswer).trim();
    if (!correctAnswer) errors.push("Fill in the blank needs the expected answer.");
    else if (correctAnswer.length > MAX_ANSWER_LENGTH) {
      errors.push(`Expected answer is too long (max ${MAX_ANSWER_LENGTH} characters).`);
    }
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    normalized: {
      type,
      prompt,
      points,
      orderIndex: index,
      correctAnswer,
      caseSensitive,
      choices,
    },
  };
}

// ---------------------------------------------------------------------------
// Spreadsheet row -> question mapping
// ---------------------------------------------------------------------------

/** Compact, readable preview for the import review table. */
function toPreview(text: string, len = 80): string {
  const stripped = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "[image]")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, len);
}

function normalizeRowKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row || {})) {
    const canonical = canonicalHeaderKey(key);
    if (canonical) out[canonical] = value;
  }
  return out;
}

export function isRowEmpty(row: Record<string, unknown>): boolean {
  return Object.values(row || {}).every((value) => asString(value).trim() === "");
}

function resolveType(raw: unknown): QuestionType | null {
  const key = asString(raw).trim().toUpperCase();
  if (!key) return null;
  return TYPE_ALIASES[key] ?? (QUESTION_TYPE_SET.has(key.replace(/ /g, "_")) ? (key.replace(/ /g, "_") as QuestionType) : null);
}

const TRUE_VALUES = new Set(["TRUE", "T", "YES", "Y", "1"]);
const FALSE_VALUES = new Set(["FALSE", "F", "NO", "N", "0"]);

function resolveBoolean(raw: unknown): boolean | null {
  const key = asString(raw).trim().toUpperCase();
  if (TRUE_VALUES.has(key)) return true;
  if (FALSE_VALUES.has(key)) return false;
  return null;
}

/**
 * Translate one spreadsheet row (already keyed by canonical headers) into the
 * raw question shape accepted by `normalizeQuestion`, collecting mapping errors.
 */
export function mapRowToQuestion(
  row: Record<string, unknown>,
  index: number,
  rowNumber: number
): RowResult {
  const errors: string[] = [];
  const keys = normalizeRowKeys(row);

  const type = resolveType(keys.type);
  if (!type) {
    errors.push('Type must be one of "Multiple Choice", "True/False", "Fill in the blank" or "Essay".');
  }

  const prompt = cellToRich(keys.question, false);
  const imageCell = imageTokenFromCell(keys.image, true);
  const promptWithImage = imageCell
    ? prompt
      ? `${prompt}\n${imageCell}`
      : imageCell
    : prompt;
  const rawPoints = keys.points;
  const points = rawPoints === undefined || asString(rawPoints).trim() === "" ? 1 : Number(rawPoints);

  const raw: any = {
    type,
    prompt: promptWithImage,
    points,
    caseSensitive: resolveBoolean(keys.caseSensitive) === true,
  };

  if (type === "MULTIPLE_CHOICE") {
    const choices: { label: string; text: string; isCorrect: boolean }[] = [];
    for (const letter of OPTION_LETTERS) {
      const text = cellToRich(keys[`option${letter}`], false);
      if (text) choices.push({ label: letter, text, isCorrect: false });
    }

    const correctRaw = asString(keys.correct).trim();
    if (!correctRaw) {
      errors.push("Choose the correct option (its letter, e.g. A).");
    } else {
      const letter = correctRaw.toUpperCase();
      let target = choices.find((c) => c.label === letter);
      if (!target && /^[A-H]$/.test(letter)) {
        errors.push(`Correct answer "${correctRaw}" does not match any option you filled in.`);
      }
      if (!target) {
        const lowered = correctRaw.toLowerCase();
        target = choices.find((c) => c.text.toLowerCase() === lowered);
        if (!target) {
          errors.push(`Correct answer "${correctRaw}" does not match any option text.`);
        }
      }
      if (target) target.isCorrect = true;
    }
    raw.choices = choices;
  } else if (type === "TRUE_FALSE") {
    const truth = resolveBoolean(keys.correct);
    if (truth === null) {
      errors.push('Correct Answer must be "True" or "False".');
    } else {
      raw.correctBoolean = truth;
    }
  } else if (type === "FILL_BLANK") {
    raw.correctAnswer = asString(keys.correct).trim();
  }

  const preview = toPreview(prompt || asString(keys.question));

  if (errors.length) {
    return { index, rowNumber, ok: false, errors, preview };
  }

  const result = normalizeQuestion(raw, index);
  if (!result.ok) {
    return { index, rowNumber, ok: false, errors: result.errors, preview };
  }
  return { index, rowNumber, ok: true, errors: [], preview, normalized: result.normalized };
}

/**
 * Map and validate a batch of spreadsheet rows. Empty rows are ignored.
 * Row numbers are 1-based with the header row counted as row 1, and blank rows
 * are still counted so the reported row matches the actual spreadsheet.
 */
export function validateImportRows(rows: Record<string, unknown>[]): ImportValidation {
  const results: RowResult[] = [];
  const input = Array.isArray(rows) ? rows : [];
  for (let physicalIndex = 0; physicalIndex < input.length; physicalIndex++) {
    const row = input[physicalIndex];
    if (isRowEmpty(row)) continue;
    const rowNumber = physicalIndex + 2;
    results.push(mapRowToQuestion(row, results.length, rowNumber));
  }

  const validQuestions = results
    .filter((r) => r.ok && r.normalized)
    .map((r) => r.normalized as NormalizedQuestion);

  return {
    rowCount: results.length,
    validCount: validQuestions.length,
    errorCount: results.length - validQuestions.length,
    rows: results,
    validQuestions,
  };
}

/**
 * Public (wire) shape of a row result: drops the heavy `normalized` payload.
 * Kept in this lib so the API serializer is directly unit-testable.
 */
export function serializeImportRows(rows: RowResult[]) {
  return rows.map((r) => ({
    index: r.index,
    rowNumber: r.rowNumber,
    ok: r.ok,
    errors: r.errors,
    preview: r.preview,
  }));
}
