/**
 * Client-side Excel (.xlsx) helpers for exam/quiz question import.
 *
 * - `downloadQuestionTemplate()` builds a ready-to-fill "Questions" workbook so
 *   educators never have to invent column names.
 * - `parseQuestionSheet()` reads an uploaded workbook back into plain rows.
 *
 * The server remains authoritative for validation (`lib/questionImport.ts`).
 * The `xlsx` library is imported dynamically so it is only loaded on demand.
 */

/** Sheet name the template is written to and preferred when parsing. */
export const QUESTION_SHEET_NAME = "Questions";

export const QUESTION_TEMPLATE_HEADERS = [
  "Type",
  "Question",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
  "Correct Answer",
  "Points",
  "Case Sensitive",
  "Image",
] as const;

/** One worked example per question type, so the expected format is obvious. */
export const QUESTION_TEMPLATE_EXAMPLES: (string | number)[][] = [
  ["Multiple Choice", "What is the capital of France?", "Paris", "London", "Rome", "Berlin", "A", 1, "", ""],
  ["True/False", "The Earth is round.", "", "", "", "", "True", 1, "", ""],
  ["Fill in the blank", "Water boils at ___ degrees Celsius.", "", "", "", "", "100", 1, "No", ""],
  ["Essay", "Explain the process of photosynthesis.", "", "", "", "", "", 5, "", ""],
  ["Multiple Choice", "Solve $\\frac{x}{2} = 3$.", "$x = 3$", "$x = 6$", "$x = 1.5$", "$x = 9$", "B", 1, "", ""],
  ["Multiple Choice", "Which shape is shown?", "Triangle", "Circle", "Square", "Rectangle", "A", 1, "", "https://example.com/diagram.png"],
];

const TEMPLATE_GUIDE: (string | number)[][] = [
  ["How to fill this template"],
  [""],
  ["1. Keep the column headers on row 1 exactly as they are."],
  ["2. Add one question per row below the examples. Delete the example rows you don't need."],
  ["3. Type must be one of: Multiple Choice, True/False, Fill in the blank, Essay."],
  ["4. Multiple Choice: fill Option A..Option D and put the correct letter (e.g. A) in Correct Answer."],
  ["5. True/False: put True or False in Correct Answer."],
  ["6. Fill in the blank: put the expected answer in Correct Answer."],
  ["7. Essay: no Correct Answer needed (marked by a teacher)."],
  ["8. Points is optional; leave blank to default to 1."],
  [""],
  ["Math formulas: wrap LaTeX in dollar signs, e.g. $\\frac{1}{2}$ or $x^{2}$."],
  ["Images / diagrams: paste an image URL in the Image column, or use =IMAGE(\"url\") in a cell."],
  ["You can also embed images directly in the Question or Option cells with =IMAGE(\"url\")."],
  [`Import of the "${QUESTION_SHEET_NAME}" sheet is limited to 100 questions per exam or Question Bank upload.`],
];

function cellToString(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (v instanceof Date) return isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
  return String(v).trim();
}

/** Trigger a browser download of a generated "Questions" workbook. */
export async function downloadQuestionTemplate(fileName = "exam-questions-template.xlsx") {
  const XLSX = await import("xlsx");
  const questions = XLSX.utils.aoa_to_sheet([
    [...QUESTION_TEMPLATE_HEADERS],
    ...QUESTION_TEMPLATE_EXAMPLES,
  ]);
  questions["!cols"] = [
    { wch: 18 },
    { wch: 48 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 8 },
    { wch: 14 },
    { wch: 28 },
  ];

  const guide = XLSX.utils.aoa_to_sheet(TEMPLATE_GUIDE);
  guide["!cols"] = [{ wch: 90 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, questions, QUESTION_SHEET_NAME);
  XLSX.utils.book_append_sheet(wb, guide, "Instructions");
  XLSX.writeFile(wb, fileName);
}

function rowsFromSheet(XLSX: any, sheet: any): Record<string, unknown>[] {
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: true,
  }) as unknown[][];
  if (!aoa.length) return [];

  const headers = (aoa[0] || []).map((h) => cellToString(h));
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const line = aoa[i] || [];
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      const v = cellToString(line[idx]);
      row[h] = v;
    });
    rows.push(row);
  }
  return rows;
}

export class QuestionSheetError extends Error {
  code: "FILE_TYPE" | "WRONG_SHEET" | "NO_ROWS";
  constructor(code: "FILE_TYPE" | "WRONG_SHEET" | "NO_ROWS") {
    super(code);
    this.name = "QuestionSheetError";
    this.code = code;
  }
}

/**
 * Parse an uploaded .xlsx into spreadsheet rows keyed by their header text.
 * Prefers the template's "Questions" sheet and falls back to the first sheet,
 * so a file a teacher built from scratch still works.
 */
export async function parseQuestionSheet(file: File): Promise<{
  rows: Record<string, unknown>[];
  sourceFileName: string;
}> {
  const name = file.name || "upload";
  const lower = name.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
    throw new QuestionSheetError("FILE_TYPE");
  }

  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetNames: string[] = workbook.SheetNames || [];
  if (!sheetNames.length) throw new QuestionSheetError("WRONG_SHEET");

  const preferred = sheetNames.find(
    (s) => s.trim().toLowerCase() === QUESTION_SHEET_NAME.toLowerCase()
  );
  const sheetName = preferred || sheetNames[0];
  const rows = rowsFromSheet(XLSX, workbook.Sheets[sheetName]);
  if (!rows.some((row) => Object.values(row).some((value) => cellToString(value)))) {
    throw new QuestionSheetError("NO_ROWS");
  }

  return { rows, sourceFileName: name };
}
