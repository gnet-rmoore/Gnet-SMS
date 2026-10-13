import prisma from "../lib/prisma";

/** Prisma-backed schoolId loaders for :id routes, scoped to finance-owned models. */
export const resourceLoaders = {
  fee: async (req: any) => {
    const row = await prisma.feePayment.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  expense: async (req: any) => {
    const row = await prisma.expense.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  receipt: async (req: any) => {
    const row = await prisma.receipt.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
};
