import prisma from "../lib/prisma";

/** Prisma-backed schoolId loaders for :id routes, scoped to academic-owned models. */
export const resourceLoaders = {
  period: async (req: any) => {
    const row = await prisma.academicPeriod.findUnique({
      where: { id: req.params.periodId || req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  examComponent: async (req: any) => {
    const row = await prisma.examComponent.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  gradeLevel: async (req: any) => {
    const row = await prisma.gradeLevel.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  division: async (req: any) => {
    const row = await prisma.division.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  subject: async (req: any) => {
    const row = await prisma.subject.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  subjectOffering: async (req: any) => {
    const row = await prisma.subjectOffering.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  syllabus: async (req: any) => {
    const row = await prisma.syllabusPlan.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  lessonPlan: async (req: any) => {
    const row = await prisma.lessonPlan.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  lessonPlanTemplate: async (req: any) => {
    const row = await prisma.lessonPlanTemplate.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  exam: async (req: any) => {
    const row = await prisma.exam.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  gradeEntry: async (req: any) => {
    const row = await prisma.gradeEntry.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  examAttempt: async (req: any) => {
    const row = await prisma.examAttempt.findUnique({
      where: { id: req.params.attemptId || req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  bellSchedule: async (req: any) => {
    const row = await prisma.bellSchedule.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  schedulePeriod: async (req: any) => {
    const row = await prisma.schedulePeriod.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  timetableEntry: async (req: any) => {
    const row = await prisma.timetableEntry.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  examPaperPackage: async (req: any) => {
    const row = await prisma.examPaperPackage.findUnique({
      where: { id: req.params.packageId || req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
};
