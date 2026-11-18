import type { GradeSheetTemplateDef, GradeSheetTemplateId } from "./types";

export const GRADE_SHEET_TEMPLATES: GradeSheetTemplateDef[] = [
  {
    id: "TEMPLATE_1",
    name: "Liberian Classic Grade Sheet",
    description: "Formal certificate-style Liberian grade sheet. A4 · 210 × 297 mm.",
    pageSize: "a4",
    pdfFormat: "a4",
    cssPageSize: "A4",
    sheetMm: { width: 210, height: 297 },
  },
  {
    id: "TEMPLATE_2",
    name: "Liberian Modern Grade Sheet",
    description: "Liberian grade sheet with performance bars and KPIs. A4 · 210 × 297 mm.",
    pageSize: "a4",
    pdfFormat: "a4",
    cssPageSize: "A4",
    sheetMm: { width: 210, height: 297 },
  },
  {
    id: "INTL_STANDARD_TERM",
    name: "Liberian Term Grade Sheet",
    description: "Liberian single-term grade sheet with marks, grades, status, and remarks. A4 · 210 × 297 mm.",
    pageSize: "a4",
    pdfFormat: "a4",
    cssPageSize: "A4",
    sheetMm: { width: 210, height: 297 },
  },
  {
    id: "INTL_EXECUTIVE",
    name: "Liberian Executive Grade Sheet",
    description: "Liberian leadership grade sheet with strengths, focus areas, and mean mark. A4 · 210 × 297 mm.",
    pageSize: "a4",
    pdfFormat: "a4",
    cssPageSize: "A4",
    sheetMm: { width: 210, height: 297 },
  },
];

const byId = Object.fromEntries(
  GRADE_SHEET_TEMPLATES.map((t) => [t.id, t])
) as Record<GradeSheetTemplateId, GradeSheetTemplateDef>;

/** Legacy / removed TEMPLATE ids resolve to classic ledger. */
export function resolveGradeSheetTemplateKey(
  raw: string | null | undefined
): GradeSheetTemplateId {
  const normalized = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, "_");
  if (
    normalized === "TEMPLATE_1" ||
    normalized === "TEMPLATE_2" ||
    normalized === "INTL_STANDARD_TERM" ||
    normalized === "INTL_EXECUTIVE"
  ) {
    return normalized;
  }
  return "TEMPLATE_1";
}

export function getGradeSheetTemplateDef(
  raw: string | null | undefined
): GradeSheetTemplateDef {
  return byId[resolveGradeSheetTemplateKey(raw)];
}
