/**
 * Letter / GPA lookup from school grade legends (CLASS category preferred).
 */

export type GradeScaleRow = {
  minScore: number;
  maxScore: number;
  gradeLetter: string;
  gpaPoints?: number;
  remark?: string | null;
};

export type GradeLegendLike = {
  category?: string | null;
  scales: GradeScaleRow[];
};

export const DEFAULT_LETTER_SCALES: GradeScaleRow[] = [
  { minScore: 90, maxScore: 100, gradeLetter: "A", gpaPoints: 4.0, remark: "Excellent" },
  { minScore: 80, maxScore: 89, gradeLetter: "B", gpaPoints: 3.0, remark: "Very Good" },
  { minScore: 70, maxScore: 79, gradeLetter: "C", gpaPoints: 2.0, remark: "Good" },
  { minScore: 60, maxScore: 69, gradeLetter: "D", gpaPoints: 1.0, remark: "Pass" },
  { minScore: 0, maxScore: 59, gradeLetter: "F", gpaPoints: 0.0, remark: "Fail" },
];

export function pickLegendScales(
  legends?: GradeLegendLike[] | null,
  category = "CLASS"
): GradeScaleRow[] {
  if (!Array.isArray(legends) || legends.length === 0) return DEFAULT_LETTER_SCALES;
  const preferred =
    legends.find((l) => (l.category || "CLASS") === category) || legends[0];
  return preferred?.scales?.length ? preferred.scales : DEFAULT_LETTER_SCALES;
}

export function letterFromScore(
  score: number,
  legends?: GradeLegendLike[] | null,
  category = "CLASS"
): string {
  const scales = [...pickLegendScales(legends, category)].sort(
    (a, b) => b.minScore - a.minScore
  );
  const scale = scales.find((s) => score >= s.minScore && score <= s.maxScore);
  return scale?.gradeLetter || "—";
}

export function scaleFromScore(
  score: number,
  legends?: GradeLegendLike[] | null,
  category = "CLASS"
): GradeScaleRow | null {
  const scales = [...pickLegendScales(legends, category)].sort(
    (a, b) => b.minScore - a.minScore
  );
  return scales.find((s) => score >= s.minScore && score <= s.maxScore) || null;
}
