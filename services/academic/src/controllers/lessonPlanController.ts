import { Response } from "express";
import {
  lessonPlanService,
  LESSON_REVIEWER_ROLES,
} from "../services/lessonPlanService";
import { actorHasCapability } from "../lib/capabilities";

function actorFrom(req: any) {
  return {
    id: req.user?.id as string,
    name: (req.user?.name as string) || "User",
    role: (req.user?.role as string) || "",
    schoolId: (req.user?.schoolId as string) || null,
    capabilities: Array.isArray(req.user?.capabilities) ? req.user.capabilities : undefined,
  };
}

function sendErr(res: Response, err: any, fallback: string) {
  const status = err?.status || 500;
  res.status(status).json({
    error: err?.message || fallback,
    ...(err?.code ? { code: err.code } : {}),
  });
}

export const lessonPlanController = {
  async list(req: any, res: Response) {
    const { schoolId } = req.params;
    const actor = actorFrom(req);
    const isReviewer = await actorHasCapability(
      actor,
      "action.lesson_plans.approve",
      LESSON_REVIEWER_ROLES
    );
    try {
      const scope =
        (req.query.scope as string) === "all" && isReviewer
          ? "all"
          : (req.query.scope as string) === "mine"
            ? "mine"
            : isReviewer
              ? "all"
              : "mine";
      const rows = await lessonPlanService.list(schoolId, {
        teacherId: actor.id,
        scope: scope as "mine" | "all",
        status: req.query.status as string | undefined,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        q: req.query.q as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        isReviewer,
      });
      res.json(rows);
    } catch (err: any) {
      sendErr(res, err, "Failed to fetch lesson plans");
    }
  },

  async listPending(req: any, res: Response) {
    const { schoolId } = req.params;
    const actor = actorFrom(req);
    const canReview = await actorHasCapability(
      actor,
      "action.lesson_plans.approve",
      LESSON_REVIEWER_ROLES
    );
    if (!canReview) {
      return res.status(403).json({ error: "Not allowed to view pending lesson plans" });
    }
    try {
      const rows = await lessonPlanService.listPending(schoolId);
      res.json(rows);
    } catch (err: any) {
      sendErr(res, err, "Failed to fetch pending lesson plans");
    }
  },

  async getOne(req: any, res: Response) {
    try {
      const row = await lessonPlanService.getById(req.params.id);
      const actor = actorFrom(req);
      const isReviewer = await actorHasCapability(
        actor,
        "action.lesson_plans.approve",
        LESSON_REVIEWER_ROLES
      );
      if (!isReviewer && row.teacherId !== actor.id) {
        return res.status(403).json({ error: "Not allowed to view this lesson plan" });
      }
      res.json(row);
    } catch (err: any) {
      sendErr(res, err, "Failed to fetch lesson plan");
    }
  },

  async create(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      if (!req.body?.subjectId) {
        return res.status(400).json({ error: "subjectId is required" });
      }
      const row = await lessonPlanService.create(schoolId, req.body, actorFrom(req));
      res.status(201).json(row);
    } catch (err: any) {
      sendErr(res, err, "Failed to create lesson plan");
    }
  },

  async update(req: any, res: Response) {
    try {
      const row = await lessonPlanService.update(req.params.id, req.body, actorFrom(req));
      res.json(row);
    } catch (err: any) {
      sendErr(res, err, "Failed to update lesson plan");
    }
  },

  async submit(req: any, res: Response) {
    try {
      const row = await lessonPlanService.submit(req.params.id, actorFrom(req));
      res.json(row);
    } catch (err: any) {
      sendErr(res, err, "Failed to submit lesson plan");
    }
  },

  async review(req: any, res: Response) {
    try {
      const row = await lessonPlanService.review(
        req.params.id,
        {
          status: req.body?.status,
          feedback: req.body?.feedback,
        },
        actorFrom(req)
      );
      res.json(row);
    } catch (err: any) {
      sendErr(res, err, "Failed to review lesson plan");
    }
  },

  async duplicate(req: any, res: Response) {
    try {
      const row = await lessonPlanService.duplicate(
        req.params.id,
        { lessonDate: req.body?.lessonDate },
        actorFrom(req)
      );
      res.status(201).json(row);
    } catch (err: any) {
      sendErr(res, err, "Failed to duplicate lesson plan");
    }
  },

  async remove(req: any, res: Response) {
    try {
      await lessonPlanService.remove(req.params.id, actorFrom(req));
      res.json({ success: true });
    } catch (err: any) {
      sendErr(res, err, "Failed to delete lesson plan");
    }
  },

  async reschedule(req: any, res: Response) {
    try {
      const row = await lessonPlanService.reschedule(
        req.params.id,
        req.body?.lessonDate,
        actorFrom(req)
      );
      res.json(row);
    } catch (err: any) {
      sendErr(res, err, "Failed to reschedule lesson plan");
    }
  },

  async listTemplates(req: any, res: Response) {
    try {
      const actor = actorFrom(req);
      const rows = await lessonPlanService.listTemplates(req.params.schoolId, {
        subjectId: req.query.subjectId as string | undefined,
        mine: req.query.mine as string | undefined,
        userId: actor.id,
      });
      res.json(rows);
    } catch (err: any) {
      sendErr(res, err, "Failed to fetch templates");
    }
  },

  async saveAsTemplate(req: any, res: Response) {
    try {
      const row = await lessonPlanService.saveAsTemplate(req.params.id, actorFrom(req));
      res.status(201).json(row);
    } catch (err: any) {
      sendErr(res, err, "Failed to save template");
    }
  },

  async createFromTemplate(req: any, res: Response) {
    try {
      if (!req.body?.templateId) {
        return res.status(400).json({ error: "templateId is required" });
      }
      const row = await lessonPlanService.createFromTemplate(
        req.params.schoolId,
        req.body.templateId,
        {
          lessonDate: req.body.lessonDate,
          classroomId: req.body.classroomId,
          classroomName: req.body.classroomName,
        },
        actorFrom(req)
      );
      res.status(201).json(row);
    } catch (err: any) {
      sendErr(res, err, "Failed to create from template");
    }
  },

  async deleteTemplate(req: any, res: Response) {
    try {
      await lessonPlanService.deleteTemplate(req.params.id, actorFrom(req));
      res.json({ success: true });
    } catch (err: any) {
      sendErr(res, err, "Failed to delete template");
    }
  },

  async listSyllabusUnits(req: any, res: Response) {
    try {
      const rows = await lessonPlanService.listSyllabusUnits(req.params.schoolId);
      res.json(rows);
    } catch (err: any) {
      sendErr(res, err, "Failed to fetch syllabus units");
    }
  },

  async createFromSyllabusUnit(req: any, res: Response) {
    try {
      if (req.body?.syllabusPlanId == null || req.body?.unitIndex == null) {
        return res.status(400).json({ error: "syllabusPlanId and unitIndex are required" });
      }
      const row = await lessonPlanService.createFromSyllabusUnit(
        req.params.schoolId,
        {
          syllabusPlanId: req.body.syllabusPlanId,
          unitIndex: Number(req.body.unitIndex),
          lessonDate: req.body.lessonDate,
          classroomId: req.body.classroomId,
          classroomName: req.body.classroomName,
        },
        actorFrom(req)
      );
      res.status(201).json(row);
    } catch (err: any) {
      sendErr(res, err, "Failed to create from syllabus unit");
    }
  },

  async shareToClassroom(req: any, res: Response) {
    try {
      const row = await lessonPlanService.shareToClassroom(req.params.id, actorFrom(req));
      res.json(row);
    } catch (err: any) {
      sendErr(res, err, "Failed to share lesson plan to Classroom");
    }
  },
};
