import prisma from "../lib/prisma";

export const resourceLoaders = {
  libraryItem: async (req: any) => {
    const row = await prisma.libraryItem.findUnique({ where: { id: req.params.id }, select: { schoolId: true } });
    return row?.schoolId;
  },
  libraryLoan: async (req: any) => {
    const row = await prisma.libraryLoan.findUnique({ where: { id: req.params.id }, select: { schoolId: true } });
    return row?.schoolId;
  },
  athleticsTeam: async (req: any) => {
    const row = await prisma.athleticsTeam.findUnique({ where: { id: req.params.teamId }, select: { schoolId: true } });
    return row?.schoolId;
  },
  hostelBuilding: async (req: any) => {
    const row = await prisma.hostelBuilding.findUnique({ where: { id: req.params.buildingId }, select: { schoolId: true } });
    return row?.schoolId;
  },
  hostelAssignment: async (req: any) => {
    const row = await prisma.hostelAssignment.findUnique({ where: { id: req.params.id }, select: { schoolId: true } });
    return row?.schoolId;
  },
};
