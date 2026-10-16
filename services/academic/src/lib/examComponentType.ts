import prisma from "./prisma";

/**
 * Resolves the academic assessment component type (e.g. "EXAM", "QUIZ") linked
 * to an exam. `Exam.examComponentId` has no Prisma relation, so this is a
 * separate lookup. Returns null when the exam is not linked to a component.
 */
export async function resolveExamComponentType(
  examComponentId?: string | null
): Promise<string | null> {
  if (!examComponentId) return null;
  const component = await prisma.examComponent.findUnique({
    where: { id: examComponentId },
    select: { componentType: true },
  });
  return component?.componentType ?? null;
}
