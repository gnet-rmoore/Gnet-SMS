const REPORT_CARD_TEMPLATE_IDS = new Set([
  "INTL_IPREP_PROGRESS_CLASSIC",
  "INTL_IPREP_PROGRESS_MODERN",
  "LR_IPREP_SEMESTER_BOOKLET",
  "LR_IPREP_SEMESTER_BIFOLD",
  "INTL_WISTERIA_GREEN",
  "INTL_WISTERIA_NAVY",
  "INTL_STANDARD_TERM",
  "INTL_EXECUTIVE",
  "INTL_BRITISH",
  "INTL_AMERICAN",
  "INTL_IB",
  "INTL_CAMBRIDGE",
  "INTL_NORDIC",
  "INTL_EUROPEAN",
  "INTL_ASIA_PACIFIC",
  "INTL_PRIMARY",
  "TEMPLATE_1",
  "TEMPLATE_2",
  "TEMPLATE_3",
  "TEMPLATE_4",
  "TEMPLATE_5",
  "TEMPLATE_6",
  "TEMPLATE_7",
  "TEMPLATE_8",
  "TEMPLATE_9",
  "TEMPLATE_10",
]);

export function normalizeReportCardTemplateId(value: unknown): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
}

export function isKnownReportCardTemplateId(value: unknown): boolean {
  return REPORT_CARD_TEMPLATE_IDS.has(normalizeReportCardTemplateId(value));
}
