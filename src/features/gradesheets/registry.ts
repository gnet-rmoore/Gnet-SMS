import type { GradeSheetTemplateDef, GradeSheetTemplateId } from "./types";

export const GRADE_SHEET_TEMPLATES: GradeSheetTemplateDef[] = [
  {
    id: "TEMPLATE_1",
    name: "Classic ledger",
    description: "Formal certificate-style report. A4 · 210 × 297 mm.",
    pageSize: "a4",
    pdfFormat: "a4",
    cssPageSize: "A4",
    sheetMm: { width: 210, height: 297 },
  },
  {
    id: "TEMPLATE_2",
    name: "Modern mastery",
    description: "Performance bars and KPIs. A4 · 210 × 297 mm.",
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
  if (raw === "TEMPLATE_1" || raw === "TEMPLATE_2") {
    return raw;
  }
  return "TEMPLATE_1";
}

export function getGradeSheetTemplateDef(
  raw: string | null | undefined
): GradeSheetTemplateDef {
  return byId[resolveGradeSheetTemplateKey(raw)];
}
