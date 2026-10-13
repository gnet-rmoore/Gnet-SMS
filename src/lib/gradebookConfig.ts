import { z } from "zod";

/** Supports both legacy {code,name} and canonical {shortCode,label} shapes. */
export const gradebookCategorySchema = z
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

export const gradebookConfigSchema = z.union([
  z.object({
    categories: z.array(gradebookCategorySchema).min(1),
  }),
  z.array(gradebookCategorySchema).min(1),
]);

export type GradebookCategory = z.infer<typeof gradebookCategorySchema>;
export type GradebookConfig = { categories: GradebookCategory[] };

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
    // Settings UI edits `code`; treat it as canonical shortCode when both exist
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
