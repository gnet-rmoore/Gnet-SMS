import prisma from "../lib/prisma";

/** Prisma-backed schoolId loaders for :id routes, scoped to ops-owned models only. */
export const resourceLoaders = {
  workOrder: async (req: any) => {
    const row = await prisma.workOrder.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  inventory: async (req: any) => {
    const row = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  vehicle: async (req: any) => {
    const row = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  transportRoute: async (req: any) => {
    const row = await prisma.transportRoute.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
};
