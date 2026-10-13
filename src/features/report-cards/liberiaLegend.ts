import type { GradeScaleRow } from "../../lib/gradeLegend";

/** Default Liberian private senior-high letter bands (from reference scans). */
export const LIBERIA_SENIOR_HIGH_SCALES: GradeScaleRow[] = [
  { minScore: 97, maxScore: 100, gradeLetter: "A+", gpaPoints: 4.0, remark: "Principal List" },
  { minScore: 93, maxScore: 96.99, gradeLetter: "A", gpaPoints: 4.0, remark: "Honor Roll" },
  { minScore: 90, maxScore: 92.99, gradeLetter: "A-", gpaPoints: 3.7, remark: "Excellent" },
  { minScore: 87, maxScore: 89.99, gradeLetter: "B+", gpaPoints: 3.3, remark: "Very Good" },
  { minScore: 83, maxScore: 86.99, gradeLetter: "B", gpaPoints: 3.0, remark: "Good" },
  { minScore: 80, maxScore: 82.99, gradeLetter: "B-", gpaPoints: 2.7, remark: "Satisfactory" },
  { minScore: 77, maxScore: 79.99, gradeLetter: "C+", gpaPoints: 2.3, remark: "Normal Pass" },
  { minScore: 73, maxScore: 76.99, gradeLetter: "C", gpaPoints: 2.0, remark: "Fair Pass" },
  { minScore: 70, maxScore: 72.99, gradeLetter: "C-", gpaPoints: 1.7, remark: "Try" },
  { minScore: 67, maxScore: 69.99, gradeLetter: "D+", gpaPoints: 1.3, remark: "Fail" },
  { minScore: 60, maxScore: 66.99, gradeLetter: "D", gpaPoints: 1.0, remark: "Poor" },
  { minScore: 0, maxScore: 59.99, gradeLetter: "F", gpaPoints: 0, remark: "Failing" },
];

export const LIBERIA_FAILING_THRESHOLD = 70;

export const LIBERIA_PERIOD_COLUMNS = [
  { key: "SEM1_P1", label: "1st Period", roman: "I", aliases: ["FIRST_PERIOD", "P1", "SEM1_P1"] },
  { key: "SEM1_P2", label: "2nd Period", roman: "II", aliases: ["SECOND_PERIOD", "P2", "SEM1_P2"] },
  { key: "SEM1_P3", label: "3rd Period", roman: "III", aliases: ["THIRD_PERIOD", "P3", "SEM1_P3"] },
  { key: "SEM2_P4", label: "4th Period", roman: "IV", aliases: ["FOURTH_PERIOD", "P4", "SEM2_P4"] },
  { key: "SEM2_P5", label: "5th Period", roman: "V", aliases: ["FIFTH_PERIOD", "P5", "SEM2_P5"] },
  { key: "SEM2_P6", label: "6th Period", roman: "VI", aliases: ["SIXTH_PERIOD", "P6", "SEM2_P6"] },
] as const;

export const LIBERIA_EXAM_COLUMNS = [
  {
    key: "SEM1_EX",
    label: "Sem 1 Exam",
    aliases: ["FIRST_SEMESTER_EXAMS", "SEM1_EX", "S1_EX"],
  },
  {
    key: "SEM2_EX",
    label: "Sem 2 Exam",
    aliases: ["SECOND_SEMESTER_EXAMS", "SEM2_EX", "S2_EX"],
  },
] as const;

export function matchLiberiaColumnKey(shortCodeOrType?: string | null): string | null {
  if (!shortCodeOrType) return null;
  const raw = shortCodeOrType.trim().toUpperCase().replace(/\s+/g, "_");
  for (const col of LIBERIA_PERIOD_COLUMNS) {
    if (col.aliases.some((a) => a === raw || raw.includes(a))) return col.key;
  }
  for (const col of LIBERIA_EXAM_COLUMNS) {
    if (col.aliases.some((a) => a === raw || raw.includes(a))) return col.key;
  }
  return null;
}
