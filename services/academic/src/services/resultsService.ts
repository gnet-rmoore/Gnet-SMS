import prisma from "../lib/prisma";
import {
  summarizeStudentResults,
  passThresholdFromScales,
  type GradeRowInput,
  type ScoreScale,
  type StudentResultSummary,
} from "../lib/resultsSummaryMath";

export type ResultScope = { periodId?: string | null };

export const resultsService = {
  /** Load the school's grade scales (preferring the CLASS legend), flattened. */
  async getScales(schoolId: string): Promise<ScoreScale[]> {
    const legends = await prisma.gradeLegend.findMany({
      where: { schoolId },
      include: { scales: true },
      orderBy: { createdAt: "asc" },
    });
    const preferred = legends.find((l) => l.category === "CLASS") || legends[0];
    if (!preferred) return [];
    return preferred.scales.map((s) => ({
      minScore: s.minScore,
      maxScore: s.maxScore,
      gradeLetter: s.gradeLetter,
      remark: s.remark,
    }));
  },

  /**
   * Per-student academic summaries for a school year (optionally one period).
   * schoolYearId on GradeEntry stores AcademicYear.id; legacy rows may hold
   * "CURRENT_YEAR", which we fold into the matched year.
   */
  async getStudentSummaries(
    schoolId: string,
    schoolYearKey: string,
    opts: ResultScope = {}
  ): Promise<{ summaries: Map<string, StudentResultSummary>; threshold: number }> {
    const year = await prisma.academicYear.findFirst({
      where: { schoolId, yearKey: String(schoolYearKey || "").trim() },
    });
    const yearIds = year ? [year.id, "CURRENT_YEAR"] : ["CURRENT_YEAR"];

    const entries = await prisma.gradeEntry.findMany({
      where: {
        schoolId,
        schoolYearId: { in: yearIds },
        isIncomplete: false,
      },
    });

    const componentIds = new Set<string>();
    const examIds = new Set<string>();
    for (const e of entries) {
      if (e.examComponentId) componentIds.add(e.examComponentId);
      else if (e.examId) examIds.add(e.examId);
    }

    const [components, exams] = await Promise.all([
      componentIds.size
        ? prisma.examComponent.findMany({
            where: { id: { in: [...componentIds] } },
            select: { id: true, periodId: true, weightPct: true },
          })
        : Promise.resolve([]),
      examIds.size
        ? prisma.exam.findMany({
            where: { id: { in: [...examIds] } },
            select: { id: true, examComponentId: true },
          })
        : Promise.resolve([]),
    ]);

    const componentById = new Map(components.map((c) => [c.id, c]));
    const examComponentById = new Map(exams.map((e) => [e.id, e.examComponentId]));

    const rows: GradeRowInput[] = [];
    for (const e of entries) {
      let componentId = e.examComponentId || null;
      if (!componentId && e.examId) {
        componentId = examComponentById.get(e.examId) || null;
      }
      const component = componentId ? componentById.get(componentId) : null;
      if (opts.periodId && component?.periodId !== opts.periodId) continue;
      rows.push({
        studentUserId: e.studentId,
        subjectId: e.subjectId,
        componentId,
        componentWeightPct: component?.weightPct ?? null,
        scorePercent: e.scorePercent ?? null,
        score: e.score ?? null,
        maxScore: e.maxScore ?? null,
      });
    }

    const scales = await this.getScales(schoolId);
    const threshold = passThresholdFromScales(scales);
    const summaries = summarizeStudentResults(rows, scales, { passingThreshold: threshold });
    return { summaries, threshold };
  },
};
