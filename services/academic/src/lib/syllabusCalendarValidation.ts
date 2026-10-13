import prisma from "./prisma";

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function validateSyllabusCalendarPayload(
  schoolId: string,
  data: {
    calendarPatternId?: string | null;
    units?: unknown;
    gradingCriteria?: unknown;
  },
  opts?: { requireCalendar?: boolean }
) {
  const requireCalendar = opts?.requireCalendar ?? true;
  const calendarPatternId = data.calendarPatternId?.trim();

  if (requireCalendar && !calendarPatternId) {
    throw Object.assign(
      new Error("An active academic calendar is required before submitting a syllabus plan"),
      { status: 400 }
    );
  }

  if (!calendarPatternId) return;

  const calendar = await prisma.academicCalendarPattern.findFirst({
    where: { id: calendarPatternId, schoolId, isActive: true },
    include: {
      periods: {
        include: { examComponents: true },
      },
    },
  });

  if (!calendar) {
    throw Object.assign(
      new Error("The linked academic calendar is missing or no longer active"),
      { status: 400 }
    );
  }

  const periodIds = new Set(calendar.periods.map((p) => p.id));
  const componentIds = new Set(
    calendar.periods.flatMap((p) => p.examComponents.map((c) => c.id))
  );

  const units = parseJsonArray<{ academicPeriodId?: string }>(data.units);
  for (let i = 0; i < units.length; i++) {
    const periodId = units[i]?.academicPeriodId;
    if (periodId && !periodIds.has(periodId)) {
      throw Object.assign(
        new Error(`Unit ${i + 1} references a term that is not on the active academic calendar`),
        { status: 400 }
      );
    }
  }

  const criteria = parseJsonArray<{ examComponentId?: string }>(data.gradingCriteria);
  for (let i = 0; i < criteria.length; i++) {
    const componentId = criteria[i]?.examComponentId;
    if (componentId && !componentIds.has(componentId)) {
      throw Object.assign(
        new Error(
          `Grading component ${i + 1} references an exam component not on the active calendar`
        ),
        { status: 400 }
      );
    }
  }
}

export function syllabusPayloadHasContentChanges(data: Record<string, unknown>): boolean {
  const contentKeys = [
    "title",
    "academicYear",
    "calendarPatternId",
    "standardsFramework",
    "objectives",
    "units",
    "textbooks",
    "differentiation",
    "accommodations",
    "gradingCriteria",
  ];
  return contentKeys.some((key) => data[key] !== undefined);
}
