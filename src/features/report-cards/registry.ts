import {
  DEFAULT_REPORT_CARD_TEMPLATE_KEY,
  IPREP_PROGRESS_CLASSIC,
  IPREP_PROGRESS_MODERN,
  IPREP_SEMESTER_BOOKLET,
} from "./iprepTemplates";
import type { ReportCardRegion, ReportCardTemplateDef } from "./types";

export const REPORT_CARD_TEMPLATES: ReportCardTemplateDef[] = [
  {
    key: IPREP_PROGRESS_CLASSIC,
    region: "INTL",
    label: "IPREP Academic Progress — Classic",
    description:
      "Black-and-white single-page academic progress report with three terms, grading scale, conduct ratings, promotion certificate, and official signatures.",
    audience: "BOTH",
    calendarAffinity: ["THREE_TERM", "ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
    legacyId: "TEMPLATE_1",
    documentTitle: "ACADEMIC PROGRESS REPORT",
  },
  {
    key: IPREP_PROGRESS_MODERN,
    region: "INTL",
    label: "IPREP Academic Progress — Modern",
    description:
      "Purple single-page progress report with term bars, performance snapshots, conduct ratings, grading legend, promotion certificate, and signatures.",
    audience: "BOTH",
    calendarAffinity: ["THREE_TERM", "ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
    legacyId: "TEMPLATE_2",
    documentTitle: "Academic Progress Report",
  },
  {
    key: IPREP_SEMESTER_BOOKLET,
    region: "LR",
    label: "IPREP Liberian Semester Booklet",
    description:
      "Three-page A4 portrait Liberian learner booklet with cover, two-semester marks matrix, grading system, promotion record, and official signatures.",
    audience: "BOTH",
    calendarAffinity: ["SEMESTER"],
    pages: ["COVER", "GRADES", "GRADING_SYSTEM", "PROMOTION"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
    legacyId: "TEMPLATE_3",
    documentTitle: "Learner Progress Report",
  },
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

/** Canonical form for stored keys: uppercase, hyphens/whitespace → underscores. */
export function normalizeTemplateKey(raw?: string | null): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, "_");
}

const byKey = new Map(
  REPORT_CARD_TEMPLATES.map((t) => [normalizeTemplateKey(t.key), t])
);
const byLegacy = new Map(
  REPORT_CARD_TEMPLATES.filter((t) => t.legacyId).map((t) => [
    normalizeTemplateKey(t.legacyId!),
    t,
  ])
);

/** Resolve stored school.reportCardTemplate — removed templates fall back to the IPREP classic report. */
export function resolveReportCardTemplateKey(stored?: string | null): string {
  const raw = normalizeTemplateKey(stored);
  if (!raw) return DEFAULT_REPORT_CARD_TEMPLATE_KEY;
  const canonical = byKey.get(raw) || byLegacy.get(raw);
  return canonical ? canonical.key : DEFAULT_REPORT_CARD_TEMPLATE_KEY;
}

export function getReportCardTemplateDef(keyOrLegacy?: string | null): ReportCardTemplateDef {
  const key = resolveReportCardTemplateKey(keyOrLegacy);
  return byKey.get(key) || byKey.get(DEFAULT_REPORT_CARD_TEMPLATE_KEY)!;
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
