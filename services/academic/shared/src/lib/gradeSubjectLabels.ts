export type GradeLevelNameIssue = "section" | "composed" | null;

export const GRADE_LEVEL_NAME_ERROR =
  'Use a plain grade level like "Grade 8"; create sections like "Grade 8A" as class groups. A canonical grade level name is required.';

export const SUBJECT_NAME_ERROR =
  'Use a plain subject name like "Mathematics"; create sections like "Grade 8A" as class groups. A subject name without a class-room prefix is required.';

export type ParsedGrade = {
  canonical: string;
  raw: string;
  sectionSuffix: string | null;
  isGradeLike: boolean;
  isComposed: boolean;
};

const GRADE_PATTERN =
  /^\s*(?:grade|class|year|form)[\s-]+(\d{1,2})(?!\d)[\s-]*([a-z]{1,3})?\s*$/i;
const BARE_SECTION_PATTERN = /^\s*(\d{1,2})(?!\d)\s*-?\s*([a-z]{1,3})\s*$/i;
const ORDINAL_SUFFIXES = new Set(["st", "nd", "rd", "th"]);
const CLASS_PREFIX = /^(?:grade|class|year|form|section|homeroom)\b/i;
const EXPLICIT_CLASS_PREFIX = /^(?:section|homeroom)\b/i;

function splitLabelParts(value: unknown): string[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];

  const parts: string[] = [];
  let current = "";
  const chars = raw.split("");

  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];
    if (char === "-" || char === "–" || char === "—") {
      const hasWhitespace = /\s/.test(chars[i - 1] ?? "") || /\s/.test(chars[i + 1] ?? "");
      const nextIsClass = CLASS_PREFIX.test(raw.slice(i + 1).trim());
      if (hasWhitespace || nextIsClass) {
        parts.push(current.trim());
        current = "";
        while (/\s/.test(chars[i + 1] ?? "")) i += 1;
        continue;
      }
    }
    current += char;
  }

  parts.push(current.trim());
  return parts.filter(Boolean);
}

function parseGradePart(value: string): ParsedGrade | null {
  const raw = value.trim();
  if (!raw) return null;

  const prefixed = GRADE_PATTERN.exec(raw);
  if (prefixed) {
    const suffix = prefixed[2] ? prefixed[2].toUpperCase() : null;
    if (suffix && ORDINAL_SUFFIXES.has(suffix.toLowerCase())) return null;
    return {
      canonical: `Grade ${prefixed[1]}`,
      raw,
      sectionSuffix: suffix,
      isGradeLike: true,
      isComposed: false,
    };
  }

  const bare = BARE_SECTION_PATTERN.exec(raw);
  if (bare) {
    return {
      canonical: `Grade ${bare[1]}`,
      raw,
      sectionSuffix: bare[2].toUpperCase(),
      isGradeLike: true,
      isComposed: false,
    };
  }

  return null;
}

export function parseGradeLabel(value: unknown): ParsedGrade {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return {
      canonical: "",
      raw,
      sectionSuffix: null,
      isGradeLike: false,
      isComposed: false,
    };
  }

  const parsed = parseGradePart(raw);
  if (parsed) return parsed;

  const parts = splitLabelParts(raw);
  if (parts.length > 1) {
    const firstGrade = parseGradePart(parts[0]);
    if (firstGrade) return { ...firstGrade, isComposed: true };
  }

  return {
    canonical: raw,
    raw,
    sectionSuffix: null,
    isGradeLike: false,
    isComposed: false,
  };
}

export function canonicalGradeName(value: unknown): string {
  return parseGradeLabel(value).canonical;
}

export function gradeSectionSuffix(value: unknown): string | null {
  return parseGradeLabel(value).sectionSuffix;
}

export function isSectionGradeName(value: unknown): boolean {
  const whole = parseGradePart(String(value ?? "").trim());
  if (whole?.sectionSuffix != null) return true;
  return splitLabelParts(value).some((part) => parseGradePart(part)?.sectionSuffix != null);
}

export type GradeOption<T> = Omit<T, "label" | "canonicalName" | "sectionSuffix"> & {
  label: string;
  canonicalName: string;
  sectionSuffix: string | null;
};

export function buildGradeOptions<T extends { id?: string; name?: string | null }>(
  grades: T[]
): GradeOption<T>[] {
  const byCanonical = new Map<string, { option: GradeOption<T>; index: number }>();

  grades.forEach((grade, index) => {
    const parsed = parseGradeLabel(grade.name);
    if (!parsed.canonical) return;

    const key = parsed.canonical.toLowerCase();
    const current = byCanonical.get(key);
    const candidate: GradeOption<T> = {
      ...grade,
      label: parsed.canonical,
      canonicalName: parsed.canonical,
      sectionSuffix: parsed.sectionSuffix,
    };

    if (!current) {
      byCanonical.set(key, { option: candidate, index });
      return;
    }

    const currentIsExact =
      current.option.canonicalName.toLowerCase() ===
      String(current.option.name ?? "").trim().toLowerCase();
    const candidateIsExact =
      parsed.canonical.toLowerCase() === String(grade.name ?? "").trim().toLowerCase();
    if (candidateIsExact && !currentIsExact) {
      byCanonical.set(key, { option: candidate, index });
    }
  });

  return Array.from(byCanonical.values())
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.option);
}

export function gradeOptionLabel(value: unknown): string {
  return canonicalGradeName(value);
}

export function hasComposedSeparator(value: unknown): boolean {
  return splitLabelParts(value).length > 1;
}

export function isClassRoomLabel(value: unknown): boolean {
  const parts = splitLabelParts(value);
  if (parts.length === 0) return false;
  return parts.some((part) => parseGradePart(part) != null || EXPLICIT_CLASS_PREFIX.test(part));
}

export function isComposedSubjectName(value: unknown): boolean {
  const parts = splitLabelParts(value);
  if (parts.length < 2) return false;
  const hasClass = parts.some((part) => isClassRoomLabel(part));
  const hasSubject = parts.some((part) => !isClassRoomLabel(part));
  return hasClass && hasSubject;
}

export function canonicalSubjectName(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const parts = splitLabelParts(raw);
  if (parts.length < 2) return raw;

  const subjectParts = parts.filter((part) => !isClassRoomLabel(part));
  if (subjectParts.length > 0 && parts.some((part) => isClassRoomLabel(part))) {
    return subjectParts.join(" - ");
  }

  return raw;
}

export type SubjectOption<T> = Omit<T, "label" | "canonicalName"> & {
  label: string;
  canonicalName: string;
};

export function buildSubjectOptions<T extends { id?: string; name?: string | null }>(
  subjects: T[]
): SubjectOption<T>[] {
  const byCanonical = new Map<string, { option: SubjectOption<T>; index: number }>();

  subjects.forEach((subject, index) => {
    const canonical = canonicalSubjectName(subject.name);
    if (!canonical) return;

    const key = canonical.toLowerCase();
    const current = byCanonical.get(key);
    const candidate: SubjectOption<T> = {
      ...subject,
      label: canonical,
      canonicalName: canonical,
    };

    if (!current) {
      byCanonical.set(key, { option: candidate, index });
      return;
    }

    const currentIsExact =
      current.option.canonicalName.toLowerCase() ===
      String(current.option.name ?? "").trim().toLowerCase();
    const candidateIsExact =
      canonical.toLowerCase() === String(subject.name ?? "").trim().toLowerCase();
    if (candidateIsExact && !currentIsExact) {
      byCanonical.set(key, { option: candidate, index });
    }
  });

  return Array.from(byCanonical.values())
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.option);
}

export function subjectOptionLabel(value: unknown): string {
  return canonicalSubjectName(value);
}

export function subjectRoomLabel(roomName: unknown, subjectName: unknown): string {
  const room = String(roomName ?? "").trim();
  const subject = canonicalSubjectName(subjectName);
  if (!room) return subject;
  if (!subject) return room;

  const roomParts = splitLabelParts(room);
  const subjectParts = splitLabelParts(subject);
  const alreadyContainsSubject = subjectParts.every((part) =>
    roomParts.some((roomPart) => roomPart.toLowerCase() === part.toLowerCase())
  );
  if (alreadyContainsSubject) return room;

  return `${room} - ${subject}`;
}

export function reportGradeLabel(gradeName: unknown, classLabel?: unknown): string {
  const gradeRaw = String(gradeName ?? "").trim();
  const gradeParsed = parseGradeLabel(gradeName);
  if (gradeParsed.isGradeLike) return gradeParsed.canonical;
  if (gradeRaw) return gradeRaw;

  const classRaw = String(classLabel ?? "").trim();
  const classParsed = parseGradeLabel(classLabel);
  if (classParsed.isGradeLike) return classParsed.canonical;
  return classRaw || "";
}

export function gradeLevelNameIssue(value: unknown): GradeLevelNameIssue {
  const name = String(value ?? "").trim();
  if (parseGradePart(name)?.sectionSuffix != null) return "section";
  if (isComposedSubjectName(name)) return "composed";
  if (isSectionGradeName(name)) return "section";
  return null;
}

export function assertValidGradeLevelName(value: unknown): void {
  if (gradeLevelNameIssue(value)) throw new Error(GRADE_LEVEL_NAME_ERROR);
}

export function assertValidSubjectName(value: unknown): void {
  if (isComposedSubjectName(value)) throw new Error(SUBJECT_NAME_ERROR);
}
