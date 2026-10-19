import type { Request, Response } from "express";
import { campusService } from "../services/campusService";
import { getIdentityStaff, getIdentityStudents, nameMap } from "../lib/identityClient";

const COUNSELOR_ROLES = ["COUNSELOR", "SCHOOL_ADMIN", "PRINCIPAL"];

function canViewConfidential(req: Request) {
  const role = (req as any).user?.role;
  return COUNSELOR_ROLES.includes(role);
}

async function enrichStudents(
  schoolId: string,
  rows: Array<{ studentId?: string; studentUserId?: string }>,
  key: "studentId" | "studentUserId" = "studentId"
) {
  const students = await getIdentityStudents(schoolId);
  const map = nameMap(students);
  return rows.map((r) => {
    const id = (key === "studentUserId" ? r.studentUserId : r.studentId) || "";
    return { ...r, studentName: map.get(id) || id };
  });
}

export const campusController = {
  // Library
  async listLibraryItems(req: Request, res: Response) {
    try {
      res.json(await campusService.listLibraryItems(req.params.schoolId));
    } catch {
      res.status(500).json({ error: "Failed to fetch library items" });
    }
  },
  async createLibraryItem(req: Request, res: Response) {
    try {
      res.status(201).json(await campusService.createLibraryItem(req.params.schoolId, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create item" });
    }
  },
  async updateLibraryItem(req: Request, res: Response) {
    try {
      res.json(await campusService.updateLibraryItem(req.params.id, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update item" });
    }
  },
  async listLibraryLoans(req: Request, res: Response) {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const loans = await campusService.listLibraryLoans(req.params.schoolId, status);
      res.json(await enrichStudents(req.params.schoolId, loans));
    } catch {
      res.status(500).json({ error: "Failed to fetch loans" });
    }
  },
  async checkoutLibraryItem(req: Request, res: Response) {
    try {
      res.status(201).json(await campusService.checkoutLibraryItem(req.params.schoolId, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to checkout" });
    }
  },
  async returnLibraryLoan(req: Request, res: Response) {
    try {
      res.json(await campusService.returnLibraryLoan(req.params.id));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to return loan" });
    }
  },

  // Clinic
  async getHealthProfile(req: Request, res: Response) {
    try {
      const profile = await campusService.getHealthProfile(req.params.schoolId, req.params.studentId);
      res.json(profile || null);
    } catch {
      res.status(500).json({ error: "Failed to fetch health profile" });
    }
  },
  async upsertHealthProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      res.json(
        await campusService.upsertHealthProfile(
          req.params.schoolId,
          req.params.studentId,
          req.body,
          user.id
        )
      );
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to save profile" });
    }
  },
  async listClinicVisits(req: Request, res: Response) {
    try {
      const visits = await campusService.listClinicVisits(req.params.schoolId, {
        date: typeof req.query.date === "string" ? req.query.date : undefined,
        studentId: typeof req.query.studentId === "string" ? req.query.studentId : undefined,
      });
      res.json(await enrichStudents(req.params.schoolId, visits));
    } catch {
      res.status(500).json({ error: "Failed to fetch visits" });
    }
  },
  async createClinicVisit(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const visit = await campusService.createClinicVisit(req.params.schoolId, req.body, user.id);
      res.status(201).json(visit);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to log visit" });
    }
  },

  // Counseling
  async listCounselingSessions(req: Request, res: Response) {
    try {
      const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
      const rows = await campusService.listCounselingSessions(
        req.params.schoolId,
        studentId,
        canViewConfidential(req)
      );
      res.json(await enrichStudents(req.params.schoolId, rows));
    } catch {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  },
  async createCounselingSession(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const row = await campusService.createCounselingSession(req.params.schoolId, req.body, user.id);
      if (!canViewConfidential(req)) {
        const { confidentialNotes: _c, ...rest } = row;
        return res.status(201).json(rest);
      }
      res.status(201).json(row);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create session" });
    }
  },

  // Athletics
  async listAthleticsTeams(req: Request, res: Response) {
    try {
      const teams = await campusService.listAthleticsTeams(req.params.schoolId);
      const students = await getIdentityStudents(req.params.schoolId);
      const smap = nameMap(students);
      const staff = await getIdentityStaff(req.params.schoolId);
      const tmap = nameMap(staff);
      res.json(
        teams.map((team) => ({
          ...team,
          coachName: team.coachStaffId ? tmap.get(team.coachStaffId) : null,
          roster: team.roster.map((r) => ({ ...r, studentName: smap.get(r.studentId) || r.studentId })),
        }))
      );
    } catch {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  },
  async createAthleticsTeam(req: Request, res: Response) {
    try {
      res.status(201).json(await campusService.createAthleticsTeam(req.params.schoolId, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create team" });
    }
  },
  async addAthleticsRoster(req: Request, res: Response) {
    try {
      res.status(201).json(await campusService.addAthleticsRoster(req.params.teamId, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to add roster member" });
    }
  },
  async removeAthleticsRoster(req: Request, res: Response) {
    try {
      res.json(await campusService.removeAthleticsRoster(req.params.teamId, req.params.studentId));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to remove roster member" });
    }
  },
  async createAthleticsEvent(req: Request, res: Response) {
    try {
      res.status(201).json(await campusService.createAthleticsEvent(req.params.teamId, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create event" });
    }
  },

  // Hostel
  async listHostelBuildings(req: Request, res: Response) {
    try {
      res.json(await campusService.listHostelBuildings(req.params.schoolId));
    } catch {
      res.status(500).json({ error: "Failed to fetch hostel buildings" });
    }
  },
  async createHostelBuilding(req: Request, res: Response) {
    try {
      res.status(201).json(await campusService.createHostelBuilding(req.params.schoolId, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create building" });
    }
  },
  async createHostelRoom(req: Request, res: Response) {
    try {
      res.status(201).json(await campusService.createHostelRoom(req.params.buildingId, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create room" });
    }
  },
  async listHostelAssignments(req: Request, res: Response) {
    try {
      const rows = await campusService.listHostelAssignments(req.params.schoolId);
      res.json(await enrichStudents(req.params.schoolId, rows));
    } catch {
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  },
  async createHostelAssignment(req: Request, res: Response) {
    try {
      res.status(201).json(await campusService.createHostelAssignment(req.params.schoolId, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to assign bed" });
    }
  },
  async checkoutHostelAssignment(req: Request, res: Response) {
    try {
      res.json(await campusService.checkoutHostelAssignment(req.params.id));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to checkout" });
    }
  },

  // Cafeteria
  async listCafeteriaMenus(req: Request, res: Response) {
    try {
      res.json(
        await campusService.listCafeteriaMenus(
          req.params.schoolId,
          typeof req.query.from === "string" ? req.query.from : undefined,
          typeof req.query.to === "string" ? req.query.to : undefined
        )
      );
    } catch {
      res.status(500).json({ error: "Failed to fetch menus" });
    }
  },
  async upsertCafeteriaMenu(req: Request, res: Response) {
    try {
      res.json(await campusService.upsertCafeteriaMenu(req.params.schoolId, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to save menu" });
    }
  },
  async listCafeteriaMealCounts(req: Request, res: Response) {
    try {
      res.json(
        await campusService.listCafeteriaMealCounts(
          req.params.schoolId,
          typeof req.query.from === "string" ? req.query.from : undefined,
          typeof req.query.to === "string" ? req.query.to : undefined
        )
      );
    } catch {
      res.status(500).json({ error: "Failed to fetch meal counts" });
    }
  },
  async upsertCafeteriaMealCount(req: Request, res: Response) {
    try {
      res.json(await campusService.upsertCafeteriaMealCount(req.params.schoolId, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to save meal count" });
    }
  },

  // Discipline
  async listDisciplineRecords(req: Request, res: Response) {
    try {
      const rows = await campusService.listDisciplineRecords(req.params.schoolId, {
        studentId: typeof req.query.studentId === "string" ? req.query.studentId : undefined,
        type: typeof req.query.type === "string" ? req.query.type : undefined,
        from: typeof req.query.from === "string" ? req.query.from : undefined,
        to: typeof req.query.to === "string" ? req.query.to : undefined,
      });
      res.json(await enrichStudents(req.params.schoolId, rows, "studentUserId"));
    } catch {
      res.status(500).json({ error: "Failed to fetch discipline records" });
    }
  },
  async createDisciplineRecord(req: Request, res: Response) {
    try {
      const actor = (req as any).user?.id;
      res
        .status(201)
        .json(await campusService.createDisciplineRecord(req.params.schoolId, req.body, actor));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to record discipline" });
    }
  },
  async updateDisciplineRecord(req: Request, res: Response) {
    try {
      res.json(await campusService.updateDisciplineRecord(req.params.id, req.body));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update record" });
    }
  },
  async deleteDisciplineRecord(req: Request, res: Response) {
    try {
      res.json(await campusService.deleteDisciplineRecord(req.params.id));
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to delete record" });
    }
  },
  async getDisciplineSummaryInternal(req: Request, res: Response) {
    try {
      res.json(
        await campusService.getDisciplineSummary(req.params.schoolId, {
          from: typeof req.query.from === "string" ? req.query.from : undefined,
          to: typeof req.query.to === "string" ? req.query.to : undefined,
        })
      );
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch discipline summary" });
    }
  },
};
