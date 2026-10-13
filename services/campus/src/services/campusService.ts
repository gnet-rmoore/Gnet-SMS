import prisma from "../lib/prisma";

function loanStatus(dueAt: Date, returnedAt: Date | null, status: string) {
  if (returnedAt || status === "RETURNED") return "RETURNED";
  if (dueAt.getTime() < Date.now()) return "OVERDUE";
  return "OUT";
}

export const campusService = {
  // —— Library ——
  async listLibraryItems(schoolId: string) {
    return prisma.libraryItem.findMany({
      where: { schoolId },
      orderBy: { title: "asc" },
    });
  },

  async createLibraryItem(schoolId: string, data: any) {
    const title = String(data.title || "").trim();
    if (!title) throw new Error("Title is required");
    const copiesTotal = Math.max(1, parseInt(String(data.copiesTotal ?? "1"), 10) || 1);
    return prisma.libraryItem.create({
      data: {
        schoolId,
        title,
        author: data.author ? String(data.author).trim() : null,
        isbn: data.isbn ? String(data.isbn).trim() : null,
        category: String(data.category || "GENERAL").trim() || "GENERAL",
        copiesTotal,
        copiesAvailable: copiesTotal,
        location: data.location ? String(data.location).trim() : null,
      },
    });
  },

  async updateLibraryItem(id: string, data: any) {
    const existing = await prisma.libraryItem.findUnique({ where: { id } });
    if (!existing) throw new Error("Item not found");
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) {
      const title = String(data.title || "").trim();
      if (!title) throw new Error("Title cannot be empty");
      patch.title = title;
    }
    if (data.copiesTotal !== undefined) {
      const total = Math.max(1, parseInt(String(data.copiesTotal), 10) || 1);
      const out = existing.copiesTotal - existing.copiesAvailable;
      patch.copiesTotal = total;
      patch.copiesAvailable = Math.max(0, total - out);
    }
    if (data.author !== undefined) patch.author = data.author ? String(data.author).trim() : null;
    if (data.category !== undefined) patch.category = String(data.category || "GENERAL").trim() || "GENERAL";
    if (data.location !== undefined) patch.location = data.location ? String(data.location).trim() : null;
    return prisma.libraryItem.update({ where: { id }, data: patch });
  },

  async listLibraryLoans(schoolId: string, status?: string) {
    const loans = await prisma.libraryLoan.findMany({
      where: { schoolId },
      include: { item: true },
      orderBy: { loanedAt: "desc" },
    });
    return loans.map((loan) => ({
      ...loan,
      status: loanStatus(loan.dueAt, loan.returnedAt, loan.status),
    })).filter((loan) => !status || loan.status === status);
  },

  async checkoutLibraryItem(schoolId: string, data: any) {
    const itemId = String(data.itemId || "");
    const studentId = String(data.studentId || "");
    if (!itemId || !studentId) throw new Error("Item and student are required");
    const dueAt = data.dueAt ? new Date(data.dueAt) : new Date(Date.now() + 14 * 86400000);
    if (Number.isNaN(dueAt.getTime())) throw new Error("Invalid due date");

    return prisma.$transaction(async (tx) => {
      const item = await tx.libraryItem.findFirst({ where: { id: itemId, schoolId } });
      if (!item) throw new Error("Item not found");
      if (item.copiesAvailable <= 0) throw new Error("No copies available");
      await tx.libraryItem.update({
        where: { id: itemId },
        data: { copiesAvailable: item.copiesAvailable - 1 },
      });
      return tx.libraryLoan.create({
        data: {
          schoolId,
          itemId,
          studentId,
          dueAt,
          status: "OUT",
          notes: data.notes ? String(data.notes).trim() : null,
        },
        include: { item: true },
      });
    });
  },

  async returnLibraryLoan(id: string) {
    return prisma.$transaction(async (tx) => {
      const loan = await tx.libraryLoan.findUnique({ where: { id }, include: { item: true } });
      if (!loan) throw new Error("Loan not found");
      if (loan.returnedAt) return loan;
      await tx.libraryItem.update({
        where: { id: loan.itemId },
        data: { copiesAvailable: Math.min(loan.item.copiesTotal, loan.item.copiesAvailable + 1) },
      });
      return tx.libraryLoan.update({
        where: { id },
        data: { returnedAt: new Date(), status: "RETURNED" },
        include: { item: true },
      });
    });
  },

  // —— Clinic ——
  async getHealthProfile(schoolId: string, studentId: string) {
    return prisma.studentHealthProfile.findFirst({ where: { schoolId, studentId } });
  },

  async upsertHealthProfile(schoolId: string, studentId: string, data: any, userId: string) {
    return prisma.studentHealthProfile.upsert({
      where: { studentId },
      create: {
        schoolId,
        studentId,
        bloodType: data.bloodType ? String(data.bloodType).trim() : null,
        allergies: data.allergies ? String(data.allergies).trim() : null,
        medications: data.medications ? String(data.medications).trim() : null,
        emergencyContact: data.emergencyContact ? String(data.emergencyContact).trim() : null,
        updatedBy: userId,
      },
      update: {
        bloodType: data.bloodType !== undefined ? (data.bloodType ? String(data.bloodType).trim() : null) : undefined,
        allergies: data.allergies !== undefined ? (data.allergies ? String(data.allergies).trim() : null) : undefined,
        medications: data.medications !== undefined ? (data.medications ? String(data.medications).trim() : null) : undefined,
        emergencyContact: data.emergencyContact !== undefined ? (data.emergencyContact ? String(data.emergencyContact).trim() : null) : undefined,
        updatedBy: userId,
      },
    });
  },

  async listClinicVisits(schoolId: string, opts: { date?: string; studentId?: string }) {
    const where: any = { schoolId };
    if (opts.studentId) where.studentId = opts.studentId;
    if (opts.date) {
      const start = new Date(opts.date);
      const end = new Date(opts.date);
      end.setHours(23, 59, 59, 999);
      where.visitDate = { gte: start, lte: end };
    }
    return prisma.clinicVisit.findMany({ where, orderBy: { visitDate: "desc" } });
  },

  async createClinicVisit(schoolId: string, data: any, userId: string) {
    const studentId = String(data.studentId || "");
    const reason = String(data.reason || "").trim();
    if (!studentId || !reason) throw new Error("Student and reason are required");
    const allowed = ["OBSERVATION", "SENT_HOME", "REFERRED"];
    const disposition = allowed.includes(data.disposition) ? data.disposition : "OBSERVATION";
    return prisma.clinicVisit.create({
      data: {
        schoolId,
        studentId,
        reason,
        treatment: data.treatment ? String(data.treatment).trim() : null,
        disposition,
        loggedBy: userId,
        parentNotified: Boolean(data.parentNotified),
        visitDate: data.visitDate ? new Date(data.visitDate) : new Date(),
      },
    });
  },

  // —— Counseling ——
  async listCounselingSessions(schoolId: string, studentId?: string, includeConfidential = false) {
    const rows = await prisma.counselingSession.findMany({
      where: { schoolId, ...(studentId ? { studentId } : {}) },
      orderBy: { sessionDate: "desc" },
    });
    if (includeConfidential) return rows;
    return rows.map(({ confidentialNotes: _c, ...rest }) => rest);
  },

  async createCounselingSession(schoolId: string, data: any, userId: string) {
    const studentId = String(data.studentId || "");
    const summary = String(data.summary || "").trim();
    if (!studentId || !summary) throw new Error("Student and summary are required");
    return prisma.counselingSession.create({
      data: {
        schoolId,
        studentId,
        summary,
        sessionType: String(data.sessionType || "CHECK_IN").trim() || "CHECK_IN",
        confidentialNotes: data.confidentialNotes ? String(data.confidentialNotes).trim() : null,
        followUpAt: data.followUpAt ? new Date(data.followUpAt) : null,
        loggedBy: userId,
        sessionDate: data.sessionDate ? new Date(data.sessionDate) : new Date(),
      },
    });
  },

  async getCounselingSession(id: string, includeConfidential = false) {
    const row = await prisma.counselingSession.findUnique({ where: { id } });
    if (!row) return null;
    if (includeConfidential) return row;
    const { confidentialNotes: _c, ...rest } = row;
    return rest;
  },

  // —— Athletics ——
  async listAthleticsTeams(schoolId: string) {
    return prisma.athleticsTeam.findMany({
      where: { schoolId },
      include: { roster: true, events: { orderBy: { startsAt: "asc" } } },
      orderBy: { name: "asc" },
    });
  },

  async createAthleticsTeam(schoolId: string, data: any) {
    const name = String(data.name || "").trim();
    const sport = String(data.sport || "").trim();
    if (!name || !sport) throw new Error("Name and sport are required");
    return prisma.athleticsTeam.create({
      data: {
        schoolId,
        name,
        sport,
        season: data.season ? String(data.season).trim() : null,
        coachStaffId: data.coachStaffId ? String(data.coachStaffId) : null,
      },
    });
  },

  async addAthleticsRoster(teamId: string, data: any) {
    const studentId = String(data.studentId || "");
    if (!studentId) throw new Error("Student is required");
    return prisma.athleticsRoster.create({
      data: {
        teamId,
        studentId,
        jerseyNumber: data.jerseyNumber ? String(data.jerseyNumber).trim() : null,
        role: data.role ? String(data.role).trim() : null,
      },
    });
  },

  async removeAthleticsRoster(teamId: string, studentId: string) {
    await prisma.athleticsRoster.deleteMany({ where: { teamId, studentId } });
    return { ok: true };
  },

  async createAthleticsEvent(teamId: string, data: any) {
    const title = String(data.title || "").trim();
    if (!title) throw new Error("Title is required");
    const startsAt = data.startsAt ? new Date(data.startsAt) : null;
    if (!startsAt || Number.isNaN(startsAt.getTime())) throw new Error("Start time is required");
    return prisma.athleticsEvent.create({
      data: {
        teamId,
        title,
        startsAt,
        location: data.location ? String(data.location).trim() : null,
        opponent: data.opponent ? String(data.opponent).trim() : null,
        result: data.result ? String(data.result).trim() : null,
      },
    });
  },

  // —— Hostel ——
  async listHostelBuildings(schoolId: string) {
    return prisma.hostelBuilding.findMany({
      where: { schoolId },
      include: {
        rooms: {
          include: {
            assignments: { where: { status: "ACTIVE" } },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  },

  async createHostelBuilding(schoolId: string, data: any) {
    const name = String(data.name || "").trim();
    if (!name) throw new Error("Building name is required");
    return prisma.hostelBuilding.create({
      data: {
        schoolId,
        name,
        genderPolicy: data.genderPolicy ? String(data.genderPolicy).trim() : null,
      },
    });
  },

  async createHostelRoom(buildingId: string, data: any) {
    const label = String(data.label || "").trim();
    if (!label) throw new Error("Room label is required");
    const capacity = Math.max(1, parseInt(String(data.capacity ?? "1"), 10) || 1);
    return prisma.hostelRoom.create({
      data: { buildingId, label, capacity },
    });
  },

  async listHostelAssignments(schoolId: string) {
    return prisma.hostelAssignment.findMany({
      where: { schoolId, status: "ACTIVE" },
      include: { room: { include: { building: true } } },
      orderBy: { checkIn: "desc" },
    });
  },

  async createHostelAssignment(schoolId: string, data: any) {
    const roomId = String(data.roomId || "");
    const studentId = String(data.studentId || "");
    if (!roomId || !studentId) throw new Error("Room and student are required");
    const room = await prisma.hostelRoom.findUnique({
      where: { id: roomId },
      include: { assignments: { where: { status: "ACTIVE" } } },
    });
    if (!room) throw new Error("Room not found");
    if (room.assignments.length >= room.capacity) throw new Error("Room is full");
    return prisma.hostelAssignment.create({
      data: { schoolId, roomId, studentId, status: "ACTIVE" },
      include: { room: { include: { building: true } } },
    });
  },

  async checkoutHostelAssignment(id: string) {
    return prisma.hostelAssignment.update({
      where: { id },
      data: { status: "CHECKED_OUT", checkOut: new Date() },
    });
  },

  // —— Cafeteria ——
  async listCafeteriaMenus(schoolId: string, from?: string, to?: string) {
    const where: any = { schoolId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    return prisma.cafeteriaMenuDay.findMany({ where, orderBy: [{ date: "asc" }, { mealType: "asc" }] });
  },

  async upsertCafeteriaMenu(schoolId: string, data: any) {
    const date = data.date ? new Date(data.date) : null;
    const mealType = String(data.mealType || "").trim();
    const items = String(data.items || "").trim();
    if (!date || Number.isNaN(date.getTime()) || !mealType) throw new Error("Date and meal type are required");
    return prisma.cafeteriaMenuDay.upsert({
      where: { schoolId_date_mealType: { schoolId, date, mealType } },
      create: { schoolId, date, mealType, items },
      update: { items },
    });
  },

  async listCafeteriaMealCounts(schoolId: string, from?: string, to?: string) {
    const where: any = { schoolId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    return prisma.cafeteriaMealCount.findMany({ where, orderBy: [{ date: "asc" }, { mealType: "asc" }] });
  },

  async upsertCafeteriaMealCount(schoolId: string, data: any) {
    const date = data.date ? new Date(data.date) : null;
    const mealType = String(data.mealType || "").trim();
    if (!date || Number.isNaN(date.getTime()) || !mealType) throw new Error("Date and meal type are required");
    const planned = Math.max(0, parseInt(String(data.planned ?? "0"), 10) || 0);
    const served = Math.max(0, parseInt(String(data.served ?? "0"), 10) || 0);
    return prisma.cafeteriaMealCount.upsert({
      where: { schoolId_date_mealType: { schoolId, date, mealType } },
      create: { schoolId, date, mealType, planned, served, notes: data.notes ? String(data.notes).trim() : null },
      update: { planned, served, notes: data.notes !== undefined ? (data.notes ? String(data.notes).trim() : null) : undefined },
    });
  },
};
