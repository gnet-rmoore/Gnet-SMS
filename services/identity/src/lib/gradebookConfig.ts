import { z } from "zod";

/** Ported from src/lib/gradebookConfig.ts (supports both legacy and canonical shapes). */
export const gradebookCategorySchema = z
  .object({
    shortCode: z.string().optional(),
    code: z.string().optional(),
    label: z.string().optional(),
    name: z.string().optional(),
    weightPct: z.number().min(0).max(100),
    maxScore: z.number().positive().optional(),
    componentType: z.string().optional(),
    id: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((c) => !!(c.shortCode || c.code), { message: "shortCode or code required" });

export const gradebookConfigSchema = z.union([
  z.object({ categories: z.array(gradebookCategorySchema).min(1) }),
  z.array(gradebookCategorySchema).min(1),
]);

export type GradebookCategory = z.infer<typeof gradebookCategorySchema>;
export type GradebookConfig = { categories: GradebookCategory[] };

export function defaultMaxScoreForCategory(category: GradebookCategory): number {
  if (typeof category.maxScore === "number" && category.maxScore > 0) {
    return category.maxScore;
  }
  const code = (category.shortCode || category.code || "").toUpperCase();
  const type = String(category.componentType || "").toUpperCase();
  if (type.includes("FINAL") || type.includes("FIN") || /^FIN/.test(code)) return 25;
  if (type.includes("MID") || /MID/.test(code)) return 25;
  if (type.includes("EXAM") || /EXAM/.test(code)) return 50;
  return 10;
}

export function validateGradebookConfigTotals(config: GradebookConfig): string[] {
  const active = normalizeCategories(config.categories).filter(
    (category) => category.isActive !== false
  );
  const weightTotal = active.reduce((sum, category) => sum + category.weightPct, 0);
  const maxPointsTotal = active.reduce(
    (sum, category) => sum + defaultMaxScoreForCategory(category),
    0
  );
  const errors: string[] = [];

  if (Math.abs(weightTotal - 100) >= 0.01) {
    errors.push(`Active weights total ${weightTotal}%; they must equal 100%.`);
  }
  if (maxPointsTotal > 100) {
    errors.push(`Active Max pts total ${maxPointsTotal}; it must not exceed 100.`);
  }
  return errors;
}

export const DEFAULT_GRADEBOOK_CONFIG: GradebookConfig = {
  categories: [
    { shortCode: "HW", label: "Homework", weightPct: 20, componentType: "HOMEWORK", isActive: true },
    { shortCode: "QZ", label: "Quizzes", weightPct: 20, componentType: "QUIZ", isActive: true },
    { shortCode: "CW", label: "Class Work", weightPct: 10, componentType: "CLASSWORK", isActive: true },
    { shortCode: "MID", label: "Midterm Exam", weightPct: 20, componentType: "MIDTERM", isActive: true },
    { shortCode: "FIN", label: "Final Exam", weightPct: 30, componentType: "FINAL", isActive: true },
  ],
};

export function normalizeCategories(raw: z.infer<typeof gradebookConfigSchema>): GradebookCategory[] {
  const list = Array.isArray(raw) ? raw : raw.categories;
  return list.map((c) => ({
    ...c,
    shortCode: c.code || c.shortCode,
    code: c.code || c.shortCode,
    label: c.label || c.name,
    name: c.name || c.label,
    isActive: c.isActive !== false,
  }));
}

export function parseGradebookConfig(raw: string | null | undefined): GradebookConfig {
  if (!raw) return DEFAULT_GRADEBOOK_CONFIG;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const result = gradebookConfigSchema.safeParse(parsed);
    if (result.success) {
      return { categories: normalizeCategories(result.data) };
    }
    console.warn("[gradebookConfig] Invalid config, using defaults:", result.error.message);
    return DEFAULT_GRADEBOOK_CONFIG;
  } catch {
    return DEFAULT_GRADEBOOK_CONFIG;
  }
}

export function serializeGradebookConfig(config: GradebookConfig): string {
  const categories = normalizeCategories(config);
  return JSON.stringify(categories);
}
