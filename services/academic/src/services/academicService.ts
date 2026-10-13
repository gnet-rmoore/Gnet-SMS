import prisma from "../lib/prisma";
import {
  serializeAssessmentStructure,
  parseAssessmentStructure,
  resolveEffectiveAssessmentStructure,
} from "../lib/assessmentStructure";
import { getSchoolGradebookConfig } from "../lib/identityClient";
import {
  syllabusPayloadHasContentChanges,
  validateSyllabusCalendarPayload,
} from "../lib/syllabusCalendarValidation";
import {
  countClassroomsByGradeLevelId,
  countClassroomsBySubjectId,
  provisionSubjectRoomsForOffering,
} from "../lib/classroomClient";

/**
 * Ported from src/server/services/academicService.ts.
 * - deleteSubject / deleteGradeLevel check Classroom usage via internal HTTP
 *   (cross-schema). Lifecycle admission checks remain a documented gap.
 */
export const academicService = {
  async getCalendar(schoolId: string) {
    const include = {
      periods: {
        orderBy: { orderIndex: "asc" },
        include: {
          examComponents: { orderBy: { orderIndex: "asc" } },
        },
      },
    };
    // Prefer the calendar linked to the ACTIVE academic year; fall back to the
    // sole active pattern (legacy schools that were never transitioned).
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, status: "ACTIVE" },
      orderBy: { activatedAt: "desc" },
      select: { calendarPatternId: true },
    });
    if (activeYear?.calendarPatternId) {
      const linked = await prisma.academicCalendarPattern.findFirst({
        where: { id: activeYear.calendarPatternId, schoolId },
        include,
      });
      if (linked) return linked;
    }
    return prisma.academicCalendarPattern.findFirst({
      where: { schoolId, isActive: true },
      include,
    });
  },

  async createCalendar(schoolId: string, authorId: string, data: any) {
    const { name, patternType, periods } = data;
    if (!name?.trim() || !patternType) {
      throw new Error("Calendar name and pattern type are required");
    }
    if (!Array.isArray(periods) || periods.length === 0) {
      throw new Error("At least one period is required");
    }

    for (const p of periods) {
      if (!p.label?.trim() || !p.shortCode?.trim() || !p.startDate || !p.endDate) {
        throw new Error("Each period needs a label, short code, start date, and end date");
      }
      if (!Array.isArray(p.examComponents) || p.examComponents.length === 0) {
        throw new Error(`Period "${p.label}" needs at least one exam component`);
      }
    }

    await prisma.academicCalendarPattern.updateMany({
      where: { schoolId, isActive: true },
      data: { isActive: false },
    });

    const schoolGradebookConfig = await getSchoolGradebookConfig(schoolId);
    const templateColumns = resolveEffectiveAssessmentStructure(
      null,
      schoolGradebookConfig
    ).columns;
    const templateSerialized =
      templateColumns.length > 0
        ? serializeAssessmentStructure(templateColumns)
        : null;

    return prisma.academicCalendarPattern.create({
      data: {
        schoolId,
        name: name.trim(),
        patternType,
        createdBy: authorId,
        periods: {
          create: periods.map((p: any, pIdx: number) => ({
            schoolId,
            periodNumber: p.periodNumber ?? pIdx + 1,
            label: p.label.trim(),
            shortCode: p.shortCode.trim(),
            startDate: new Date(p.startDate),
            endDate: new Date(p.endDate),
            annualWeightPct: Number(p.annualWeightPct) || 0,
            orderIndex: pIdx,
            examComponents: {
              create: (p.examComponents || []).map((c: any, cIdx: number) => ({
                schoolId,
                componentType: c.componentType || "CUSTOM",
                label: c.label?.trim() || `Component ${cIdx + 1}`,
                shortCode: c.shortCode?.trim() || `C${cIdx + 1}`,
                maxScore: Number(c.maxScore) || 100,
                weightPct: Number(c.weightPct) || 0,
                examStartDate: c.examStartDate ? new Date(c.examStartDate) : null,
                examEndDate: c.examEndDate ? new Date(c.examEndDate) : null,
                gradeSubmissionDeadline: c.gradeSubmissionDeadline
                  ? new Date(c.gradeSubmissionDeadline)
                  : null,
                isGraded: c.isGraded ?? true,
                gradebookStructure:
                  typeof c.gradebookStructure === "string"
                    ? c.gradebookStructure
                    : c.gradebookStructure
                      ? serializeAssessmentStructure(
                          parseAssessmentStructure(c.gradebookStructure).columns
                        )
                      : templateSerialized,
                gradebookStructureCustom: c.gradebookStructureCustom === true,
                orderIndex: cIdx,
              })),
            },
          })),
        },
      },
      include: {
        periods: {
          orderBy: { orderIndex: "asc" },
          include: {
            examComponents: { orderBy: { orderIndex: "asc" } },
          },
        },
      },
    });
  },

  async createExamComponent(periodId: string, data: any) {
    const period = await prisma.academicPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new Error("Period not found");

    const {
      label,
      shortCode,
      componentType,
      maxScore,
      weightPct,
      examStartDate,
      examEndDate,
      gradeSubmissionDeadline,
      isGraded,
      gradebookStructure,
      gradebookStructureCustom,
    } = data;

    const isCustom = Boolean(gradebookStructureCustom);
    const schoolGradebookConfig = isCustom
      ? null
      : await getSchoolGradebookConfig(period.schoolId);
    const templateColumns = !isCustom
      ? resolveEffectiveAssessmentStructure({
          schoolGradebookConfigRaw: schoolGradebookConfig,
          structureCustom: false,
        }).columns
      : null;

    return prisma.examComponent.create({
      data: {
        periodId,
        schoolId: period.schoolId,
        label,
        shortCode,
        componentType,
        maxScore,
        weightPct,
        examStartDate: examStartDate ? new Date(examStartDate) : null,
        examEndDate: examEndDate ? new Date(examEndDate) : null,
        gradeSubmissionDeadline: gradeSubmissionDeadline
          ? new Date(gradeSubmissionDeadline)
          : null,
        isGraded: isGraded ?? true,
        gradebookStructureCustom: isCustom,
        gradebookStructure:
          typeof gradebookStructure === "string"
            ? gradebookStructure
            : gradebookStructure
              ? serializeAssessmentStructure(
                  parseAssessmentStructure(gradebookStructure).columns
                )
              : templateColumns
                ? serializeAssessmentStructure(templateColumns)
                : null,
        orderIndex: 0,
      },
    });
  },

  async updateExamComponent(id: string, data: any) {
    const {
      label,
      shortCode,
      componentType,
      maxScore,
      weightPct,
      examStartDate,
      examEndDate,
      gradeSubmissionDeadline,
      isGraded,
      gradebookStructure,
      gradebookStructureCustom,
    } = data;
    const updateData: Record<string, unknown> = {
      label,
      shortCode,
      componentType,
      maxScore,
      weightPct,
      examStartDate: examStartDate ? new Date(examStartDate) : null,
      examEndDate: examEndDate ? new Date(examEndDate) : null,
      gradeSubmissionDeadline: gradeSubmissionDeadline
        ? new Date(gradeSubmissionDeadline)
        : null,
      isGraded,
    };

    if (gradebookStructureCustom !== undefined) {
      updateData.gradebookStructureCustom = Boolean(gradebookStructureCustom);
      if (gradebookStructureCustom === false) {
        const existing = await prisma.examComponent.findUnique({
          where: { id },
          select: { schoolId: true },
        });
        if (existing) {
          const schoolGradebookConfig = await getSchoolGradebookConfig(existing.schoolId);
          const { columns } = resolveEffectiveAssessmentStructure({
            schoolGradebookConfigRaw: schoolGradebookConfig,
            structureCustom: false,
          });
          if (columns.length) {
            updateData.gradebookStructure = serializeAssessmentStructure(columns);
          }
        }
      }
    }

    if (gradebookStructure !== undefined) {
      updateData.gradebookStructure =
        typeof gradebookStructure === "string"
          ? gradebookStructure
          : serializeAssessmentStructure(
              parseAssessmentStructure(gradebookStructure).columns
            );
      if (gradebookStructureCustom === undefined && gradebookStructure != null) {
        updateData.gradebookStructureCustom = true;
      }
    }

    return prisma.examComponent.update({
      where: { id },
      data: updateData,
    });
  },

  async deleteExamComponent(id: string) {
    return prisma.examComponent.delete({ where: { id } });
  },

  async updatePeriod(id: string, data: any) {
    const { label, shortCode, startDate, endDate, annualWeightPct } = data;
    return prisma.academicPeriod.update({
      where: { id },
      data: {
        label,
        shortCode,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        annualWeightPct,
      },
    });
  },

  async getGradeLegends(schoolId: string) {
    return prisma.gradeLegend.findMany({
      where: { schoolId },
      include: { scales: true },
    });
  },

  async createGradeLegend(schoolId: string, data: any) {
    const { name, category, scales } = data;
    return prisma.gradeLegend.create({
      data: {
        schoolId,
        name,
        category: category || "CLASS",
        scales: {
          create: scales.map((s: any) => ({
            minScore: s.minScore,
            maxScore: s.maxScore,
            gradeLetter: s.gradeLetter,
            gpaPoints: s.gpaPoints,
            remark: s.remark,
          })),
        },
      },
      include: { scales: true },
    });
  },

  async updateGradeLegend(legendId: string, data: any) {
    const { name, category, scales } = data;
    await prisma.gradeScale.deleteMany({ where: { gradeLegendId: legendId } });
    return prisma.gradeLegend.update({
      where: { id: legendId },
      data: {
        name,
        category: category || "CLASS",
        scales: {
          create: scales.map((s: any) => ({
            minScore: s.minScore,
            maxScore: s.maxScore,
            gradeLetter: s.gradeLetter,
            gpaPoints: s.gpaPoints,
            remark: s.remark,
          })),
        },
      },
      include: { scales: true },
    });
  },

  async deleteGradeLegend(legendId: string) {
    await prisma.gradeScale.deleteMany({ where: { gradeLegendId: legendId } });
    return prisma.gradeLegend.delete({ where: { id: legendId } });
  },

  async getGradeLevels(schoolId: string, page?: number, pageSize?: number) {
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 && pageSize <= 100 ? pageSize : 50;
    const skip = (p - 1) * ps;

    const [items, total] = await Promise.all([
      prisma.gradeLevel.findMany({
        where: { schoolId },
        orderBy: { name: "asc" },
        skip,
        take: ps,
      }),
      prisma.gradeLevel.count({ where: { schoolId } }),
    ]);
    return { items, total, page: p, pageSize: ps };
  },

  async createGradeLevel(schoolId: string, name: string) {
    if (!name || typeof name !== "string") throw new Error("Grade level name is required");
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Grade level name is required");
    if (!schoolId) throw new Error("School ID is required");

    const schoolLevels = await prisma.gradeLevel.findMany({ where: { schoolId } });
    const exists = schoolLevels.some((l) => l.name.toLowerCase() === trimmedName.toLowerCase());

    if (exists) {
      throw new Error("A grade level with this name already exists in this school");
    }

    try {
      return await prisma.gradeLevel.create({ data: { name: trimmedName, schoolId } });
    } catch (err: any) {
      if (err.code === "P2002") {
        throw new Error("A grade level with this name already exists in this school");
      }
      throw err;
    }
  },

  async seedGradeLevels(schoolId: string) {
    const defaultLevels = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
    const existing = await prisma.gradeLevel.findMany({ where: { schoolId } });
    const existingNames = existing.map((e) => e.name.toLowerCase());
    const toCreate = defaultLevels.filter((l) => !existingNames.includes(l.toLowerCase()));

    if (toCreate.length > 0) {
      await prisma.gradeLevel.createMany({ data: toCreate.map((l) => ({ name: l, schoolId })) });
    }
    return toCreate.length;
  },

  async getSubjects(schoolId: string, page?: number, pageSize?: number) {
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 && pageSize <= 100 ? pageSize : 50;
    const skip = (p - 1) * ps;

    const [items, total] = await Promise.all([
      prisma.subject.findMany({
        where: { schoolId },
        orderBy: { name: "asc" },
        skip,
        take: ps,
      }),
      prisma.subject.count({ where: { schoolId } }),
    ]);
    return { items, total, page: p, pageSize: ps };
  },

  async createSubject(schoolId: string, data: any) {
    if (!data) throw new Error("Subject data is required");
    const { name, code, description } = data;
    const trimmedName = name?.trim();
    const trimmedCode = code?.trim().toUpperCase();

    if (!trimmedName) throw new Error("Subject name is required");
    if (!trimmedCode) throw new Error("Subject code is required");
    if (!schoolId) throw new Error("School ID is required");

    const schoolSubjects = await prisma.subject.findMany({ where: { schoolId } });
    const exists = schoolSubjects.some(
      (s) => s.code.toUpperCase() === trimmedCode || s.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (exists) {
      throw new Error(`A subject with this name or code already exists in this school`);
    }

    try {
      return await prisma.subject.create({ data: { name: trimmedName, code: trimmedCode, description, schoolId } });
    } catch (err: any) {
      if (err.code === "P2002") {
        throw new Error(`Subject with code ${trimmedCode} already exists`);
      }
      throw err;
    }
  },

  async updateSubject(id: string, data: any) {
    const { name, code, description } = data;
    const trimmedName = name?.trim();
    const trimmedCode = code?.trim().toUpperCase();

    if (!trimmedName) throw new Error("Subject name is required");
    if (!trimmedCode) throw new Error("Subject code is required");

    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) throw new Error("Subject not found");

    const schoolSubjects = await prisma.subject.findMany({ where: { schoolId: existing.schoolId } });
    const exists = schoolSubjects.some(
      (s) => s.id !== id && (s.code.toUpperCase() === trimmedCode || s.name.toLowerCase() === trimmedName.toLowerCase())
    );
    if (exists) {
      throw new Error(`A subject with this name or code already exists in this school`);
    }

    try {
      return await prisma.subject.update({ where: { id }, data: { name: trimmedName, code: trimmedCode, description } });
    } catch (err: any) {
      if (err.code === "P2002") {
        throw new Error(`Subject with code ${trimmedCode} already exists`);
      }
      throw err;
    }
  },

  async deleteSubject(id: string) {
    const classroomCount = await countClassroomsBySubjectId(id);
    if (classroomCount > 0) {
      throw new Error(
        `Cannot delete subject: ${classroomCount} classroom${classroomCount === 1 ? "" : "s"} still use it`
      );
    }

    const gradeEntries = await prisma.gradeEntry.findFirst({ where: { subjectId: id } });
    if (gradeEntries) {
      throw new Error("Cannot delete subject with associated grades");
    }

    return prisma.subject.delete({ where: { id } });
  },

  async getSubjectOfferings(schoolId: string, filters?: { gradeLevelId?: string; subjectId?: string }) {
    return prisma.subjectOffering.findMany({
      where: {
        schoolId,
        ...(filters?.gradeLevelId ? { gradeLevelId: filters.gradeLevelId } : {}),
        ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        gradeLevel: { select: { id: true, name: true } },
      },
      orderBy: [{ gradeLevel: { name: "asc" } }, { subject: { name: "asc" } }],
    });
  },

  async createSubjectOffering(schoolId: string, data: { subjectId?: string; gradeLevelId?: string }) {
    const subjectId = String(data?.subjectId || "").trim();
    const gradeLevelId = String(data?.gradeLevelId || "").trim();
    if (!subjectId) throw new Error("subjectId is required");
    if (!gradeLevelId) throw new Error("gradeLevelId is required");
    if (!schoolId) throw new Error("School ID is required");

    const [subject, gradeLevel] = await Promise.all([
      prisma.subject.findFirst({ where: { id: subjectId, schoolId } }),
      prisma.gradeLevel.findFirst({ where: { id: gradeLevelId, schoolId } }),
    ]);
    if (!subject) throw new Error("Subject not found in this school");
    if (!gradeLevel) throw new Error("Grade level not found in this school");

    try {
      const offering = await prisma.subjectOffering.create({
        data: { schoolId, subjectId, gradeLevelId },
        include: {
          subject: { select: { id: true, name: true, code: true } },
          gradeLevel: { select: { id: true, name: true } },
        },
      });
      await provisionSubjectRoomsForOffering(schoolId, {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
        gradeLevelId,
      });
      return offering;
    } catch (err: any) {
      if (err.code === "P2002") {
        throw new Error("This subject is already offered for that grade level");
      }
      throw err;
    }
  },

  async deleteSubjectOffering(id: string) {
    const existing = await prisma.subjectOffering.findUnique({ where: { id } });
    if (!existing) throw new Error("Subject offering not found");
    await prisma.subjectOffering.delete({ where: { id } });
    return { success: true, id, subjectId: existing.subjectId, gradeLevelId: existing.gradeLevelId };
  },

  async backfillSubjectOfferingsFromPairs(
    schoolId: string,
    pairs: Array<{ subjectId: string; gradeLevelId: string }>
  ) {
    const created: string[] = [];
    const skipped: string[] = [];
    for (const pair of pairs) {
      const subjectId = String(pair.subjectId || "").trim();
      const gradeLevelId = String(pair.gradeLevelId || "").trim();
      if (!subjectId || !gradeLevelId) continue;
      const [subject, gradeLevel] = await Promise.all([
        prisma.subject.findFirst({ where: { id: subjectId, schoolId } }),
        prisma.gradeLevel.findFirst({ where: { id: gradeLevelId, schoolId } }),
      ]);
      if (!subject || !gradeLevel) {
        skipped.push(`${subjectId}:${gradeLevelId}`);
        continue;
      }
      try {
        const row = await prisma.subjectOffering.create({
          data: { schoolId, subjectId, gradeLevelId },
        });
        created.push(row.id);
      } catch (err: any) {
        if (err.code === "P2002") skipped.push(`${subjectId}:${gradeLevelId}`);
        else throw err;
      }
    }
    return { created: created.length, skipped: skipped.length };
  },

  async updateGradeLevel(
    id: string,
    data: string | { name?: string; divisionId?: string | null }
  ) {
    const patch =
      typeof data === "string"
        ? { name: data }
        : { name: data.name, divisionId: data.divisionId };

    const existing = await prisma.gradeLevel.findUnique({ where: { id } });
    if (!existing) throw new Error("Grade level not found");

    const trimmedName =
      patch.name !== undefined ? String(patch.name).trim() : existing.name;
    if (!trimmedName) throw new Error("Grade level name is required");

    if (trimmedName !== existing.name) {
      const schoolLevels = await prisma.gradeLevel.findMany({
        where: { schoolId: existing.schoolId },
      });
      const exists = schoolLevels.some(
        (l) => l.id !== id && l.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (exists) {
        throw new Error("A grade level with this name already exists in this school");
      }
    }

    try {
      return await prisma.gradeLevel.update({
        where: { id },
        data: {
          name: trimmedName,
          ...(patch.divisionId !== undefined
            ? { divisionId: patch.divisionId || null }
            : {}),
        },
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        throw new Error("A grade level with this name already exists");
      }
      throw err;
    }
  },

  async getGradeLevelById(schoolId: string, id: string) {
    return prisma.gradeLevel.findFirst({ where: { id, schoolId } });
  },

  async listDivisions(schoolId: string) {
    return prisma.division.findMany({
      where: { schoolId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  },

  async getDivision(schoolId: string, id: string) {
    return prisma.division.findFirst({ where: { id, schoolId } });
  },

  async createDivision(
    schoolId: string,
    data: { name: string; code?: string | null; sortOrder?: number }
  ) {
    const name = String(data.name || "").trim();
    if (!name) throw new Error("Division name is required");
    try {
      return await prisma.division.create({
        data: {
          schoolId,
          name,
          code: data.code ? String(data.code).trim() : null,
          sortOrder: Number(data.sortOrder) || 0,
        },
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        throw new Error("A division with this name already exists in this school");
      }
      throw err;
    }
  },

  async updateDivision(
    id: string,
    data: { name?: string; code?: string | null; sortOrder?: number; isActive?: boolean }
  ) {
    const existing = await prisma.division.findUnique({ where: { id } });
    if (!existing) throw new Error("Division not found");
    return prisma.division.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
        ...(data.code !== undefined
          ? { code: data.code ? String(data.code).trim() : null }
          : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: Number(data.sortOrder) || 0 } : {}),
        ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
      },
    });
  },

  async deleteDivision(id: string) {
    const linked = await prisma.gradeLevel.count({ where: { divisionId: id } });
    if (linked > 0) {
      throw new Error("Cannot delete a division that still has grade levels assigned");
    }
    return prisma.division.delete({ where: { id } });
  },

  /** Create default divisions and map Grade 1–12 if grades exist. */
  async seedDivisions(schoolId: string) {
    const defaults = [
      { name: "Elementary", code: "ELEM", sortOrder: 1, grades: [1, 2, 3, 4, 5] },
      { name: "Middle School", code: "MID", sortOrder: 2, grades: [6, 7, 8] },
      { name: "High School", code: "HIGH", sortOrder: 3, grades: [9, 10, 11, 12] },
      { name: "Preparatory", code: "PREP", sortOrder: 0, grades: [] as number[] },
    ];
    const existing = await prisma.division.findMany({ where: { schoolId } });
    const byName = new Map(existing.map((d) => [d.name.toLowerCase(), d]));
    let created = 0;
    for (const d of defaults) {
      if (byName.has(d.name.toLowerCase())) continue;
      const row = await prisma.division.create({
        data: {
          schoolId,
          name: d.name,
          code: d.code,
          sortOrder: d.sortOrder,
        },
      });
      byName.set(d.name.toLowerCase(), row);
      created++;
    }

    const grades = await prisma.gradeLevel.findMany({ where: { schoolId } });
    for (const g of grades) {
      if (g.divisionId) continue;
      const m = /grade\s*(\d+)/i.exec(g.name);
      if (!m) continue;
      const n = Number(m[1]);
      const match = defaults.find((d) => d.grades.includes(n));
      if (!match) continue;
      const div = byName.get(match.name.toLowerCase());
      if (!div) continue;
      await prisma.gradeLevel.update({
        where: { id: g.id },
        data: { divisionId: div.id },
      });
    }
    return { created, divisions: await this.listDivisions(schoolId) };
  },

  async deleteGradeLevel(id: string) {
    const classroomCount = await countClassroomsByGradeLevelId(id);
    if (classroomCount > 0) {
      throw new Error(
        `Cannot delete grade level: ${classroomCount} classroom${classroomCount === 1 ? "" : "s"} still use it`
      );
    }
    // Lifecycle admissionApplication usage is not checked here (cross-service gap).
    return prisma.gradeLevel.delete({ where: { id } });
  },

  async getSyllabi(schoolId: string, page?: number, pageSize?: number) {
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 && pageSize <= 100 ? pageSize : 50;
    const skip = (p - 1) * ps;

    const [items, total] = await Promise.all([
      prisma.syllabusPlan.findMany({
        where: { schoolId },
        orderBy: { updatedAt: "desc" },
        skip,
        take: ps,
      }),
      prisma.syllabusPlan.count({ where: { schoolId } }),
    ]);
    return { items, total, page: p, pageSize: ps };
  },

  async createSyllabus(schoolId: string, data: any) {
    const {
      subjectId, gradeLevelId, teacherId, teacherName, subjectName, gradeLevelName,
      title, academicYear, calendarPatternId, standardsFramework, objectives, units, textbooks,
      differentiation, accommodations, gradingCriteria, status,
    } = data;

    if (!calendarPatternId?.trim()) {
      throw Object.assign(
        new Error("An active academic calendar is required before submitting a syllabus plan"),
        { status: 400 }
      );
    }

    await validateSyllabusCalendarPayload(
      schoolId,
      { calendarPatternId, units, gradingCriteria },
      { requireCalendar: true }
    );

    return prisma.syllabusPlan.create({
      data: {
        schoolId,
        subjectId,
        gradeLevelId,
        teacherId,
        teacherName,
        subjectName,
        gradeLevelName,
        title,
        academicYear,
        calendarPatternId: calendarPatternId.trim(),
        standardsFramework: standardsFramework || "Cambridge International",
        objectives: typeof objectives === "string" ? objectives : JSON.stringify(objectives),
        units: typeof units === "string" ? units : JSON.stringify(units),
        textbooks,
        differentiation,
        accommodations,
        gradingCriteria: typeof gradingCriteria === "string" ? gradingCriteria : JSON.stringify(gradingCriteria),
        status: status || "PENDING",
      },
    });
  },

  async updateSyllabus(id: string, data: any) {
    const {
      title, academicYear, calendarPatternId, standardsFramework, objectives, units, textbooks,
      differentiation, accommodations, gradingCriteria, status, feedback,
    } = data;

    const existing = await prisma.syllabusPlan.findUnique({ where: { id } });
    if (!existing) throw new Error("Syllabus not found");

    if (syllabusPayloadHasContentChanges(data)) {
      await validateSyllabusCalendarPayload(
        existing.schoolId,
        {
          calendarPatternId: calendarPatternId ?? existing.calendarPatternId,
          units: units !== undefined ? units : existing.units,
          gradingCriteria:
            gradingCriteria !== undefined ? gradingCriteria : existing.gradingCriteria,
        },
        { requireCalendar: true }
      );
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (academicYear !== undefined) updateData.academicYear = academicYear;
    if (calendarPatternId !== undefined) updateData.calendarPatternId = calendarPatternId || null;
    if (standardsFramework !== undefined) updateData.standardsFramework = standardsFramework;
    if (objectives !== undefined) {
      updateData.objectives = typeof objectives === "string" ? objectives : JSON.stringify(objectives);
    }
    if (units !== undefined) {
      updateData.units = typeof units === "string" ? units : JSON.stringify(units);
    }
    if (textbooks !== undefined) updateData.textbooks = textbooks;
    if (differentiation !== undefined) updateData.differentiation = differentiation;
    if (accommodations !== undefined) updateData.accommodations = accommodations;
    if (gradingCriteria !== undefined) {
      updateData.gradingCriteria = typeof gradingCriteria === "string" ? gradingCriteria : JSON.stringify(gradingCriteria);
    }
    if (status !== undefined) updateData.status = status;
    if (feedback !== undefined) updateData.feedback = feedback;

    return prisma.syllabusPlan.update({ where: { id }, data: updateData });
  },

  async deleteSyllabus(id: string) {
    const existing = await prisma.syllabusPlan.findUnique({ where: { id } });
    if (!existing) throw new Error("Syllabus not found");
    return prisma.syllabusPlan.delete({ where: { id } });
  },
};
