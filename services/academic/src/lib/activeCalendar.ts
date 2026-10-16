import prisma from "./prisma";

/**
 * Prisma include for a calendar pattern with periods and exam components in
 * display order. Kept in one place so every resolver returns the same shape.
 */
const patternInclude = {
  periods: {
    orderBy: { orderIndex: "asc" as const },
    include: { examComponents: { orderBy: { orderIndex: "asc" as const } } },
  },
};

/**
 * Resolve the school's active academic calendar pattern.
 *
 * Single source of truth used by the Academic Calendar, School Calendar and
 * Exam scheduling so they can never disagree about which periods are active:
 *  - prefer the pattern linked to the school's ACTIVE AcademicYear;
 *  - fall back to the sole `isActive` pattern (legacy schools that were never
 *    transitioned through year rollover).
 */
export async function resolveActiveCalendarPattern(schoolId: string) {
  const activeYear = await prisma.academicYear.findFirst({
    where: { schoolId, status: "ACTIVE" },
    orderBy: { activatedAt: "desc" },
    select: { calendarPatternId: true },
  });

  if (activeYear?.calendarPatternId) {
    const linked = await prisma.academicCalendarPattern.findFirst({
      where: { id: activeYear.calendarPatternId, schoolId },
      include: patternInclude,
    });
    if (linked) return linked;
  }

  return prisma.academicCalendarPattern.findFirst({
    where: { schoolId, isActive: true },
    include: patternInclude,
  });
}
