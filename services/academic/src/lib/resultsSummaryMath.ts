/**
 * Pure academic-results helpers for the Promotion Statement and Year Transition.
 *
 * A student's subject average is a component-weighted mean of their graded
 * entries; the overall average is the mean of subject averages. Pass/fail is
 * decided against the school's GradeLegend passing band (falling back to the
 * configured default). Kept free of Prisma for unit tests.
 */

export type GradeRowInput = {
  studentUserId: string;
  subjectId: string;
  /** ExamComponent.id when the entry is tied to a component. */
  componentId: string | null;
  /** Component weight (e.g. CA 60 / EXAM 40). Defaults to 1 when missing. */
  componentWeightPct: number | null;
  /** Percentage 0–100 for this entry (preferred). */
  scorePercent: number | null;
  /** Raw score, used when scorePercent is missing. */
  score: number | null;
  maxScore: number | null;
};

export type ScoreScale = {
  minScore: number;
  maxScore: number;
  gradeLetter: string;
  remark?: string | null;
};

export type StudentResultSummary = {
  studentUserId: string;
  overallAverage: number;
  subjectsGraded: number;
  passed: boolean;
  letter: string | null;
};

export type PerformerRank = {
  studentUserId: string;
  overallAverage: number;
  position: number;
};

const DEFAULT_PASS_THRESHOLD = 60;

/** Normalise any entry into a 0–100 percentage, or null when not gradable. */
export function entryPercent(row: GradeRowInput): number | null {
  if (row.scorePercent != null && Number.isFinite(row.scorePercent)) {
    return clampPercent(row.scorePercent);
  }
  if (row.score != null && Number.isFinite(row.score) && row.maxScore && row.maxScore > 0) {
    return clampPercent((row.score / row.maxScore) * 100);
  }
  if (row.score != null && Number.isFinite(row.score)) return clampPercent(row.score);
  return null;
}

function clampPercent(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/**
 * Determine the minimum overall average that counts as a pass from grade scales.
 * Prefers the lowest band whose remark reads as a pass (e.g. "Pass" / "Credit").
 */
export function passThresholdFromScales(
  scales: ScoreScale[],
  fallback = DEFAULT_PASS_THRESHOLD
): number {
  const passing = scales.filter((s) => {
    const remark = String(s.remark || "").toLowerCase();
    return remark.includes("pass") && !remark.includes("fail");
  });
  if (!passing.length) return fallback;
  return Math.min(...passing.map((s) => s.minScore));
}

export function letterFromScales(score: number, scales: ScoreScale[]): string | null {
  const hit = scales.find((s) => score >= s.minScore && score <= s.maxScore);
  return hit ? hit.gradeLetter : null;
}

/** Build per-student summaries from raw grade rows. */
export function summarizeStudentResults(
  rows: GradeRowInput[],
  scales: ScoreScale[] = [],
  opts: { passingThreshold?: number } = {}
): Map<string, StudentResultSummary> {
  const threshold = opts.passingThreshold ?? passThresholdFromScales(scales);

  // student → subject → component → [percent, weight]
  type CompBucket = { weight: number; percents: number[] };
  const byStudent = new Map<string, Map<string, Map<string, CompBucket>>>();

  for (const row of rows) {
    const pct = entryPercent(row);
    if (pct == null) continue;
    const componentId = row.componentId || `${row.subjectId}:__unweighted`;
    const weight =
      row.componentWeightPct != null && row.componentWeightPct > 0 ? row.componentWeightPct : 1;

    let subjects = byStudent.get(row.studentUserId);
    if (!subjects) {
      subjects = new Map();
      byStudent.set(row.studentUserId, subjects);
    }
    let components = subjects.get(row.subjectId);
    if (!components) {
      components = new Map();
      subjects.set(row.subjectId, components);
    }
    let bucket = components.get(componentId);
    if (!bucket) {
      bucket = { weight, percents: [] };
      components.set(componentId, bucket);
    }
    bucket.percents.push(pct);
  }

  const summaries = new Map<string, StudentResultSummary>();

  for (const [studentUserId, subjects] of byStudent) {
    const subjectAverages: number[] = [];
    for (const components of subjects.values()) {
      let weighted = 0;
      let weightSum = 0;
      for (const bucket of components.values()) {
        const componentAvg =
          bucket.percents.reduce((a, b) => a + b, 0) / bucket.percents.length;
        weighted += componentAvg * bucket.weight;
        weightSum += bucket.weight;
      }
      if (weightSum > 0) subjectAverages.push(weighted / weightSum);
    }
    if (!subjectAverages.length) continue;
    const overallAverage = round2(
      subjectAverages.reduce((a, b) => a + b, 0) / subjectAverages.length
    );
    summaries.set(studentUserId, {
      studentUserId,
      overallAverage,
      subjectsGraded: subjectAverages.length,
      passed: overallAverage >= threshold,
      letter: letterFromScales(overallAverage, scales),
    });
  }

  return summaries;
}

/** Rank students by overall average (desc). Ties share a dense position. */
export function rankTopPerformers(
  summaries: Iterable<StudentResultSummary>,
  topN = 10
): PerformerRank[] {
  const sorted = [...summaries].sort((a, b) => b.overallAverage - a.overallAverage);
  const ranked: PerformerRank[] = [];
  let position = 0;
  let lastScore: number | null = null;
  for (const s of sorted) {
    if (lastScore === null || s.overallAverage < lastScore) {
      position += 1;
      lastScore = s.overallAverage;
    }
    ranked.push({
      studentUserId: s.studentUserId,
      overallAverage: s.overallAverage,
      position,
    });
  }
  return ranked.slice(0, Math.max(0, topN));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export type AttendanceRowInput = { studentUserId: string; status: string | null };

export type StudentAttendanceSummary = {
  studentUserId: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
  attendanceRate: number; // 0–100
};

export function summarizeAttendance(
  rows: AttendanceRowInput[]
): Map<string, StudentAttendanceSummary> {
  const map = new Map<string, StudentAttendanceSummary>();
  for (const row of rows) {
    let s = map.get(row.studentUserId);
    if (!s) {
      s = {
        studentUserId: row.studentUserId,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        total: 0,
        attendanceRate: 0,
      };
      map.set(row.studentUserId, s);
    }
    const status = String(row.status || "").toUpperCase();
    if (status === "PRESENT") s.present += 1;
    else if (status === "LATE") s.late += 1;
    else if (status === "ABSENT") s.absent += 1;
    else if (status === "EXCUSED") s.excused += 1;
    else continue;
    s.total += 1;
  }
  for (const s of map.values()) {
    s.attendanceRate = s.total ? round2(((s.present + s.late) / s.total) * 100) : 0;
  }
  return map;
}

/** Rank students by attendance rate (desc), requiring a minimum of records. */
export function rankBestAttendance(
  summaries: Iterable<StudentAttendanceSummary>,
  opts: { topN?: number; minRecords?: number } = {}
): Array<{ studentUserId: string; attendanceRate: number; present: number; total: number }> {
  const minRecords = opts.minRecords ?? 1;
  const topN = opts.topN ?? 10;
  return [...summaries]
    .filter((s) => s.total >= minRecords)
    .sort((a, b) => b.attendanceRate - a.attendanceRate || b.present - a.present)
    .slice(0, Math.max(0, topN))
    .map((s) => ({
      studentUserId: s.studentUserId,
      attendanceRate: s.attendanceRate,
      present: s.present,
      total: s.total,
    }));
}
