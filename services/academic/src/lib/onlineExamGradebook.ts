/**
 * Pure helpers that map an online-exam attempt score onto the gradebook.
 * Kept DB-free so they can be unit-tested (see tests/online-exam-gradebook.test.ts).
 */
import {
  defaultMaxScoreForColumn,
  resolveEffectiveAssessmentStructure,
  scoreToPercent,
  type AssessmentStructureColumn,
} from "./assessmentStructure";

/**
 * Resolve the gradebook activity column an online-exam score belongs to.
 * Uses the canonical effective-structure resolver (array OR { columns } shaped),
 * never hand-parsing JSON. Falls back to the last column when no EXAM-like
 * column is present so a column id is always available.
 */
export function resolveExamGradeColumn(
  component:
    | {
        gradebookStructure: string | null;
        gradebookStructureCustom: boolean;
        componentType?: string | null;
      }
    | null,
  schoolGradebookConfigRaw: string | null
): AssessmentStructureColumn | null {
  if (!component) return null;
  const { columns } = resolveEffectiveAssessmentStructure({
    componentStructureRaw: component.gradebookStructure,
    schoolGradebookConfigRaw,
    structureCustom: component.gradebookStructureCustom,
  });
  if (!columns.length) return null;

  // Prefer a column whose type matches the exam component's own type
  // (so a QUIZ exam posts to the QUIZ column, not the first EXAM-like one).
  const wanted = String(component.componentType || "").toUpperCase();
  if (wanted) {
    const exact = columns.find((c) => {
      const t = String(c.componentType || "").toUpperCase();
      return t === wanted || t.includes(wanted) || wanted.includes(t);
    });
    if (exact) return exact;
  }

  const match =
    columns.find((c) => {
      const type = String(c.componentType || "").toUpperCase();
      return (
        type.includes("EXAM") ||
        type === "FINAL" ||
        type === "MIDTERM" ||
        type === "TEST" ||
        type === "QUIZ" ||
        type === "SUMMATIVE"
      );
    }) || columns[columns.length - 1];
  return match ?? null;
}

/**
 * Resolve the score to publish to the gradebook, honouring the retake policy
 * (best | last | average). Always returns raw points plus their denominator so
 * the caller can scale onto the target column and keep the conversion
 * reproducible.
 */
export function resolvePublishScore(
  exam: { retakePolicy: string | null },
  attempt: { score: number | null; maxScore: number | null },
  allAttempts: { score: number | null; maxScore: number | null }[]
): { score: number; maxScore: number } {
  const fallback = { score: attempt.score ?? 0, maxScore: attempt.maxScore ?? 0 };

  let scoreRetention = "last";
  if (exam.retakePolicy) {
    try {
      const policy = JSON.parse(exam.retakePolicy);
      scoreRetention = policy?.scoreRetention || "last";
    } catch {
      scoreRetention = "last";
    }
  }
  if (scoreRetention === "last") return fallback;

  const valid = allAttempts.filter(
    (a) => a.score != null && a.maxScore != null && a.maxScore > 0
  );
  if (valid.length <= 1) return fallback;

  if (scoreRetention === "best") {
    const best = valid.reduce((max, a) =>
      a.score! / a.maxScore! > max.score! / max.maxScore! ? a : max
    );
    return { score: best.score!, maxScore: best.maxScore! };
  }
  if (scoreRetention === "average") {
    const avgPct =
      valid.reduce((sum, a) => sum + a.score! / a.maxScore!, 0) / valid.length;
    // avgPct is a fraction (0–1); publish a 0–100 score with 2-dec precision.
    return { score: Math.round(avgPct * 10000) / 100, maxScore: 100 };
  }
  return fallback;
}

/**
 * Gradebook columns store points earned out of the column's max score. Scale
 * the raw points onto that denominator so the weighted rollup is correct when
 * the exam total differs from the column max. Returns raw points unchanged when
 * there is no target column or no denominator.
 */
export function scaleScoreToColumn(
  rawScore: number,
  rawMaxScore: number,
  column: AssessmentStructureColumn | null
): number {
  if (!column || !(rawMaxScore > 0)) return rawScore;
  const pct = scoreToPercent(rawScore, rawMaxScore);
  const columnMax = defaultMaxScoreForColumn(column);
  return Math.round((pct / 100) * columnMax * 10) / 10;
}

/** Percentage (0–100, 2-dec) of raw points on their denominator; null if none. */
export function computeScorePercent(rawScore: number, rawMaxScore: number): number | null {
  if (!(rawMaxScore > 0)) return null;
  return Math.round((rawScore / rawMaxScore) * 10000) / 100;
}

/**
 * Decide whether an (auto) grade push must skip an existing grade entry to
 * avoid clobbering a human-entered grade. Only skips when the caller asked to
 * guard manual entries, did not force, and the existing row was human-sourced.
 */
export function shouldSkipManualEntry(
  existing: { source?: string | null } | null,
  opts: { skipManualEntry?: boolean; force?: boolean }
): boolean {
  if (!existing) return false;
  if (!opts.skipManualEntry) return false;
  if (opts.force) return false;
  return Boolean(existing.source) && existing.source !== "ONLINE_EXAM";
}
