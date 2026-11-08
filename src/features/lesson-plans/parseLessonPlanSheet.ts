/**
 * Client-side Excel (.xlsx) helpers for lesson plan import.
 *
 * - `downloadLessonPlanTemplate()` builds a ready-to-fill workbook so teachers
 *   never have to invent column names.
 * - `parseLessonPlanSheet()` reads an uploaded workbook into validated payloads
 *   that can be posted to the existing lesson plan create endpoint.
 *
 * The `xlsx` library is imported dynamically so it is only loaded on demand.
 */

export const LESSON_PLAN_SHEET_NAME = "Lesson Plans";
export const LESSON_PLAN_IMPORT_LIMIT = 200;

export const LESSON_PLAN_TEMPLATE_HEADERS = [
  "Title",
  "Date",
  "Subject",
  "Grade Level",
  "Classroom",
  "Duration (min)",
  "Period",
  "Objectives",
  "Standards",
  "Warm-up",
  "Activities",
  "Materials",
  "Assessment",
  "Differentiation",
  "Homework",
] as const;

export const LESSON_PLAN_TEMPLATE_EXAMPLES: (string | number)[][] = [
  [
    "Introduction to Fractions",
    "2026-11-09",
    "Mathematics",
    "Grade 5",
    "5A",
    45,
    "Period 1",
    "Identify halves and quarters\nRepresent fractions on a number line",
    "MATH.5.NF.1",
    "Quick fraction matching game",
    "Fraction circles | 10 | Sort and name equal parts\nNumber line walk | 20 | Place fractions on a line",
    "Fraction circles\nNumber line strips",
    "Exit ticket with 3 fractions",
    "Provide pre-drawn number lines for students who need support",
    "Complete worksheet page 12",
  ],
];

const TEMPLATE_GUIDE: (string | number)[][] = [
  ["How to fill this template"],
  [""],
  ["1. Keep the column headers on row 1 exactly as they are."],
  ["2. Add one lesson plan per row below the example. Delete the example row."],
  ["3. Date must be YYYY-MM-DD (for example 2026-11-09)."],
  ["4. Subject must match an existing subject name in your school."],
  ["5. Grade Level and Classroom are optional; if filled they must match existing records."],
  ["6. Duration (min) is optional; leave blank to default to 45 minutes."],
  ["7. Objectives and Materials: put one item per line inside the cell."],
  ["8. Activities: one activity per line, formatted as Title | minutes | description."],
  [""],
  [`Import is limited to ${LESSON_PLAN_IMPORT_LIMIT} lesson plans per upload.`],
];

type CanonicalKey =
  | "title"
  | "lessonDate"
  | "subject"
  | "grade"
  | "classroom"
  | "duration"
  | "period"
  | "objectives"
  | "standards"
  | "warmUp"
  | "activities"
  | "materials"
  | "assessment"
  | "differentiation"
  | "homework";

const HEADER_ALIASES: Record<string, CanonicalKey> = {
  title: "title",
  lessontitle: "title",
  topic: "title",
  lesson: "title",
  date: "lessonDate",
  lessondate: "lessonDate",
  day: "lessonDate",
  subject: "subject",
  subjectname: "subject",
  grade: "grade",
  gradelevel: "grade",
  classlevel: "grade",
  year: "grade",
  classroom: "classroom",
  class: "classroom",
  section: "classroom",
  duration: "duration",
  durationmin: "duration",
  durationminutes: "duration",
  minutes: "duration",
  length: "duration",
  period: "period",
  periodlabel: "period",
  slot: "period",
  objectives: "objectives",
  objective: "objectives",
  learningobjectives: "objectives",
  learningobjective: "objectives",
  aims: "objectives",
  standards: "standards",
  standard: "standards",
  curriculumstandards: "standards",
  warmup: "warmUp",
  starter: "warmUp",
  donow: "warmUp",
  bellwork: "warmUp",
  activities: "activities",
  activity: "activities",
  lessonactivities: "activities",
  procedure: "activities",
  materials: "materials",
  material: "materials",
  resources: "materials",
  assessment: "assessment",
  evaluation: "assessment",
  differentiation: "differentiation",
  differentiatedinstruction: "differentiation",
  homework: "homework",
  assignment: "homework",
  homeworkassignment: "homework",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cellToString(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? "" : toIsoDate(v);
  }
  return String(v).trim();
}

function toIsoDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeDate(raw: unknown): string {
  if (raw instanceof Date) return isNaN(raw.getTime()) ? "" : toIsoDate(raw);
  if (typeof raw === "number" && raw > 20000 && raw < 80000) {
    const ms = Math.round((raw - 25569) * 86400 * 1000);
    const date = new Date(ms);
    if (isNaN(date.getTime())) return "";
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const text = cellToString(raw);
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? "" : toIsoDate(parsed);
}

function splitList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseActivities(raw: string) {
  if (!raw) return [];
  return raw
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const title = parts[0] || "";
      const minutesText = parts[1] || "";
      const description = parts.slice(2).join(" | ").trim();
      const minutes = /^\d+(\.\d+)?$/.test(minutesText)
        ? Number(minutesText)
        : null;
      return {
        title,
        minutes,
        description: minutes == null && minutesText
          ? [minutesText, description].filter(Boolean).join(" - ")
          : description,
      };
    })
    .filter((activity) => activity.title);
}

export class LessonPlanSheetError extends Error {
  code: "FILE_TYPE" | "WRONG_SHEET" | "NO_ROWS";
  constructor(code: "FILE_TYPE" | "WRONG_SHEET" | "NO_ROWS") {
    super(code);
    this.name = "LessonPlanSheetError";
    this.code = code;
  }
}

export type LessonPlanLookupOption = {
  id: string;
  name: string;
  subjectId?: string | null;
  gradeLevelId?: string | null;
};

export type LessonPlanImportLookups = {
  subjects: LessonPlanLookupOption[];
  gradeLevels: LessonPlanLookupOption[];
  classrooms: LessonPlanLookupOption[];
};

export type LessonPlanImportPayload = {
  title: string;
  lessonDate: string;
  durationMinutes: number;
  periodLabel: string | null;
  subjectId: string;
  subjectName: string;
  gradeLevelId: string | null;
  gradeLevelName: string | null;
  classroomId: string | null;
  classroomName: string | null;
  objectives: string[];
  standards: string | null;
  warmUp: string | null;
  activities: Array<{ title: string; minutes: number | null; description: string }>;
  materials: string[];
  assessment: string | null;
  differentiation: string | null;
  homework: string | null;
};

export type LessonPlanImportRowResult = {
  rowNumber: number;
  title: string;
  errors: string[];
  payload?: LessonPlanImportPayload;
};

export type LessonPlanImportResult = {
  rows: LessonPlanImportRowResult[];
  valid: LessonPlanImportRowResult[];
  invalid: LessonPlanImportRowResult[];
  sourceFileName: string;
};

export async function downloadLessonPlanTemplate(
  fileName = "lesson-plan-template.xlsx"
) {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet([
    [...LESSON_PLAN_TEMPLATE_HEADERS],
    ...LESSON_PLAN_TEMPLATE_EXAMPLES,
  ]);
  sheet["!cols"] = [
    { wch: 28 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 42 },
    { wch: 20 },
    { wch: 30 },
    { wch: 52 },
    { wch: 30 },
    { wch: 30 },
    { wch: 36 },
    { wch: 30 },
  ];

  const guide = XLSX.utils.aoa_to_sheet(TEMPLATE_GUIDE);
  guide["!cols"] = [{ wch: 90 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, LESSON_PLAN_SHEET_NAME);
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

  const headers = (aoa[0] || []).map((header) => normalizeHeader(header));
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const line = aoa[i] || [];
    const row: Record<string, unknown> = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      const key = HEADER_ALIASES[header];
      if (!key) return;
      const value = line[index];
      if (cellToString(value)) hasValue = true;
      row[key] = value;
    });
    if (hasValue) {
      row.__rowNumber = i + 1;
      rows.push(row);
    }
  }
  return rows;
}

export async function parseLessonPlanSheet(
  file: File
): Promise<{ rows: Record<string, unknown>[]; sourceFileName: string }> {
  const name = file.name || "upload";
  const lower = name.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
    throw new LessonPlanSheetError("FILE_TYPE");
  }

  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetNames: string[] = workbook.SheetNames || [];
  if (!sheetNames.length) throw new LessonPlanSheetError("WRONG_SHEET");

  const preferred = sheetNames.find(
    (sheetName) =>
      sheetName.trim().toLowerCase() === LESSON_PLAN_SHEET_NAME.toLowerCase()
  );
  const sheetName = preferred || sheetNames[0];
  const rows = rowsFromSheet(XLSX, workbook.Sheets[sheetName]);
  if (!rows.length) throw new LessonPlanSheetError("NO_ROWS");

  return { rows, sourceFileName: name };
}

function findByName(options: LessonPlanLookupOption[], name: string) {
  const target = name.trim().toLowerCase();
  if (!target) return undefined;
  return options.find(
    (option) => String(option.name || "").trim().toLowerCase() === target
  );
}

export function validateLessonPlanImportRows(
  rows: Record<string, unknown>[],
  lookups: LessonPlanImportLookups
): LessonPlanImportResult {
  const results: LessonPlanImportRowResult[] = [];

  rows.forEach((row, index) => {
    const rowNumber = Number(row.__rowNumber) || index + 2;
    const title = cellToString(row.title);
    const errors: string[] = [];

    const subjectName = cellToString(row.subject);
    const gradeName = cellToString(row.grade);
    const classroomName = cellToString(row.classroom);

    const classroom = classroomName ? findByName(lookups.classrooms, classroomName) : undefined;
    const subject = subjectName
      ? findByName(lookups.subjects, subjectName)
      : classroom?.subjectId
        ? lookups.subjects.find((item) => item.id === classroom.subjectId)
        : undefined;
    const grade = gradeName
      ? findByName(lookups.gradeLevels, gradeName)
      : classroom?.gradeLevelId
        ? lookups.gradeLevels.find((item) => item.id === classroom.gradeLevelId)
        : undefined;

    if (!title) errors.push("Title is required.");
    const lessonDate = normalizeDate(row.lessonDate);
    if (!lessonDate) {
      errors.push("Date must be a valid date (YYYY-MM-DD).");
    }
    if (subjectName && !subject) {
      errors.push(`Subject "${subjectName}" was not found in this school.`);
    }
    if (!subjectName && !subject) {
      errors.push("Subject is required.");
    }
    if (gradeName && !grade) {
      errors.push(`Grade level "${gradeName}" was not found in this school.`);
    }
    if (classroomName && !classroom) {
      errors.push(`Classroom "${classroomName}" was not found in this school.`);
    }

    const durationRaw = cellToString(row.duration);
    let durationMinutes = 45;
    if (durationRaw) {
      const parsed = Number(durationRaw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        errors.push("Duration must be a positive number of minutes.");
      } else {
        durationMinutes = Math.round(parsed);
      }
    }

    if (!errors.length && subject) {
      results.push({
        rowNumber,
        title,
        errors,
        payload: {
          title,
          lessonDate,
          durationMinutes,
          periodLabel: cellToString(row.period) || null,
          subjectId: subject.id,
          subjectName: subject.name,
          gradeLevelId: grade?.id ?? null,
          gradeLevelName: grade?.name ?? null,
          classroomId: classroom?.id ?? null,
          classroomName: classroom?.name ?? null,
          objectives: splitList(cellToString(row.objectives)),
          standards: cellToString(row.standards) || null,
          warmUp: cellToString(row.warmUp) || null,
          activities: parseActivities(cellToString(row.activities)),
          materials: splitList(cellToString(row.materials)),
          assessment: cellToString(row.assessment) || null,
          differentiation: cellToString(row.differentiation) || null,
          homework: cellToString(row.homework) || null,
        },
      });
    } else {
      results.push({ rowNumber, title, errors });
    }
  });

  return {
    rows: results,
    valid: results.filter((row) => !row.errors.length && row.payload),
    invalid: results.filter((row) => row.errors.length > 0),
    sourceFileName: "",
  };
}
