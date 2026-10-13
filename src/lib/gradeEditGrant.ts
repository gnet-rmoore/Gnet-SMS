/** Client-side helpers mirroring academic gradeEditGrant domain (CA detection). */

export function isContinuousAssessmentColumn(col: {
  componentType?: string | null;
  shortCode?: string | null;
  label?: string | null;
}): boolean {
  const norm = (s: string | null | undefined) =>
    String(s || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");
  const type = norm(col.componentType);
  const code = norm(col.shortCode);
  const aliases = new Set([
    "CA",
    "C.A",
    "C.A.",
    "CONTINUOUS",
    "CONTINUOUS_ASSESSMENT",
    "CONTINUOUSASSESSMENT",
    "CASS",
    "CONT",
  ]);
  if (aliases.has(type) || type === "CA") return true;
  if (aliases.has(code)) return true;
  const label = norm(col.label).replace(/_/g, " ");
  if (label.includes("CONTINUOUS") && label.includes("ASSESS")) return true;
  if (label === "CA" || label.startsWith("CA ")) return true;
  return false;
}

export type MineGrant = {
  id: string;
  scope: string;
  classId?: string | null;
  subjectId?: string | null;
  examComponentId?: string | null;
  expiresAt: string;
};

export function grantAllowsPeriodCell(opts: {
  grants: MineGrant[];
  classId: string;
  subjectId?: string | null;
  column: { id: string; componentType?: string | null; shortCode?: string; label?: string };
  cell: { isIncomplete?: boolean };
}): boolean {
  const isCa = isContinuousAssessmentColumn(opts.column);
  for (const g of opts.grants) {
    if (g.classId && g.classId !== opts.classId) continue;
    if (g.subjectId && opts.subjectId && g.subjectId !== opts.subjectId) continue;
    if (g.examComponentId && g.examComponentId !== opts.column.id) continue;
    const caOk =
      (g.scope === "CA" || g.scope === "CA_AND_INCOMPLETE") && isCa;
    const incOk =
      (g.scope === "INCOMPLETE" || g.scope === "CA_AND_INCOMPLETE") &&
      Boolean(opts.cell.isIncomplete);
    if (caOk || incOk) return true;
  }
  return false;
}
