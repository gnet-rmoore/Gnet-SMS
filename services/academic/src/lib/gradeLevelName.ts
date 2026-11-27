export type GradeLevelNameIssue = "section" | "composed" | null;

export const GRADE_LEVEL_NAME_ERROR =
  'Use a plain grade level like "Grade 8"; create sections like "Grade 8A" as class groups. A canonical grade level name is required.';

export const SUBJECT_NAME_ERROR =
  'Use a plain subject name like "Mathematics"; create sections like "Grade 8A" as class groups. A subject name without a class-room prefix is required.';

const SECTION_GRADE = /^\s*(?:grade|class|year)?\s*-?\s*\d{1,2}(?!\d)\s*-?\s*[a-z][a-z0-9]*\b/i;
const COMPOSED_SEPARATOR = /\s[-–—]\s/;
const CLASS_LABEL_PREFIX = /^(?:grade|class|year|section|homeroom)\b/i;

export function isSectionGradeName(value: unknown): boolean {
  return SECTION_GRADE.test(String(value ?? "").trim());
}

export function hasComposedSeparator(value: unknown): boolean {
  return COMPOSED_SEPARATOR.test(String(value ?? "").trim());
}

export function gradeLevelNameIssue(value: unknown): GradeLevelNameIssue {
  const name = String(value ?? "").trim();
  if (hasComposedSeparator(name)) return "composed";
  if (isSectionGradeName(name)) return "section";
  return null;
}

export function assertValidGradeLevelName(value: unknown): void {
  if (gradeLevelNameIssue(value)) throw new Error(GRADE_LEVEL_NAME_ERROR);
}

export function isClassRoomLabel(value: unknown): boolean {
  const name = String(value ?? "").trim();
  return SECTION_GRADE.test(name) || CLASS_LABEL_PREFIX.test(name);
}

export function isComposedSubjectName(value: unknown): boolean {
  const name = String(value ?? "").trim();
  if (!COMPOSED_SEPARATOR.test(name)) return false;
  const parts = name.split(COMPOSED_SEPARATOR).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return false;
  const classParts = parts.filter(isClassRoomLabel);
  const subjectParts = parts.filter((part) => !isClassRoomLabel(part));
  return classParts.length > 0 && subjectParts.length > 0;
}

export function assertValidSubjectName(value: unknown): void {
  if (isComposedSubjectName(value)) throw new Error(SUBJECT_NAME_ERROR);
}
