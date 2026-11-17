export const IPREP_PROGRESS_CLASSIC = "INTL_IPREP_PROGRESS_CLASSIC";
export const IPREP_PROGRESS_MODERN = "INTL_IPREP_PROGRESS_MODERN";
export const IPREP_SEMESTER_BOOKLET = "LR_IPREP_SEMESTER_BOOKLET";

const CANONICAL_KEYS = new Set([
  IPREP_PROGRESS_CLASSIC,
  IPREP_PROGRESS_MODERN,
  IPREP_SEMESTER_BOOKLET,
  "INTL_WISTERIA_GREEN",
  "INTL_WISTERIA_NAVY",
  "INTL_STANDARD_TERM",
  "INTL_EXECUTIVE",
]);

const LEGACY_KEYS: Record<string, string> = {
  TEMPLATE_1: IPREP_PROGRESS_CLASSIC,
  TEMPLATE_2: IPREP_PROGRESS_MODERN,
  TEMPLATE_3: IPREP_SEMESTER_BOOKLET,
};

export function normalizeReportCardKey(value?: string | null): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
}

export function resolveReportCardTemplateKey(value?: string | null): string {
  const key = normalizeReportCardKey(value);
  if (CANONICAL_KEYS.has(key)) return key;
  if (LEGACY_KEYS[key]) return LEGACY_KEYS[key];
  return IPREP_PROGRESS_CLASSIC;
}

export function isIprepProgressTemplate(value?: string | null): boolean {
  const key = resolveReportCardTemplateKey(value);
  return key === IPREP_PROGRESS_CLASSIC || key === IPREP_PROGRESS_MODERN;
}

export function isIprepSemesterBookletTemplate(value?: string | null): boolean {
  return resolveReportCardTemplateKey(value) === IPREP_SEMESTER_BOOKLET;
}

export function isIprepReportCardTemplate(value?: string | null): boolean {
  return isIprepProgressTemplate(value) || isIprepSemesterBookletTemplate(value);
}

export function iprepProgressVariant(value?: string | null): "classic" | "modern" {
  return resolveReportCardTemplateKey(value) === IPREP_PROGRESS_MODERN ? "modern" : "classic";
}
