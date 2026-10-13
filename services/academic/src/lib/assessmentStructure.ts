/** Ported from src/lib/assessmentStructure.ts — keep in sync. */
import { z } from "zod";

const gradebookCategorySchema = z
  .object({
    shortCode: z.string().optional(),
    code: z.string().optional(),
    label: z.string().optional(),
    name: z.string().optional(),
    weightPct: z.number().min(0).max(100),
    componentType: z.string().optional(),
    maxScore: z.number().positive().optional(),
    id: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((c) => !!(c.shortCode || c.code), { message: "shortCode or code required" });

export type AssessmentStructureColumn = z.infer<typeof gradebookCategorySchema> & {
  id: string;
};

const structureColumnSchema = z
  .object({
    id: z.string().min(1),
    shortCode: z.string().optional(),
    code: z.string().optional(),
    label: z.string().optional(),
    name: z.string().optional(),
    weightPct: z.number().min(0).max(100),
    componentType: z.string().optional(),
    maxScore: z.number().positive().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((c) => !!(c.shortCode || c.code), { message: "shortCode or code required" });

export const assessmentStructureSchema = z.union([
  z.array(structureColumnSchema).min(1),
  z.object({ columns: z.array(structureColumnSchema).min(1) }),
]);

export const DEFAULT_ASSESSMENT_STRUCTURE: AssessmentStructureColumn[] = [
  { id: "hw", shortCode: "HW", label: "Homework", weightPct: 20, componentType: "ASSIGNMENT", isActive: true },
  { id: "qz", shortCode: "QZ", label: "Quizzes", weightPct: 20, componentType: "QUIZ", isActive: true },
  { id: "cw", shortCode: "CW", label: "Class Work", weightPct: 10, componentType: "CLASSWORK", isActive: true },
  { id: "exam", shortCode: "EXAM", label: "Exam Score", weightPct: 50, componentType: "EXAM", isActive: true },
];

function normalizeCategories(list: z.infer<typeof gradebookCategorySchema>[]) {
  return list.map((c) => ({
    ...c,
    shortCode: c.code || c.shortCode,
    code: c.code || c.shortCode,
    label: c.label || c.name,
    name: c.name || c.label,
    isActive: c.isActive !== false,
  }));
}

export function normalizeStructureColumns(
  raw: z.infer<typeof assessmentStructureSchema>
): AssessmentStructureColumn[] {
  const list = Array.isArray(raw) ? raw : raw.columns;
  return normalizeCategories(list).map((c, i) => {
    const col = {
      ...c,
      id: (c as AssessmentStructureColumn).id || c.shortCode || c.code || `col-${i}`,
    } as AssessmentStructureColumn;
    return {
      ...col,
      maxScore: col.maxScore || defaultMaxScoreForColumn(col),
    };
  }) as AssessmentStructureColumn[];
}

export function parseAssessmentStructure(
  raw: string | null | undefined
): { columns: AssessmentStructureColumn[] } {
  if (!raw) return { columns: DEFAULT_ASSESSMENT_STRUCTURE };
  try {
    const parsed = JSON.parse(raw);
    const result = assessmentStructureSchema.safeParse(parsed);
    if (result.success) {
      return { columns: normalizeStructureColumns(result.data) };
    }
    return { columns: DEFAULT_ASSESSMENT_STRUCTURE };
  } catch {
    return { columns: DEFAULT_ASSESSMENT_STRUCTURE };
  }
}

export function serializeAssessmentStructure(columns: AssessmentStructureColumn[]): string {
  return JSON.stringify(normalizeStructureColumns(columns));
}

export const gradebookConfigSchema = z.union([
  z.object({
    categories: z.array(gradebookCategorySchema).min(1),
  }),
  z.array(gradebookCategorySchema).min(1),
]);

export function parseGradebookConfig(raw: string | null | undefined): {
  categories: z.infer<typeof gradebookCategorySchema>[];
} {
  if (!raw) return { categories: [] };
  try {
    const parsed = JSON.parse(raw);
    const result = gradebookConfigSchema.safeParse(parsed);
    if (result.success) {
      const list = Array.isArray(result.data) ? result.data : result.data.categories;
      return { categories: normalizeCategories(list) };
    }
    return { categories: [] };
  } catch {
    return { categories: [] };
  }
}

export function structureFromGradebookTemplate(
  categories: z.infer<typeof gradebookCategorySchema>[]
): AssessmentStructureColumn[] {
  return normalizeCategories(categories).map((c, i) => {
    const col = {
      ...c,
      id: (c as AssessmentStructureColumn).id || c.shortCode || c.code || `col-${i}`,
    } as AssessmentStructureColumn;
    return {
      ...col,
      maxScore: col.maxScore || defaultMaxScoreForColumn(col),
    };
  }) as AssessmentStructureColumn[];
}

export function legendCategoryForColumn(column: AssessmentStructureColumn): string {
  const t = String(column.componentType || "").toUpperCase();
  if (t.includes("QUIZ")) return "QUIZ";
  if (t.includes("ASSIGNMENT") || t.includes("HOMEWORK") || t === "HW") return "ASSIGNMENT";
  return "CLASS";
}

/** Default max points per column when not configured (teachers enter points earned, not %). */
export function defaultMaxScoreForColumn(column: AssessmentStructureColumn): number {
  if (typeof column.maxScore === "number" && column.maxScore > 0) {
    return column.maxScore;
  }
  const code = (column.shortCode || column.code || "").toUpperCase();
  const t = String(column.componentType || "").toUpperCase();
  if (t.includes("FINAL") || t.includes("FIN") || /^FIN/.test(code)) return 25;
  if (t.includes("MID") || /MID/.test(code)) return 25;
  if (t.includes("EXAM") || /EXAM/.test(code)) return 50;
  return 10;
}

/** Convert raw points to a 0–100 percentage for weighted rollup. */
export function scoreToPercent(score: number, maxScore: number): number {
  if (!Number.isFinite(score)) return 0;
  if (maxScore <= 0) return Math.min(100, Math.max(0, score));
  const pct = (score / maxScore) * 100;
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
}

/** Weighted average across structure columns; scores are points earned (normalized to %). */
export function computeAssessmentTotal(
  scores: Record<string, number | null | undefined>,
  columns: AssessmentStructureColumn[]
): number | null {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const col of columns) {
    if (col.isActive === false) continue;
    const score = scores[col.id];
    if (score === null || score === undefined || Number.isNaN(score)) continue;
    const w = Number(col.weightPct) || 0;
    if (w <= 0) continue;
    const pct = scoreToPercent(Number(score), defaultMaxScoreForColumn(col));
    weightedSum += pct * (w / 100);
    weightTotal += w;
  }
  if (weightTotal <= 0) return null;
  return Math.round((weightedSum / weightTotal) * 1000) / 10;
}

export function isDefaultAssessmentStructure(raw: string | null | undefined): boolean {
  if (!raw) return true;
  const { columns } = parseAssessmentStructure(raw);
  const active = columns.filter((c) => c.isActive !== false);
  const def = DEFAULT_ASSESSMENT_STRUCTURE;
  if (active.length !== def.length) return false;
  return active.every((c, i) => {
    const code = (c.shortCode || c.code || "").toUpperCase();
    const defCode = (def[i].shortCode || def[i].code || "").toUpperCase();
    return code === defCode && Number(c.weightPct) === def[i].weightPct;
  });
}

export type AssessmentStructureSource = "school" | "assessment" | "default";

export type ResolveStructureOpts = {
  componentStructureRaw?: string | null;
  schoolGradebookConfigRaw?: string | null;
  structureCustom?: boolean;
};

export function structureColumnsFingerprint(
  columns: AssessmentStructureColumn[]
): string {
  const active = columns.filter((c) => c.isActive !== false);
  return JSON.stringify(
    active.map((c) => ({
      id: c.id,
      code: (c.shortCode || c.code || "").toUpperCase(),
      label: c.label || c.name || "",
      weightPct: Number(c.weightPct) || 0,
      componentType: c.componentType || "",
    }))
  );
}

export function ensureUniqueStructureColumnIds(
  columns: AssessmentStructureColumn[]
): AssessmentStructureColumn[] {
  const seen = new Set<string>();
  return columns.map((col, i) => {
    let id = col.id || col.shortCode || col.code || `col-${i}`;
    if (seen.has(id)) id = `${id}-${i}`;
    seen.add(id);
    return { ...col, id };
  });
}

export function resolveEffectiveAssessmentStructure(
  componentStructureRawOrOpts:
    | string
    | null
    | undefined
    | ResolveStructureOpts,
  schoolGradebookConfigRaw?: string | null
): { columns: AssessmentStructureColumn[]; source: AssessmentStructureSource } {
  const opts: ResolveStructureOpts =
    componentStructureRawOrOpts != null &&
    typeof componentStructureRawOrOpts === "object" &&
    !Array.isArray(componentStructureRawOrOpts)
      ? componentStructureRawOrOpts
      : {
          componentStructureRaw: componentStructureRawOrOpts as string | null | undefined,
          schoolGradebookConfigRaw,
        };

  const { componentStructureRaw, structureCustom = false } = opts;
  const schoolConfig = parseGradebookConfig(opts.schoolGradebookConfigRaw);
  const schoolColumns = ensureUniqueStructureColumnIds(
    structureFromGradebookTemplate(
      schoolConfig.categories.filter((c) => c.isActive !== false)
    )
  );

  if (structureCustom && componentStructureRaw) {
    return {
      columns: ensureUniqueStructureColumnIds(
        parseAssessmentStructure(componentStructureRaw).columns
      ),
      source: "assessment",
    };
  }

  if (schoolColumns.length > 0) {
    return { columns: schoolColumns, source: "school" };
  }

  if (componentStructureRaw) {
    return {
      columns: ensureUniqueStructureColumnIds(
        parseAssessmentStructure(componentStructureRaw).columns
      ),
      source: "assessment",
    };
  }

  return { columns: DEFAULT_ASSESSMENT_STRUCTURE, source: "default" };
}
