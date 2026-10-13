/** Apply when subject lists are long enough to need tighter print layout. */
export const DENSE_SUBJECT_THRESHOLD = 10;

export function isDenseGradeSheet(subjectCount: number): boolean {
  return subjectCount >= DENSE_SUBJECT_THRESHOLD;
}

export function gradeSheetDensityClass(subjectCount: number): string {
  return isDenseGradeSheet(subjectCount) ? "gs-dense" : "";
}
