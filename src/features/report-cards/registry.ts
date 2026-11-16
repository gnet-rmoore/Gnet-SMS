import type { ReportCardRegion, ReportCardTemplateDef } from "./types";

export const REPORT_CARD_TEMPLATES: ReportCardTemplateDef[] = [
  {
    key: "INTL_WISTERIA_GREEN",
    region: "INTL",
    label: "Wisteria Green Quarterly",
    description:
      "Fresh green academic report with period columns, attendance, grading scale, and teacher feedback — ideal for term/quarter progress.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
  },
  {
    key: "INTL_WISTERIA_NAVY",
    region: "INTL",
    label: "Wisteria Navy Quarterly",
    description:
      "Structured navy-bordered quarterly report with clear subject grid, period averages, grading system, and comments panel.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
  },
  {
    key: "INTL_STANDARD_TERM",
    region: "INTL",
    label: "Standard Term Summary",
    description:
      "Clean single-page term report with marks, grades, status, and remarks — a balanced choice for routine assessments.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
  },
  {
    key: "INTL_EXECUTIVE",
    region: "INTL",
    label: "Executive Performance Brief",
    description:
      "Modern leadership-style brief highlighting strengths, focus areas, overall mean, and concise subject performance.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
  },
];

const byKey = new Map(REPORT_CARD_TEMPLATES.map((t) => [t.key, t]));
const byLegacy = new Map(
  REPORT_CARD_TEMPLATES.filter((t) => t.legacyId).map((t) => [t.legacyId!, t])
);

/** Resolve stored school.reportCardTemplate — removed templates fall back to Wisteria Green. */
export function resolveReportCardTemplateKey(stored?: string | null): string {
  const raw = (stored || "").trim();
  if (byKey.has(raw)) return raw;
  if (byLegacy.has(raw)) return byLegacy.get(raw)!.key;
  return "INTL_WISTERIA_GREEN";
}

export function getReportCardTemplateDef(keyOrLegacy?: string | null): ReportCardTemplateDef {
  const key = resolveReportCardTemplateKey(keyOrLegacy);
  return byKey.get(key) || byKey.get("INTL_WISTERIA_GREEN")!;
}

export function isLiberianReportCardTemplate(keyOrLegacy?: string | null): boolean {
  return getReportCardTemplateDef(keyOrLegacy).region === "LR";
}

export function isInternationalReportCardTemplate(keyOrLegacy?: string | null): boolean {
  return getReportCardTemplateDef(keyOrLegacy).region === "INTL";
}

/** Key used for Identity persistence / renderer branch (prefer LR_* or TEMPLATE_n). */
export function persistableReportCardKey(def: ReportCardTemplateDef): string {
  return def.legacyId || def.key;
}

export function reportCardsByRegion(region?: ReportCardRegion): ReportCardTemplateDef[] {
  if (!region) return REPORT_CARD_TEMPLATES;
  return REPORT_CARD_TEMPLATES.filter((t) => t.region === region);
}

export const REGION_LABELS: Record<ReportCardRegion, string> = {
  LR: "Liberia",
  US: "United States",
  EU: "Europe",
  AFR: "Africa (other)",
  AS: "Asia",
  INTL: "International",
};

/** Settings picker groups that currently have templates */
export function reportCardPickerGroups(): Array<{
  region: ReportCardRegion;
  label: string;
  items: ReportCardTemplateDef[];
}> {
  const regions: ReportCardRegion[] = ["LR", "INTL"];
  return regions
    .map((region) => ({
      region,
      label: REGION_LABELS[region],
      items: reportCardsByRegion(region),
    }))
    .filter((g) => g.items.length > 0);
}
