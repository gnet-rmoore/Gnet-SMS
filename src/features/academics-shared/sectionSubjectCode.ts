/** Frontend mirror of services/classroom/src/lib/sectionSubjectCode.ts */
export function deriveSectionSuffix(classGroupName: string): string {
  let s = String(classGroupName || "").trim();
  s = s.replace(/^grade\s+/i, "");
  s = s.replace(/[\s\-_]+/g, "");
  s = s.toUpperCase();
  if (!s) {
    s =
      String(classGroupName || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(0, 8) || "SEC";
  }
  return s;
}

export function buildSectionSubjectCode(baseCode: string, classGroupName: string): string {
  const base = String(baseCode || "").trim().toUpperCase();
  if (!base) return "";
  const suffix = deriveSectionSuffix(classGroupName);
  return `${base}-${suffix}`;
}

export function buildSubjectRoomName(classGroupName: string, subjectName: string): string {
  return `${String(classGroupName || "").trim()} - ${String(subjectName || "").trim()}`;
}
