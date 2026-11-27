type ParsedGrade = {
  canonical: string;
  sectionSuffix: string | null;
  isGradeLike: boolean;
};

const GRADE_WITH_SECTION = /^\s*(grade|class|year)?[\s\-]*(\d{1,2})(?!\d)[\s\-]*([a-z]{1,3})?\b/i;

export function parseGradeLabel(value: unknown): ParsedGrade {
  const raw = String(value ?? "").trim();
  const match = GRADE_WITH_SECTION.exec(raw);

  if (!match) {
    return { canonical: raw, sectionSuffix: null, isGradeLike: false };
  }

  const prefix = (match[1] || "grade").toLowerCase();
  const number = match[2];
  const suffix = match[3] ? match[3].toUpperCase() : null;
  const label = prefix === "class" ? "grade" : prefix;

  return {
    canonical: `${label.charAt(0).toUpperCase()}${label.slice(1)} ${number}`,
    sectionSuffix: suffix,
    isGradeLike: true,
  };
}

export function canonicalGradeName(value: unknown): string {
  return parseGradeLabel(value).canonical;
}

export function gradeSectionSuffix(value: unknown): string | null {
  return parseGradeLabel(value).sectionSuffix;
}

export function isSectionGradeName(value: unknown): boolean {
  return parseGradeLabel(value).sectionSuffix !== null;
}

export type GradeOption<T> = T & {
  label: string;
  canonicalName: string;
  sectionSuffix: string | null;
};

export function buildGradeOptions<T extends { id?: string; name?: string | null }>(
  grades: T[]
): GradeOption<T>[] {
  const byCanonical = new Map<string, GradeOption<T>>();

  grades.forEach((grade) => {
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
      byCanonical.set(key, candidate);
      return;
    }

    const currentIsExact = current.sectionSuffix === null;
    const candidateIsExact = candidate.sectionSuffix === null;
    if (candidateIsExact && !currentIsExact) {
      byCanonical.set(key, candidate);
    }
  });

  return Array.from(byCanonical.values());
}

export function gradeOptionLabel(value: unknown): string {
  return canonicalGradeName(value);
}

const SUBJECT_SEPARATOR = /\s+[-–—]\s+/;

function looksLikeClassLabel(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (parseGradeLabel(trimmed).isGradeLike) return true;
  return /^(class|section|homeroom|grade|year)\b/i.test(trimmed);
}

export function canonicalSubjectName(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const parts = raw.split(SUBJECT_SEPARATOR).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return raw;

  const classParts = parts.filter(looksLikeClassLabel);
  const subjectParts = parts.filter((part) => !looksLikeClassLabel(part));

  if (classParts.length > 0 && subjectParts.length > 0) {
    return subjectParts.join(" - ");
  }

  return raw;
}

export type SubjectOption<T> = T & { label: string; canonicalName: string };

export function buildSubjectOptions<T extends { id?: string; name?: string | null }>(
  subjects: T[]
): SubjectOption<T>[] {
  const byCanonical = new Map<string, SubjectOption<T>>();

  subjects.forEach((subject) => {
    const canonical = canonicalSubjectName(subject.name);
    if (!canonical) return;

    const key = canonical.toLowerCase();
    const current = byCanonical.get(key);
    const candidate: SubjectOption<T> = { ...subject, label: canonical, canonicalName: canonical };

    if (!current || canonical === String(subject.name ?? "").trim()) {
      byCanonical.set(key, candidate);
    }
  });

  return Array.from(byCanonical.values());
}

export function subjectOptionLabel(value: unknown): string {
  return canonicalSubjectName(value);
}

export function subjectRoomLabel(roomName: unknown, subjectName: unknown): string {
  const room = String(roomName ?? "").trim();
  const subject = canonicalSubjectName(subjectName);
  if (!room) return subject;
  if (!subject) return room;
  if (room.toLowerCase().includes(subject.toLowerCase())) return room;
  return `${room} - ${subject}`;
}

export function reportGradeLabel(gradeName: unknown, classLabel?: unknown): string {
  const fromGrade = canonicalGradeName(gradeName);
  if (fromGrade) return fromGrade;
  return canonicalGradeName(classLabel);
}
