import prisma from "../lib/prisma";

/** Prisma-backed schoolId loaders for :id routes, scoped to lifecycle-owned models only. */
export const resourceLoaders = {
  application: async (req: any) => {
    const row = await prisma.admissionApplication.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  attendance: async (req: any) => {
    const row = await prisma.attendance.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
};
