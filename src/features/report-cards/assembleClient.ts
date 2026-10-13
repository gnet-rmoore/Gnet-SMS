import { letterFromScore, scaleFromScore, pickLegendScales } from "../../lib/gradeLegend";
import {
  LIBERIA_EXAM_COLUMNS,
  LIBERIA_FAILING_THRESHOLD,
  LIBERIA_PERIOD_COLUMNS,
  LIBERIA_SENIOR_HIGH_SCALES,
  matchLiberiaColumnKey,
} from "./liberiaLegend";
import { getReportCardTemplateDef, resolveReportCardTemplateKey } from "./registry";
import type {
  AssembleReportCardInput,
  ReportCardColumn,
  ReportCardPayload,
  ReportCardSubjectRow,
} from "./types";

const SEM1_KEYS = ["SEM1_P1", "SEM1_P2", "SEM1_P3", "SEM1_EX"] as const;
const SEM2_KEYS = ["SEM2_P4", "SEM2_P5", "SEM2_P6", "SEM2_EX"] as const;

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function scoresFromKeys(
  cells: ReportCardSubjectRow["cells"],
  keys: readonly string[]
): number[] {
  return keys
    .map((k) => cells[k]?.score)
    .filter((s): s is number => typeof s === "number");
}

/** Progress-report title from grade label (matches filled class PDF style). */
export function liberianProgressReportTitle(gradeLabel?: string | null, fallback?: string): string {
  const g = (gradeLabel || "").trim();
  if (!g) return fallback || "PROGRESS REPORT CARD";
  const lower = g.toLowerCase();
  if (lower.startsWith("k") || lower.includes("kinderg")) {
    return "KINDERGARTEN PROGRESS REPORT CARD";
  }
  if (/\b(1|2|3|4|5|6)(st|nd|rd|th)?\b/i.test(g) || /elem|primary/i.test(g)) {
    return "ELEMENTARY PROGRESS REPORT CARD";
  }
  if (/junior|jhs|7|8|9/i.test(g)) {
    return "JUNIOR HIGH PROGRESS REPORT CARD";
  }
  if (/senior|shs|10|11|12/i.test(g)) {
    return "SENIOR HIGH PROGRESS REPORT CARD";
  }
  return `${g.toUpperCase()} PROGRESS REPORT CARD`;
}

/**
 * Client-side Liberian (and INTL fallback) payload from released grades.
 * Prefer Academic assembly API when Phase 2 lands; keep this for SPA + tests.
 */
export function assembleReportCardPayload(input: AssembleReportCardInput): ReportCardPayload {
  const templateKey = resolveReportCardTemplateKey(input.templateKey);
  const def = getReportCardTemplateDef(templateKey);
  const useLiberia = def.region === "LR";

  const legends =
    input.gradeLegends && input.gradeLegends.length > 0
      ? input.gradeLegends
      : useLiberia
        ? [{ category: "CLASS", scales: LIBERIA_SENIOR_HIGH_SCALES }]
        : null;

  const periodCols: ReportCardColumn[] = LIBERIA_PERIOD_COLUMNS.map((c) => ({
    key: c.key,
    label: c.label,
    roman: c.roman,
  }));
  const examCols: ReportCardColumn[] = LIBERIA_EXAM_COLUMNS.map((c) => ({
    key: c.key,
    label: c.label,
  }));
  const columns: ReportCardColumn[] = useLiberia
    ? [...periodCols, ...examCols]
    : [{ key: "SCORE", label: "Mark" }];

  const bySubject = new Map<string, ReportCardSubjectRow>();

  for (const g of input.grades) {
    const subjectId = g.subjectId || g.subject?.id || g.subject?.code || g.id;
    const name = g.subject?.name || "Subject";
    const code = g.subject?.code || "";
    if (!bySubject.has(subjectId)) {
      bySubject.set(subjectId, {
        subjectId,
        name,
        code,
        cells: Object.fromEntries(columns.map((c) => [c.key, { score: null, letter: null }])),
        sem1Avg: null,
        sem2Avg: null,
        yearlyAvg: null,
        average: null,
        letter: null,
        remark: null,
      });
    }
    const row = bySubject.get(subjectId)!;
    const incomplete = Boolean((g as any).isIncomplete);
    const score = typeof g.score === "number" ? g.score : null;
    if (score == null && !incomplete) continue;

    if (useLiberia) {
      const colKey =
        matchLiberiaColumnKey(g.examComponent?.shortCode) ||
        matchLiberiaColumnKey(g.examComponent?.label) ||
        null;
      if (colKey && row.cells[colKey]) {
        row.cells[colKey] = {
          score: incomplete ? null : score,
          letter: incomplete ? "I" : score != null ? letterFromScore(score, legends) : null,
          incomplete,
        };
      } else if (!g.examComponent) {
        const empty = periodCols.find((c) => row.cells[c.key]?.score == null && !row.cells[c.key]?.incomplete);
        const target = empty?.key || "SEM1_EX";
        if (row.cells[target]?.score == null && !row.cells[target]?.incomplete) {
          row.cells[target] = {
            score: incomplete ? null : score,
            letter: incomplete ? "I" : score != null ? letterFromScore(score, legends) : null,
            incomplete,
          };
        }
      }
    } else {
      row.cells.SCORE = {
        score: incomplete ? null : score,
        letter: incomplete ? "I" : score != null ? letterFromScore(score, legends) : null,
        incomplete,
      };
    }
  }

  const subjects = Array.from(bySubject.values()).map((row) => {
    const sem1Avg = avg(scoresFromKeys(row.cells, SEM1_KEYS));
    const sem2Avg = avg(scoresFromKeys(row.cells, SEM2_KEYS));
    const yearlyAvg = avg(
      [sem1Avg, sem2Avg].filter((a): a is number => typeof a === "number")
    );
    const average = yearlyAvg ?? sem1Avg ?? sem2Avg;
    const scale = average != null ? scaleFromScore(average, legends) : null;
    return {
      ...row,
      sem1Avg,
      sem2Avg,
      yearlyAvg,
      average,
      letter: scale?.gradeLetter ?? null,
      remark: scale?.remark ?? null,
    };
  });

  const overallAverage = avg(
    subjects.map((s) => s.yearlyAvg ?? s.average).filter((a): a is number => typeof a === "number")
  );
  const gpaScales = pickLegendScales(legends);
  let gpa: number | null = null;
  if (overallAverage != null) {
    const scale = gpaScales.find(
      (s) => overallAverage >= s.minScore && overallAverage <= s.maxScore
    );
    gpa = scale?.gpaPoints ?? null;
  }

  const classLabel =
    input.student.classLabel ||
    input.grades.find((g) => g.classroom?.name)?.classroom?.name ||
    "—";

  return {
    school: {
      name: input.school.name || "School",
      ...input.school,
    },
    student: {
      ...input.student,
      classLabel,
      gradeLevelLabel: input.student.gradeLevelLabel || classLabel,
    },
    academicYear: {
      id: "CURRENT",
      label: input.academicYearLabel || new Date().getFullYear().toString(),
    },
    calendar: {
      patternType: input.patternType || (useLiberia ? "SEMESTER" : "ANY"),
      periods: [],
    },
    columns,
    subjects,
    legend: (useLiberia ? LIBERIA_SENIOR_HIGH_SCALES : pickLegendScales(legends)).map((s) => ({
      letter: s.gradeLetter,
      min: s.minScore,
      max: s.maxScore,
      detail: s.remark || undefined,
    })),
    aggregates: {
      overallAverage,
      gpa,
      classPosition: null,
      attendanceRate: null,
    },
    promotion: null,
    templateKey,
    generatedAt: new Date().toISOString(),
  };
}

export function liberianScoreTone(score: number | null | undefined): "pass" | "fail" | "empty" {
  if (score == null || Number.isNaN(score)) return "empty";
  return score < LIBERIA_FAILING_THRESHOLD ? "fail" : "pass";
}
