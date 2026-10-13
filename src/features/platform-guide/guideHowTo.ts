/** Resolve optional how-to bullet list for a guide step (pages.guide.steps.<id>.howTo). */
export function resolveGuideHowTo(
  t: (key: string, options?: Record<string, unknown>) => unknown,
  stepId: string
): string[] {
  const raw = t(`guide.steps.${stepId}.howTo`, { returnObjects: true, defaultValue: [] });
  if (!Array.isArray(raw)) return [];
  return raw.filter((line): line is string => typeof line === "string" && line.trim().length > 0);
}
