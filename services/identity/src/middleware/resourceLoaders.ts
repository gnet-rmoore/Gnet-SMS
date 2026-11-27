import prisma from "../lib/prisma";

/** Prisma-backed schoolId loaders for :id routes, scoped to identity-owned models. */
export const resourceLoaders = {
  user: async (req: any) => {
    const row = await prisma.user.findUnique({
      where: { id: req.params.userId || req.params.id },
      select: {
        role: true,
        schoolId: true,
        children: { select: { student: { select: { schoolId: true } } } },
      },
    });
    if (!row) return null;
    const linkedSchoolIds = row.children
      .map((link) => link.student.schoolId)
      .filter((schoolId): schoolId is string => Boolean(schoolId));
    const preferredSchoolId = String(req.user?.schoolId || "");
    if (
      row.role === "PARENT" &&
      preferredSchoolId &&
      (row.schoolId === preferredSchoolId || linkedSchoolIds.includes(preferredSchoolId))
    ) {
      return preferredSchoolId;
    }
    return row.schoolId || linkedSchoolIds[0] || null;
  },
  parent: async (req: any) => {
    const row = await prisma.user.findUnique({
      where: { id: req.params.parentId },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
};
