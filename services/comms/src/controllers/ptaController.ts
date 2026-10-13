import type { Request, Response } from "express";
import { isPtaOfficer, ptaService } from "../services/ptaService";

function statusFromError(error: any): number {
  if (typeof error?.status === "number") return error.status;
  return 500;
}

async function canManagePta(req: any): Promise<boolean> {
  const user = req.user;
  if (!user) return false;
  if (user.role === "SCHOOL_ADMIN" || user.role === "PRINCIPAL" || user.role === "SUPER_ADMIN") {
    return true;
  }
  const schoolId = req.params.schoolId || req.resourceSchoolId || user.schoolId;
  if (!schoolId || !user.id) return false;
  return isPtaOfficer(schoolId, user.id);
}

export const ptaController = {
  async getPta(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const user = (req as any).user;
      const payload = await ptaService.getPtaHome(schoolId, user?.id, user?.role);
      res.json(payload);
    } catch (error: any) {
      res.status(statusFromError(error)).json({ error: error.message });
    }
  },

  async upsertPta(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const { name, description, enabled } = req.body || {};
      const org = await ptaService.upsertOrganization(schoolId, {
        name,
        description,
        enabled,
      });
      res.json(org);
    } catch (error: any) {
      res.status(statusFromError(error)).json({ error: error.message });
    }
  },

  async appointOfficer(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const { userId } = req.body || {};
      const officer = await ptaService.appointOfficer(schoolId, userId);
      res.status(201).json(officer);
    } catch (error: any) {
      res.status(statusFromError(error)).json({ error: error.message });
    }
  },

  async removeOfficer(req: Request, res: Response) {
    try {
      const { schoolId, userId } = req.params;
      await ptaService.removeOfficer(schoolId, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(statusFromError(error)).json({ error: error.message });
    }
  },

  async listMeetings(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const user = (req as any).user;
      const includeUnpublished = await canManagePta(req);
      const meetings = await ptaService.listMeetings(schoolId, {
        includeUnpublished,
        userId: user?.id,
      });
      res.json(meetings);
    } catch (error: any) {
      res.status(statusFromError(error)).json({ error: error.message });
    }
  },

  async createMeeting(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const user = (req as any).user;
      if (!(await canManagePta(req))) {
        return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
      }
      const meeting = await ptaService.createMeeting(schoolId, {
        ...req.body,
        createdById: user.id,
      });
      res.status(201).json(meeting);
    } catch (error: any) {
      res.status(statusFromError(error)).json({ error: error.message });
    }
  },

  async updateMeeting(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      if (!(await canManagePta(req))) {
        return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
      }
      const meeting = await ptaService.updateMeeting(id, req.body || {}, user?.id);
      res.json(meeting);
    } catch (error: any) {
      res.status(statusFromError(error)).json({ error: error.message });
    }
  },

  async rsvpMeeting(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      if (!user?.id) return res.status(401).json({ error: "Unauthorized" });
      const { status } = req.body || {};
      const rsvp = await ptaService.rsvpMeeting(id, user.id, status);
      res.status(201).json(rsvp);
    } catch (error: any) {
      res.status(statusFromError(error)).json({ error: error.message });
    }
  },

  async listVolunteers(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const user = (req as any).user;
      const includeUnpublished = await canManagePta(req);
      const rows = await ptaService.listVolunteers(schoolId, {
        includeUnpublished,
        userId: user?.id,
      });
      res.json(rows);
    } catch (error: any) {
      res.status(statusFromError(error)).json({ error: error.message });
    }
  },

  async createVolunteer(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const user = (req as any).user;
      if (!(await canManagePta(req))) {
        return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
      }
      const row = await ptaService.createVolunteer(schoolId, {
        ...req.body,
        createdById: user?.id,
      });
      res.status(201).json(row);
    } catch (error: any) {
      res.status(statusFromError(error)).json({ error: error.message });
    }
  },

  async signupVolunteer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      if (!user?.id) return res.status(401).json({ error: "Unauthorized" });
      const { notes } = req.body || {};
      const signup = await ptaService.signupVolunteer(id, user.id, notes);
      res.status(201).json(signup);
    } catch (error: any) {
      res.status(statusFromError(error)).json({ error: error.message });
    }
  },

  async listCampaigns(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const includeUnpublished = await canManagePta(req);
      const rows = await ptaService.listCampaigns(schoolId, { includeUnpublished });
      res.json(rows);
    } catch (error: any) {
      res.status(statusFromError(error)).json({ error: error.message });
    }
  },

  async createCampaign(req: Request, res: Response) {
    try {
      const { schoolId } = req.params;
      const user = (req as any).user;
      if (!(await canManagePta(req))) {
        return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
      }
      const row = await ptaService.createCampaign(schoolId, {
        ...req.body,
        createdById: user?.id,
      });
      res.status(201).json(row);
    } catch (error: any) {
      res.status(statusFromError(error)).json({ error: error.message });
    }
  },

  async updateCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      if (!(await canManagePta(req))) {
        return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
      }
      const row = await ptaService.updateCampaign(id, req.body || {}, user?.id);
      res.json(row);
    } catch (error: any) {
      res.status(statusFromError(error)).json({ error: error.message });
    }
  },
};
