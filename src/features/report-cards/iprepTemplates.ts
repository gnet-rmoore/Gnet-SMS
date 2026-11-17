export const IPREP_PROGRESS_CLASSIC = "INTL_IPREP_PROGRESS_CLASSIC";
export const IPREP_PROGRESS_MODERN = "INTL_IPREP_PROGRESS_MODERN";
export const IPREP_SEMESTER_BOOKLET = "LR_IPREP_SEMESTER_BOOKLET";

export const IPREP_REPORT_CARD_KEYS = [
  IPREP_PROGRESS_CLASSIC,
  IPREP_PROGRESS_MODERN,
  IPREP_SEMESTER_BOOKLET,
] as const;

export type IprepReportCardKey = (typeof IPREP_REPORT_CARD_KEYS)[number];

export const DEFAULT_REPORT_CARD_TEMPLATE_KEY = IPREP_PROGRESS_CLASSIC;

export function isIprepProgressTemplate(keyOrLegacy?: string | null): boolean {
  return (
    keyOrLegacy === IPREP_PROGRESS_CLASSIC ||
    keyOrLegacy === IPREP_PROGRESS_MODERN ||
    keyOrLegacy === "TEMPLATE_1" ||
    keyOrLegacy === "TEMPLATE_2"
  );
}

export function isIprepSemesterBookletTemplate(keyOrLegacy?: string | null): boolean {
  return keyOrLegacy === IPREP_SEMESTER_BOOKLET || keyOrLegacy === "TEMPLATE_3";
}

export function isIprepReportCardTemplate(keyOrLegacy?: string | null): boolean {
  return isIprepProgressTemplate(keyOrLegacy) || isIprepSemesterBookletTemplate(keyOrLegacy);
}

export function iprepProgressVariant(
  keyOrLegacy?: string | null
): "classic" | "modern" {
  return keyOrLegacy === IPREP_PROGRESS_MODERN || keyOrLegacy === "TEMPLATE_2"
    ? "modern"
    : "classic";
}
