import type { ReportCardRegion, ReportCardTemplateDef } from "./types";

export const REPORT_CARD_TEMPLATES: ReportCardTemplateDef[] = [
  /* ——— International (10 professional A4 single-page packs) ——— */
  {
    key: "INTL_STANDARD_TERM",
    region: "INTL",
    label: "Standard term report",
    description: "Clean modern A4 term report with marks, letters, and remarks.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
    legacyId: "TEMPLATE_1",
  },
  {
    key: "INTL_BRITISH",
    region: "INTL",
    label: "British excellence",
    description: "Navy Cambridge-style layout with attainment + mark columns.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
    legacyId: "TEMPLATE_2",
  },
  {
    key: "INTL_AMERICAN",
    region: "INTL",
    label: "American transcript",
    description: "US high-school transcript aesthetic with course grid and GPA slot.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
    legacyId: "TEMPLATE_3",
  },
  {
    key: "INTL_IB",
    region: "INTL",
    label: "IB diploma style",
    description: "IB-inspired criteria report with 1–7 subject grades.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
    legacyId: "TEMPLATE_4",
  },
  {
    key: "INTL_CAMBRIDGE",
    region: "INTL",
    label: "Cambridge pathway",
    description: "Formal Cambridge IGCSE-style statement with A*–G bands.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
    legacyId: "TEMPLATE_5",
  },
  {
    key: "INTL_NORDIC",
    region: "INTL",
    label: "Nordic competence",
    description: "Minimal Scandinavian competence report — calm, sparse, precise.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
    legacyId: "TEMPLATE_6",
  },
  {
    key: "INTL_EUROPEAN",
    region: "INTL",
    label: "European formal",
    description: "Continental formal bulletin with dual-column subject table.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
    legacyId: "TEMPLATE_7",
  },
  {
    key: "INTL_ASIA_PACIFIC",
    region: "INTL",
    label: "Asia-Pacific academic",
    description: "Dense precision layout common in Asia-Pacific exam schools.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
    legacyId: "TEMPLATE_8",
  },
  {
    key: "INTL_PRIMARY",
    region: "INTL",
    label: "Primary progress",
    description: "Warm professional primary progress card with skill bands.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
    legacyId: "TEMPLATE_9",
  },
  {
    key: "INTL_EXECUTIVE",
    region: "INTL",
    label: "Executive brief",
    description: "Board-ready one-page executive summary for leadership review.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
    legacyId: "TEMPLATE_10",
  },
  {
    key: "INTL_WISTERIA_GREEN",
    region: "INTL",
    label: "Green academic quarterly",
    description: "Dark-green bordered A4 with 1st–4th subject columns, attendance, and grading legend.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
  },
  {
    key: "INTL_WISTERIA_NAVY",
    region: "INTL",
    label: "Navy bordered quarterly",
    description: "Navy side-bar A4 quarterly card with sage tables and teacher comments panel.",
    audience: "BOTH",
    calendarAffinity: ["ANY"],
    pages: ["GRADES"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
  },

  /* ——— Liberia ——— */
  {
    key: "LR_PRIVATE_TWO_SEM_A",
    region: "LR",
    label: "Liberia private (promote A–E)",
    description: "Cover, grades, and promotion with probation option.",
    audience: "PRIVATE",
    calendarAffinity: ["SEMESTER", "ANY"],
    pages: ["COVER", "GRADES", "PROMOTION"],
    promotionScheme: "A_E",
    branding: "SCHOOL_LOGO",
    documentTitle: "SENIOR HIGH PROGRESS REPORT CARD",
    divisionTitle: "SENIOR HIGH DIVISION",
  },
  {
    key: "LR_PRIVATE_TWO_SEM_B",
    region: "LR",
    label: "Liberia private (promote A–D)",
    description: "YMCA-style cover and A–D promotion statement.",
    audience: "PRIVATE",
    calendarAffinity: ["SEMESTER", "ANY"],
    pages: ["COVER", "GRADES", "PROMOTION"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO",
    documentTitle: "STUDENT'S YEARLY REPORT CARD",
    divisionTitle: "SENIOR HIGH DIVISION",
  },
  {
    key: "LR_PUBLIC_MOE_TWO_SEM",
    region: "LR",
    label: "Liberia public (MoE)",
    description: "Public senior secondary card with MoE seals.",
    audience: "PUBLIC",
    calendarAffinity: ["SEMESTER", "ANY"],
    pages: ["COVER", "GRADES", "PROMOTION"],
    promotionScheme: "A_D",
    branding: "SCHOOL_LOGO_PLUS_MOE",
    documentTitle: "PUBLIC SENIOR SECONDARY SCHOOL REPORT CARD",
  },
  {
    key: "LR_PRIVATE_WITH_SCALE",
    region: "LR",
    label: "Liberia private + grading chart",
    description: "Cover, grades matrix, grading system page, promotion A–E.",
    audience: "PRIVATE",
    calendarAffinity: ["SEMESTER", "ANY"],
    pages: ["COVER", "GRADES", "GRADING_SYSTEM", "PROMOTION"],
    promotionScheme: "A_E",
    branding: "SCHOOL_LOGO",
    documentTitle: "SENIOR HIGH PROGRESS REPORT CARD",
    divisionTitle: "SENIOR HIGH DIVISION",
  },
];

const byKey = new Map(REPORT_CARD_TEMPLATES.map((t) => [t.key, t]));
const byLegacy = new Map(
  REPORT_CARD_TEMPLATES.filter((t) => t.legacyId).map((t) => [t.legacyId!, t])
);

/** Resolve stored school.reportCardTemplate (legacy TEMPLATE_n or LR_*) */
export function resolveReportCardTemplateKey(stored?: string | null): string {
  const raw = (stored || "TEMPLATE_1").trim();
  if (byKey.has(raw)) return raw;
  if (byLegacy.has(raw)) return byLegacy.get(raw)!.key;
  if (raw.startsWith("TEMPLATE_")) return "INTL_STANDARD_TERM";
  return "INTL_STANDARD_TERM";
}

export function getReportCardTemplateDef(keyOrLegacy?: string | null): ReportCardTemplateDef {
  const key = resolveReportCardTemplateKey(keyOrLegacy);
  return byKey.get(key) || byKey.get("INTL_STANDARD_TERM")!;
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
  return regions.map((region) => ({
    region,
    label: REGION_LABELS[region],
    items: reportCardsByRegion(region),
  }));
}
