import prisma from "../lib/prisma";

/** Prisma-backed schoolId loaders for :id routes, scoped to identity-owned models. */
export const resourceLoaders = {
  user: async (req: any) => {
    const row = await prisma.user.findUnique({
      where: { id: req.params.userId || req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  parent: async (req: any) => {
    const row = await prisma.user.findUnique({
      where: { id: req.params.parentId },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
};
