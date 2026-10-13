import type { GradeLegendLike } from "../../../../lib/gradeLegend";
import { letterFromScore } from "../../../../lib/gradeLegend";
import type { IntlGradeRow } from "./shared";

/** Column driven by Academic Calendar period (or Q1–Q4 fallback). */
export type PeriodColumn = {
  key: string;
  label: string;
  shortCode: string;
  orderIndex: number;
  /** Nested exam-component shortCodes that also map into this column */
  componentCodes: string[];
};

/** US-style A+…F bands matching the reference PDFs (display legend). */
export const WISTERIA_GRADE_BANDS: Array<{ letter: string; range: string }> = [
  { letter: "A+", range: "97 - 100" },
  { letter: "A", range: "94 - 96" },
  { letter: "A-", range: "90 - 93" },
  { letter: "B+", range: "87 - 89" },
  { letter: "B", range: "84 - 86" },
  { letter: "B-", range: "80 - 83" },
  { letter: "C+", range: "77 - 79" },
  { letter: "C", range: "74 - 76" },
  { letter: "C-", range: "70 - 73" },
  { letter: "D+", range: "67 - 69" },
  { letter: "D", range: "64 - 66" },
  { letter: "D-", range: "60 - 63" },
  { letter: "F", range: "59 & below" },
];

/** Fallback when school has no Academic Calendar configured. */
export const FALLBACK_QUARTER_COLUMNS: PeriodColumn[] = [
  { key: "Q1", label: "1st", shortCode: "Q1", orderIndex: 0, componentCodes: ["P1", "SEM1_P1", "T1", "TERM1"] },
  { key: "Q2", label: "2nd", shortCode: "Q2", orderIndex: 1, componentCodes: ["P2", "SEM1_P2", "T2", "TERM2"] },
  { key: "Q3", label: "3rd", shortCode: "Q3", orderIndex: 2, componentCodes: ["P3", "SEM1_P3", "SEM2_P1", "T3", "TERM3"] },
  { key: "Q4", label: "4th", shortCode: "Q4", orderIndex: 3, componentCodes: ["P4", "FIN", "FINAL", "EXAM", "SEM2_EX", "T4", "TERM4"] },
];

export type CalendarPeriodInput = {
  id?: string;
  label: string;
  shortCode: string;
  orderIndex?: number;
  periodNumber?: number;
  examComponents?: Array<{ shortCode?: string | null; label?: string | null }>;
};

export function resolvePeriodColumns(
  calendarPeriods?: CalendarPeriodInput[] | null
): PeriodColumn[] {
  if (!calendarPeriods?.length) return FALLBACK_QUARTER_COLUMNS;
  return calendarPeriods
    .map((p, i) => {
      const shortCode = (p.shortCode || `P${i + 1}`).trim();
      const componentCodes = (p.examComponents || [])
        .map((c) => (c.shortCode || "").trim())
        .filter(Boolean);
      return {
        key: p.id || shortCode || `col-${i}`,
        label: shortenPeriodLabel(p.label || shortCode || `Period ${i + 1}`),
        shortCode,
        orderIndex: p.orderIndex ?? p.periodNumber ?? i,
        componentCodes,
      };
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

/** Keep table headers compact (e.g. very long period names). */
function shortenPeriodLabel(label: string): string {
  const t = label.trim();
  if (t.length <= 22) return t;
  // Prefer ordinals already short
  const m = t.match(/^(\d+)(st|nd|rd|th)?\b/i);
  if (m) return m[0];
  return t.slice(0, 20) + "…";
}

export type PeriodSubjectRow = {
  id: string;
  name: string;
  code: string;
  cells: Record<string, number | null>;
};

type GradeWithComponent = IntlGradeRow & {
  examComponent?: { shortCode?: string | null; componentType?: string | null; label?: string | null } | null;
};

function norm(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function columnForCode(columns: PeriodColumn[], code?: string | null): PeriodColumn | null {
  if (!code) return null;
  const n = norm(code);
  for (const col of columns) {
    if (norm(col.shortCode) === n) return col;
    if (col.componentCodes.some((c) => norm(c) === n)) return col;
    // Liberian-style aliases often embed period index
    if (n.includes(norm(col.shortCode)) && norm(col.shortCode).length >= 2) return col;
  }
  return null;
}

function columnForTitle(columns: PeriodColumn[], title?: string | null): PeriodColumn | null {
  const t = (title || "").toLowerCase();
  if (!t) return null;
  for (const col of columns) {
    const label = col.label.toLowerCase();
    const code = col.shortCode.toLowerCase();
    if (label && t.includes(label)) return col;
    if (code && t.includes(code.toLowerCase())) return col;
  }
  // Ordinal / numbered period heuristics against column order
  const numbered =
    t.match(/\b(?:q|quarter|period|term|grading\s*period)\s*([1-4])\b/i) ||
    t.match(/\b([1-4])(?:st|nd|rd|th)\b/i);
  if (numbered) {
    const idx = Number(numbered[1]) - 1;
    if (columns[idx]) return columns[idx];
  }
  if (/\b(4th|fourth)\b/.test(t) && columns[3]) return columns[3];
  if (/\b(3rd|third)\b/.test(t) && columns[2]) return columns[2];
  if (/\b(2nd|second)\b/.test(t) && columns[1]) return columns[1];
  if (/\b(1st|first)\b/.test(t) && columns[0]) return columns[0];
  return null;
}

/**
 * Build subject × period matrix from released grades + Academic Calendar columns.
 */
export function buildPeriodSubjectRows(
  grades: GradeWithComponent[],
  columns: PeriodColumn[],
  examTitle?: string
): PeriodSubjectRow[] {
  const cols = columns.length ? columns : FALLBACK_QUARTER_COLUMNS;
  const fallbackCol = columnForTitle(cols, examTitle) || cols[0];
  const map = new Map<string, PeriodSubjectRow>();

  for (const g of grades) {
    const key = g.subject?.id || g.subject?.code || g.subject?.name || g.id;
    if (!map.has(key)) {
      const cells: Record<string, number | null> = {};
      for (const c of cols) cells[c.key] = null;
      map.set(key, {
        id: key,
        name: g.subject?.name || "Subject",
        code: g.subject?.code || "",
        cells,
      });
    }
    const row = map.get(key)!;
    const fromComp = columnForCode(
      cols,
      g.examComponent?.shortCode || g.examComponent?.componentType || g.examComponent?.label
    );
    const col = fromComp || fallbackCol;
    if (col && typeof g.score === "number" && !Number.isNaN(g.score)) {
      // Prefer first filled; if multi entries in same column, keep latest (overwrite)
      row.cells[col.key] = g.score;
    }
  }

  return [...map.values()];
}

export function periodAverage(
  rows: PeriodSubjectRow[],
  colKey: string
): number | null {
  const vals = rows
    .map((r) => r.cells[colKey])
    .filter((n): n is number => n != null && !Number.isNaN(n));
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export function overallAverage(rows: PeriodSubjectRow[]): number | null {
  const vals: number[] = [];
  for (const r of rows) {
    for (const v of Object.values(r.cells)) {
      if (v != null) vals.push(v);
    }
  }
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export function fmtMark(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function letterForMark(
  n: number | null,
  legends?: GradeLegendLike[] | null
): string {
  if (n == null) return "—";
  return letterFromScore(n, legends);
}

export function schoolInitials(name?: string | null): string {
  const parts = (name || "School").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SC";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function isDenseSubjectList(count: number): boolean {
  return count >= 10;
}

/** Mix tenant brand into a palette; keep PDF defaults when brand missing. */
export function applyTenantBrand(
  base: { ink: string; bar: string; inkSoft?: string },
  brandColor?: string | null
): { ink: string; bar: string; inkSoft: string } {
  const brand = (brandColor || "").trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(brand)) {
    return { ink: base.ink, bar: base.bar, inkSoft: base.inkSoft || base.ink };
  }
  return {
    ink: brand,
    bar: brand,
    inkSoft: base.inkSoft || brand,
  };
}

// —— Back-compat aliases used by older tests / imports ——
export type QuarterKey = string;
export const QUARTER_KEYS = FALLBACK_QUARTER_COLUMNS.map((c) => c.key);
export const QUARTER_LABELS = FALLBACK_QUARTER_COLUMNS.map((c) => c.label);

export function inferQuarterFromCode(code?: string | null): string | null {
  const col = columnForCode(FALLBACK_QUARTER_COLUMNS, code);
  return col?.key ?? null;
}

export function inferQuarterFromTitle(title?: string | null): string {
  return columnForTitle(FALLBACK_QUARTER_COLUMNS, title)?.key || "Q1";
}

export function buildQuarterlySubjectRows(
  grades: GradeWithComponent[],
  examTitle?: string
): PeriodSubjectRow[] {
  return buildPeriodSubjectRows(grades, FALLBACK_QUARTER_COLUMNS, examTitle);
}

export function quarterAverage(rows: PeriodSubjectRow[], q: string): number | null {
  return periodAverage(rows, q);
}
