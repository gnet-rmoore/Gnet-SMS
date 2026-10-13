import prisma from "../lib/prisma";

/** Prisma-backed schoolId loaders for :id routes, scoped to classroom-owned models. */
export const resourceLoaders = {
  classroom: async (req: any) => {
    const row = await prisma.classroom.findUnique({
      where: { id: req.params.id },
      select: { schoolId: true },
    });
    return row?.schoolId;
  },

  post: async (req: any) => {
    const row = await prisma.classroomPost.findUnique({
      where: { id: req.params.id },
      select: { classroom: { select: { schoolId: true } } },
    });
    return row?.classroom?.schoolId;
  },

  submission: async (req: any) => {
    const row = await prisma.submission.findUnique({
      where: { id: req.params.id },
      select: {
        post: { select: { classroom: { select: { schoolId: true } } } },
      },
    });
    return row?.post?.classroom?.schoolId;
  },

  topic: async (req: any) => {
    const row = await prisma.classroomTopic.findUnique({
      where: { id: req.params.id },
      select: { classroom: { select: { schoolId: true } } },
    });
    return row?.classroom?.schoolId;
  },

  comment: async (req: any) => {
    const row = await prisma.postComment.findUnique({
      where: { id: req.params.id },
      select: {
        post: { select: { classroom: { select: { schoolId: true } } } },
      },
    });
    return row?.post?.classroom?.schoolId;
  },
};
