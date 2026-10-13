import prisma from "../lib/prisma";

/** Prisma-backed schoolId loaders for :id routes, scoped to comms-owned models. */
export const resourceLoaders = {
  announcement: async (req: any) => {
    const row = await prisma.announcement.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  document: async (req: any) => {
    const row = await prisma.schoolDocument.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  ptaMeeting: async (req: any) => {
    const row = await prisma.ptaMeeting.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  ptaVolunteer: async (req: any) => {
    const row = await prisma.ptaVolunteerOpportunity.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
  ptaCampaign: async (req: any) => {
    const row = await prisma.ptaCampaign.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },
};
