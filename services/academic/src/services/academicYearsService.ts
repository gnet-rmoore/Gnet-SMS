import prisma from "../lib/prisma";
import { promotionService } from "./promotionService";

function httpError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

function normalizeYearKey(raw: any): string {
  const key = String(raw || "").trim();
  if (!key || key.length > 32) {
    throw httpError("toYearKey is required (max 32 chars)", 400);
  }
  return key;
}

function parseDate(raw?: string | Date | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Check whether two date ranges [aStart, aEnd] and [bStart, bEnd] overlap. */
export function dateRangesOverlap(
  aStart: Date, aEnd: Date,
  bStart: Date, bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Default period shape when a prior calendar has no terms to clone. */
function defaultComponents() {
  return [
    {
      componentType: "CA",
      label: "Continuous Assessment",
      shortCode: "CA",
      maxScore: 100,
      weightPct: 60,
      isGraded: true,
      orderIndex: 0,
    },
    {
      componentType: "EXAM",
      label: "Term Exam",
      shortCode: "EXAM",
      maxScore: 100,
      weightPct: 40,
      isGraded: true,
      orderIndex: 1,
    },
  ];
}

function defaultPeriods() {
  return [1, 2, 3].map((n) => ({
    periodNumber: n,
    label: `Term ${n}`,
    shortCode: `T${n}`,
    annualWeightPct: 100 / 3,
    orderIndex: n - 1,
    examComponents: defaultComponents(),
  }));
}

/**
 * Rebuild source terms as equal-duration periods spanning the new year.
 * Keeps labels / short codes / annual weights / exam components; only dates shift.
 */
function reshapedPeriods(
  periods: any[],
  startsAt: Date | null,
  endsAt: Date | null
) {
  const src = periods.length ? periods : defaultPeriods();
  const count = src.length;
  const start = startsAt?.getTime() ?? Date.now();
  const end = endsAt?.getTime() ?? start + 365 * 86_400_000;
  const span = end - start;
  return src.map((p, i) => ({
    periodNumber: p.periodNumber ?? i + 1,
    label: p.label,
    shortCode: p.shortCode,
    startDate: new Date(start + Math.round((span * i) / count)),
    endDate:
      i + 1 < count
        ? new Date(start + Math.round((span * (i + 1)) / count) - 1)
        : new Date(end),
    annualWeightPct: Number(p.annualWeightPct) || 0,
    orderIndex: p.orderIndex ?? i,
    examComponents:
      Array.isArray(p.examComponents) && p.examComponents.length
        ? p.examComponents.map((c: any, ci: number) => ({
            componentType: c.componentType || "CUSTOM",
            label: c.label || `Component ${ci + 1}`,
            shortCode: c.shortCode || `C${ci + 1}`,
            maxScore: Number(c.maxScore) || 100,
            weightPct: Number(c.weightPct) || 0,
            isGraded: c.isGraded ?? true,
            gradebookStructure:
              typeof c.gradebookStructure === "string" ? c.gradebookStructure : null,
            gradebookStructureCustom: c.gradebookStructureCustom === true,
            orderIndex: c.orderIndex ?? ci,
          }))
        : defaultComponents(),
  }));
}

export const academicYearsService = {
  async list(schoolId: string) {
    return prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
  },

  async getActive(schoolId: string) {
    return prisma.academicYear.findFirst({
      where: { schoolId, status: "ACTIVE" },
      orderBy: { activatedAt: "desc" },
    });
  },

  async getByKey(schoolId: string, yearKey: string) {
    return prisma.academicYear.findFirst({
      where: { schoolId, yearKey: normalizeYearKey(yearKey) },
    });
  },

  async close(schoolId: string, yearKey: string, actorUserId: string) {
    const key = normalizeYearKey(yearKey);
    const { closed } = await prisma.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${schoolId}, 0))`;

      const year = await tx.academicYear.findFirst({
        where: { schoolId, yearKey: key },
      });
      if (!year) throw httpError(`Academic year "${key}" not found`, 404);
      if (year.status === "CLOSED") {
        throw httpError(`Academic year "${key}" is already closed`, 409);
      }

      const closed = await tx.academicYear.update({
        where: { id: year.id },
        data: { status: "CLOSED", closedAt: new Date() },
      });
      return { closed };
    });
    return closed;
  },

  /**
   * Reactivate a previous (CLOSED or DRAFT) academic year, making it the
   * current ACTIVE year.  The currently-active year is closed automatically.
   */
  async reactivate(schoolId: string, yearKey: string, actorUserId: string) {
    const key = normalizeYearKey(yearKey);
    const { year, closedYearKey } = await prisma.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${schoolId}, 0))`;

      const existingActive = await tx.academicYear.findFirst({
        where: { schoolId, status: "ACTIVE" },
        orderBy: { activatedAt: "desc" },
      });

      if (existingActive && existingActive.yearKey === key) {
        throw httpError(`"${key}" is already the current school year`, 409);
      }

      if (existingActive) {
        const draft = await tx.promotionRun.findFirst({
          where: { schoolId, schoolYearKey: existingActive.yearKey, status: "DRAFT" },
        });
        if (draft) {
          throw httpError(
            `Commit the draft promotion run for ${existingActive.yearKey} before switching`,
            409
          );
        }
      }

      const target = await tx.academicYear.findFirst({
        where: { schoolId, yearKey: key },
      });
      if (!target) throw httpError(`Academic year "${key}" not found`, 404);
      if (target.status === "ACTIVE") {
        throw httpError(`"${key}" is already active`, 409);
      }

      // Activate the target year
      const year = await tx.academicYear.update({
        where: { id: target.id },
        data: {
          status: "ACTIVE",
          activatedAt: new Date(),
          activatedByUserId: actorUserId,
        },
      });

      // Close the previously-active year
      if (existingActive) {
        await tx.academicYear.update({
          where: { id: existingActive.id },
          data: { status: "CLOSED", closedAt: new Date() },
        });
      }

      // Re-link calendar pattern to the reactivated year
      const srcPattern = await tx.academicCalendarPattern.findFirst({
        where: { schoolId, isActive: true },
      });
      if (srcPattern) {
        if (srcPattern.schoolYearId !== year.id) {
          await tx.academicCalendarPattern.updateMany({
            where: { schoolId, isActive: true },
            data: { schoolYearId: year.id },
          });
        }
        // Ensure the year's calendarPatternId points to the active pattern
        if (year.calendarPatternId !== srcPattern.id) {
          await tx.academicYear.update({
            where: { id: year.id },
            data: { calendarPatternId: srcPattern.id },
          });
        }
      }

      return { year, closedYearKey: existingActive?.yearKey ?? null };
    });

    return {
      ...year,
      closedYearKey,
      financeHandoff: {
        feeCohort: "RETURNING",
        schoolYearKey: key,
        feesPath: `/fees?feeCohort=RETURNING&schoolYearKey=${encodeURIComponent(key)}`,
      },
    };
  },

  /**
   * Orchestrate switching the tenant to a new academic year:
   *  1. Advisory lock ⇒ exactly one ACTIVE year, ever.
   *  2. Block if the closing year still has an uncommitted DRAFT promotion run.
   *  3. Create the new year as DRAFT, then ACTIVE.
   *  4. Calendar: first start adopts + links the existing active pattern;
   *     later starts flip the old pattern(s) inactive and clone a fresh one.
   *  5. Capture an opening census placeholder (re-runnable until first commit).
   *  6. Return a deterministic finance handoff keyed on the NEW yearKey.
   * Nothing is deleted; the closing year, its census/runs and statement stay queryable.
   */
  async start(
    schoolId: string,
    actorUserId: string,
    input: {
      toYearKey?: string;
      fromYearKey?: string;
      startsAt?: string | Date;
      endsAt?: string | Date;
      label?: string;
    }
  ) {
    const yearKey = normalizeYearKey(input.toYearKey);
    if (input.fromYearKey) normalizeYearKey(input.fromYearKey);
    const startsAt = parseDate(input.startsAt);
    const endsAt = parseDate(input.endsAt);

    const { year, closedYearKey, adoptedPattern } = await prisma.$transaction(
      async (tx: any) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${schoolId}, 0))`;

        const existingActive = await tx.academicYear.findFirst({
          where: { schoolId, status: "ACTIVE" },
          orderBy: { activatedAt: "desc" },
        });
        const closingKey = existingActive?.yearKey
          ? existingActive.yearKey
          : input.fromYearKey
            ? normalizeYearKey(input.fromYearKey)
            : "";

        const dup = await tx.academicYear.findUnique({
          where: { schoolId_yearKey: { schoolId, yearKey } },
        });
        if (dup) throw httpError(`Academic year "${yearKey}" already exists`, 409);
        if (closingKey && closingKey === yearKey) {
          throw httpError(`"${yearKey}" is already the current school year`, 409);
        }

        // Date-range overlap guard: reject if the new year's [startsAt, endsAt]
        // overlaps any existing year's [startsAt, endsAt] for this school.
        if (startsAt && endsAt) {
          const overlapping = await tx.academicYear.findFirst({
            where: {
              schoolId,
              startsAt: { not: null, lt: endsAt },
              endsAt: { not: null, gt: startsAt },
            },
            select: { yearKey: true, label: true, startsAt: true, endsAt: true },
          });
          if (overlapping) {
            throw httpError(
              `Date range overlaps with academic year "${overlapping.yearKey}" (${overlapping.label || ""})`,
              409
            );
          }
        }

        if (closingKey) {
          const draft = await tx.promotionRun.findFirst({
            where: { schoolId, schoolYearKey: closingKey, status: "DRAFT" },
          });
          if (draft) {
            throw httpError(
              `Commit the draft promotion run for ${closingKey} before starting ${yearKey}`,
              409
            );
          }
        }

        const year = await tx.academicYear.create({
          data: {
            schoolId,
            yearKey,
            label: input.label?.trim() || `${yearKey} Academic Year`,
            startsAt,
            endsAt,
            status: "DRAFT",
            activatedByUserId: actorUserId,
          },
        });

        const srcPattern = await tx.academicCalendarPattern.findFirst({
          where: { schoolId, isActive: true },
          include: {
            periods: {
              orderBy: { orderIndex: "asc" },
              include: { examComponents: { orderBy: { orderIndex: "asc" } } },
            },
          },
        });

        let calendarPatternId: string | null = null;
        let adoptedPattern = false;
        if (!existingActive && srcPattern) {
          // First official start → adopt + link the existing active pattern.
          calendarPatternId = srcPattern.id;
          adoptedPattern = true;
          await tx.academicCalendarPattern.update({
            where: { id: srcPattern.id },
            data: { schoolYearId: year.id },
          });
        } else {
          await tx.academicCalendarPattern.updateMany({
            where: { schoolId, isActive: true },
            data: { isActive: false },
          });
          const pattern = await tx.academicCalendarPattern.create({
            data: {
              schoolId,
              name: `${yearKey} term plan`,
              patternType: srcPattern?.patternType ?? "SEMESTER",
              isActive: true,
              schoolYearId: year.id,
              createdBy: actorUserId,
              periods: {
                create: reshapedPeriods(srcPattern?.periods ?? [], startsAt, endsAt),
              },
            },
            select: { id: true },
          });
          calendarPatternId = pattern.id;
        }

        const activated = await tx.academicYear.update({
          where: { id: year.id },
          data: {
            calendarPatternId,
            status: "ACTIVE",
            activatedAt: new Date(),
            activatedByUserId: actorUserId,
          },
        });

        // Re-attribute legacy "CURRENT_YEAR" grade entries to the now-current year.
        await tx.gradeEntry.updateMany({
          where: { schoolId, schoolYearId: "CURRENT_YEAR" },
          data: { schoolYearId: year.id },
        });

        if (existingActive) {
          await tx.academicYear.update({
            where: { id: existingActive.id },
            data: { status: "CLOSED", closedAt: new Date() },
          });
        }

        return { year: activated, closedYearKey: closingKey || null, adoptedPattern };
      }
    );

    // Opening census placeholder — best effort, re-runnable until first commit.
    let censusCapture: "captured" | "failed" | "skipped" = "skipped";
    if (year.status === "ACTIVE") {
      try {
        await promotionService.captureCensus(schoolId, yearKey, actorUserId);
        censusCapture = "captured";
      } catch {
        censusCapture = "failed";
      }
    }

    return {
      ...year,
      closedYearKey,
      adoptedPattern,
      censusCapture,
      financeHandoff: {
        feeCohort: "RETURNING",
        schoolYearKey: yearKey,
        feesPath: `/fees?feeCohort=RETURNING&schoolYearKey=${encodeURIComponent(yearKey)}`,
      },
      links: {
        statement: `/promotion-statement?schoolYearKey=${encodeURIComponent(yearKey)}`,
      },
    };
  },
};