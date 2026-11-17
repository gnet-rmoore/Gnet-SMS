import type { GradeScaleRow } from "../../lib/gradeLegend";

export const IPREP_LEGEND_SCALES: GradeScaleRow[] = [
  { minScore: 95, maxScore: 100, gradeLetter: "A+", gpaPoints: 4, remark: "Academic Excellence" },
  { minScore: 90, maxScore: 94, gradeLetter: "A", gpaPoints: 3.5, remark: "Exceptional Performance" },
  { minScore: 85, maxScore: 89, gradeLetter: "B+", gpaPoints: 3, remark: "Excellent Performance" },
  { minScore: 80, maxScore: 84, gradeLetter: "B-", gpaPoints: 2.5, remark: "Great Performance" },
  { minScore: 75, maxScore: 79, gradeLetter: "C", gpaPoints: 2, remark: "Satisfactorily / Average Performance" },
  { minScore: 70, maxScore: 74, gradeLetter: "D", gpaPoints: 1.5, remark: "Below Average Performance" },
  { minScore: 60, maxScore: 69, gradeLetter: "F", gpaPoints: 1, remark: "Failed (Needs Serious Improvement)" },
];

export function iprepLegendFor(
  legends?: { scales: GradeScaleRow[] }[] | null
): GradeScaleRow[] {
  return legends?.length ? legends[0].scales : IPREP_LEGEND_SCALES;
}
