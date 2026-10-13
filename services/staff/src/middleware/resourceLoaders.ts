import prisma from "../lib/prisma";

/** Prisma-backed schoolId loaders for :id routes, scoped to staff-owned models only. */
export const resourceLoaders = {
  leaveRequest: async (req: any) => {
    const row = await prisma.leaveRequest.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  staffTask: async (req: any) => {
    const row = await prisma.staffTask.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  payroll: async (req: any) => {
    const row = await prisma.payroll.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  /** payrollRoutes uses resourceLoaders.user (monolith reuses the same loader
   *  name for GET /api/users/:userId/payrolls) — resolve via the Payroll rows
   *  themselves since staff doesn't own User. */
  user: async (req: any) => {
    const row = await prisma.payroll.findFirst({
      where: { userId: req.params.userId },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
};
