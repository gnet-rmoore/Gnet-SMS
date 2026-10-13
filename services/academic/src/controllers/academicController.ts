import type { Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { academicService } from "../services/academicService";
import { assertTeacherTeachesSyllabusPair } from "../lib/syllabusTeachingScope";
import { syllabusPayloadHasContentChanges } from "../lib/syllabusCalendarValidation";
import prisma from "../lib/prisma";

const SYLLABUS_REVIEW_ROLES = new Set(["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"]);

/** Ported verbatim from src/server/controllers/academicController.ts */
export const academicController = {
  async getCalendar(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      const calendar = await academicService.getCalendar(schoolId);
      res.json(calendar);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch calendar" });
    }
  },

  async createCalendar(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      const calendar = await academicService.createCalendar(schoolId, req.user.id, req.body);
      res.json(calendar);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create calendar" });
    }
  },

  async createExamComponent(req: any, res: Response) {
    const { periodId } = req.params;
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const component = await academicService.createExamComponent(periodId, req.body);
      res.json(component);
    } catch (err: any) {
      res.status(err.message === "Period not found" ? 404 : 500).json({ error: err.message });
    }
  },

  async updateExamComponent(req: any, res: Response) {
    const { id } = req.params;
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const component = await academicService.updateExamComponent(id, req.body);
      res.json(component);
    } catch (err) {
      res.status(500).json({ error: "Failed to update exam component" });
    }
  },

  async deleteExamComponent(req: any, res: Response) {
    const { id } = req.params;
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      await academicService.deleteExamComponent(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete exam component" });
    }
  },

  async updatePeriod(req: any, res: Response) {
    const { id } = req.params;
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const period = await academicService.updatePeriod(id, req.body);
      res.json(period);
    } catch (err) {
      res.status(500).json({ error: "Failed to update period" });
    }
  },

  async getCalendarTemplates(req: any, res: Response) {
    const templates = [
      {
        name: "Semester System",
        patternType: "SEMESTER",
        periods: [
          { label: "Semester 1", shortCode: "S1", periodNumber: 1, annualWeightPct: 50, examComponents: [
            { label: "1st Period", shortCode: "SEM1_P1", componentType: "FIRST_PERIOD", maxScore: 100, weightPct: 20 },
            { label: "2nd Period", shortCode: "SEM1_P2", componentType: "SECOND_PERIOD", maxScore: 100, weightPct: 20 },
            { label: "3rd Period", shortCode: "SEM1_P3", componentType: "THIRD_PERIOD", maxScore: 100, weightPct: 20 },
            { label: "First Semester Exams", shortCode: "SEM1_EX", componentType: "FIRST_SEMESTER_EXAMS", maxScore: 100, weightPct: 40 },
          ]},
          { label: "Semester 2", shortCode: "S2", periodNumber: 2, annualWeightPct: 50, examComponents: [
            { label: "4th Period", shortCode: "SEM2_P4", componentType: "FOURTH_PERIOD", maxScore: 100, weightPct: 20 },
            { label: "5th Period", shortCode: "SEM2_P5", componentType: "FIFTH_PERIOD", maxScore: 100, weightPct: 20 },
            { label: "6th Period", shortCode: "SEM2_P6", componentType: "SIXTH_PERIOD", maxScore: 100, weightPct: 20 },
            { label: "Second Semester Exams", shortCode: "SEM2_EX", componentType: "SECOND_SEMESTER_EXAMS", maxScore: 100, weightPct: 40 },
          ]},
        ]
      },
      {
        name: "Two-Term System",
        patternType: "TWO_TERM",
        periods: [
          { label: "Term 1", shortCode: "T1", periodNumber: 1, annualWeightPct: 50, examComponents: [
            { label: "Mid-Term 1 Exam", shortCode: "T1_MID", componentType: "MID_TERM", maxScore: 100, weightPct: 30 },
            { label: "End-of-Term 1 Exam", shortCode: "T1_END", componentType: "END_OF_TERM", maxScore: 100, weightPct: 70 },
          ]},
          { label: "Term 2", shortCode: "T2", periodNumber: 2, annualWeightPct: 50, examComponents: [
            { label: "Mid-Term 2 Exam", shortCode: "T2_MID", componentType: "MID_TERM", maxScore: 100, weightPct: 30 },
            { label: "End-of-Term 2 Exam", shortCode: "T2_END", componentType: "END_OF_TERM", maxScore: 100, weightPct: 70 },
          ]},
        ]
      },
      {
        name: "Three-Term System",
        patternType: "THREE_TERM",
        periods: [
          { label: "Term 1", shortCode: "T1", periodNumber: 1, annualWeightPct: 33.33, examComponents: [
            { label: "Mid-Term 1 Exam", shortCode: "T1_MID", componentType: "MID_TERM", maxScore: 100, weightPct: 40 },
            { label: "End-of-Term 1 Exam", shortCode: "T1_END", componentType: "END_OF_TERM", maxScore: 100, weightPct: 60 },
          ]},
          { label: "Term 2", shortCode: "T2", periodNumber: 2, annualWeightPct: 33.33, examComponents: [
            { label: "Mid-Term 2 Exam", shortCode: "T2_MID", componentType: "MID_TERM", maxScore: 100, weightPct: 40 },
            { label: "End-of-Term 2 Exam", shortCode: "T2_END", componentType: "END_OF_TERM", maxScore: 100, weightPct: 60 },
          ]},
          { label: "Term 3", shortCode: "T3", periodNumber: 3, annualWeightPct: 33.34, examComponents: [
            { label: "Mid-Term 3 Exam", shortCode: "T3_MID", componentType: "MID_TERM", maxScore: 100, weightPct: 40 },
            { label: "End-of-Term 3 Exam", shortCode: "T3_END", componentType: "END_OF_TERM", maxScore: 100, weightPct: 60 },
          ]},
        ]
      }
    ];
    res.json(templates);
  },

  async getGradeLegends(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      const legends = await academicService.getGradeLegends(schoolId);
      res.json(legends);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch grade legends" });
    }
  },

  async createGradeLegend(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      const legend = await academicService.createGradeLegend(schoolId, req.body);
      res.json(legend);
    } catch (err) {
      res.status(500).json({ error: "Failed to create grade legend" });
    }
  },

  async updateGradeLegend(req: any, res: Response) {
    const { legendId } = req.params;
    try {
      const legend = await academicService.updateGradeLegend(legendId, req.body);
      res.json(legend);
    } catch (err) {
      res.status(500).json({ error: "Failed to update grade legend" });
    }
  },

  async deleteGradeLegend(req: any, res: Response) {
    const { legendId } = req.params;
    try {
      await academicService.deleteGradeLegend(legendId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete grade legend" });
    }
  },

  async getGradeLevels(req: any, res: Response) {
    const { schoolId } = req.params;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    try {
      const result = await academicService.getGradeLevels(schoolId, page, pageSize);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch grade levels" });
    }
  },

  async createGradeLevel(req: any, res: Response) {
    const { schoolId } = req.params;
    const { name } = req.body;
    if (!["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const gradeLevel = await academicService.createGradeLevel(schoolId, name);
      res.json(gradeLevel);
    } catch (err: any) {
      const isClientError = err.message.includes("exists") || err.message.includes("required");
      if (isClientError) {
        console.warn("Create Grade Level Validation Warning:", err.message);
      } else {
        console.error("Create Grade Level Unexpected Error:", err);
      }
      res.status(isClientError ? 400 : 500).json({ error: err.message });
    }
  },

  /** Identity starter pack — one grade at a time (idempotent on duplicate). */
  async createGradeLevelInternal(req: any, res: Response) {
    const { schoolId } = req.params;
    const name = req.body?.name;
    try {
      const gradeLevel = await academicService.createGradeLevel(schoolId, name);
      res.status(201).json(gradeLevel);
    } catch (err: any) {
      if (String(err.message || "").includes("exists")) {
        return res.status(200).json({ ok: true, skipped: true, name });
      }
      res.status(err.message?.includes("required") ? 400 : 500).json({ error: err.message });
    }
  },

  async seedGradeLevels(req: any, res: Response) {
    const { schoolId } = req.params;
    const role = req.user?.role;
    if (role && !["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const createdCount = await academicService.seedGradeLevels(schoolId);
      res.json({ success: true, created: createdCount });
    } catch (err) {
      console.error("Seed Grade Levels Error:", err);
      res.status(500).json({ error: "Failed to seed grade levels" });
    }
  },

  async getSubjects(req: any, res: Response) {
    const { schoolId } = req.params;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    try {
      const result = await academicService.getSubjects(schoolId, page, pageSize);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  },

  async createSubject(req: any, res: Response) {
    const { schoolId } = req.params;
    if (!["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const subject = await academicService.createSubject(schoolId, req.body);
      res.json(subject);
    } catch (err: any) {
      console.error("Create Subject Error:", err);
      res.status(err.message.includes("exists") || err.message.includes("required") ? 400 : 500).json({ error: err.message });
    }
  },

  async updateSubject(req: any, res: Response) {
    const { id } = req.params;
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const subject = await academicService.updateSubject(id, req.body);
      res.json(subject);
    } catch (err: any) {
      res.status(err.message.includes("exists") || err.message.includes("required") ? 400 : 500).json({ error: err.message });
    }
  },

  async deleteSubject(req: any, res: Response) {
    const { id } = req.params;
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      await academicService.deleteSubject(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(err.message.includes("classrooms") || err.message.includes("grades") ? 400 : 500).json({ error: err.message });
    }
  },

  async getSubjectOfferings(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      const offerings = await academicService.getSubjectOfferings(schoolId, {
        gradeLevelId: req.query.gradeLevelId as string | undefined,
        subjectId: req.query.subjectId as string | undefined,
      });
      res.json(offerings);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch subject offerings" });
    }
  },

  async createSubjectOffering(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      const offering = await academicService.createSubjectOffering(schoolId, req.body || {});
      res.status(201).json(offering);
    } catch (err: any) {
      const client =
        err.message?.includes("required") ||
        err.message?.includes("not found") ||
        err.message?.includes("already offered");
      res.status(client ? 400 : 500).json({ error: err.message });
    }
  },

  async deleteSubjectOffering(req: any, res: Response) {
    try {
      const result = await academicService.deleteSubjectOffering(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(err.message?.includes("not found") ? 404 : 500).json({ error: err.message });
    }
  },

  async backfillSubjectOfferings(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      const pairs = Array.isArray(req.body?.pairs) ? req.body.pairs : [];
      const result = await academicService.backfillSubjectOfferingsFromPairs(schoolId, pairs);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Backfill failed" });
    }
  },

  async updateGradeLevel(req: any, res: Response) {
    const { id } = req.params;
    const { name, divisionId } = req.body;
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const gradeLevel = await academicService.updateGradeLevel(id, {
        ...(name !== undefined ? { name } : {}),
        ...(divisionId !== undefined ? { divisionId } : {}),
      });
      res.json(gradeLevel);
    } catch (err: any) {
      const isClientError = err.message.includes("exists") || err.message.includes("required");
      if (isClientError) {
        console.warn("Update Grade Level Validation Warning:", err.message);
      } else {
        console.error("Update Grade Level Unexpected Error:", err);
      }
      res.status(isClientError ? 400 : 500).json({ error: err.message });
    }
  },

  async getGradeLevelInternal(req: any, res: Response) {
    try {
      const row = await academicService.getGradeLevelById(req.params.schoolId, req.params.id);
      if (!row) return res.status(404).json({ error: "Grade level not found" });
      res.json(row);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch grade level" });
    }
  },

  async listGradeLevelsInternal(req: any, res: Response) {
    try {
      const rows = await academicService.getGradeLevels(req.params.schoolId);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch grade levels" });
    }
  },

  async listSubjectOfferingsInternal(req: any, res: Response) {
    try {
      const offerings = await academicService.getSubjectOfferings(req.params.schoolId, {
        gradeLevelId: req.query.gradeLevelId as string | undefined,
      });
      res.json(offerings);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch subject offerings" });
    }
  },

  async listDivisions(req: any, res: Response) {
    try {
      const rows = await academicService.listDivisions(req.params.schoolId);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch divisions" });
    }
  },

  async createDivision(req: any, res: Response) {
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const row = await academicService.createDivision(req.params.schoolId, req.body);
      res.status(201).json(row);
    } catch (err: any) {
      const bad = err.message.includes("required") || err.message.includes("exists");
      res.status(bad ? 400 : 500).json({ error: err.message });
    }
  },

  async updateDivision(req: any, res: Response) {
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const row = await academicService.updateDivision(req.params.id, req.body);
      res.json(row);
    } catch (err: any) {
      res.status(err.message.includes("not found") ? 404 : 500).json({ error: err.message });
    }
  },

  async deleteDivision(req: any, res: Response) {
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      await academicService.deleteDivision(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      const bad = err.message.includes("Cannot delete");
      res.status(bad ? 400 : 500).json({ error: err.message });
    }
  },

  async seedDivisions(req: any, res: Response) {
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const result = await academicService.seedDivisions(req.params.schoolId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to seed divisions" });
    }
  },

  async listDivisionsInternal(req: any, res: Response) {
    try {
      res.json(await academicService.listDivisions(req.params.schoolId));
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch divisions" });
    }
  },

  async getDivisionInternal(req: any, res: Response) {
    try {
      const row = await academicService.getDivision(req.params.schoolId, req.params.id);
      if (!row) return res.status(404).json({ error: "Division not found" });
      res.json(row);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch division" });
    }
  },

  async deleteGradeLevel(req: any, res: Response) {
    const { id } = req.params;
    if (!["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      await academicService.deleteGradeLevel(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(err.message.includes("associated") || err.message.includes("active") ? 400 : 500).json({ error: err.message });
    }
  },

  async getSyllabi(req: any, res: Response) {
    const { schoolId } = req.params;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    try {
      const result = await academicService.getSyllabi(schoolId, page, pageSize);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch syllabi" });
    }
  },

  async createSyllabus(req: any, res: Response) {
    const { schoolId } = req.params;
    try {
      const { subjectId, gradeLevelId, teacherId } = req.body || {};
      if (req.user.role === "TEACHER") {
        if (teacherId && teacherId !== req.user.id) {
          return res.status(403).json({ error: "Teachers can only submit syllabi for themselves" });
        }
        if (!subjectId || !gradeLevelId) {
          return res.status(400).json({ error: "Subject and grade level are required" });
        }
        await assertTeacherTeachesSyllabusPair({
          userId: req.user.id,
          schoolId,
          subjectId,
          gradeLevelId,
          role: req.user.role,
        });
      }

      const syllabus = await academicService.createSyllabus(schoolId, {
        ...req.body,
        teacherId: req.user.role === "TEACHER" ? req.user.id : teacherId || req.user.id,
        teacherName:
          req.user.role === "TEACHER"
            ? req.user.name || req.body.teacherName || "Teacher"
            : req.body.teacherName,
      });
      res.json(syllabus);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to create syllabus" });
    }
  },

  async updateSyllabus(req: any, res: Response) {
    const { id } = req.params;
    try {
      const existing = await prisma.syllabusPlan.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: "Syllabus not found" });
      }

      const body = req.body || {};
      const statusOnly =
        body.status !== undefined &&
        !syllabusPayloadHasContentChanges({ ...body, status: undefined });

      if (statusOnly) {
        if (!SYLLABUS_REVIEW_ROLES.has(req.user.role)) {
          return res.status(403).json({ error: "Not authorized to review syllabi" });
        }
      } else {
        const isOwner = existing.teacherId === req.user.id;
        const isReviewer = SYLLABUS_REVIEW_ROLES.has(req.user.role);
        const editableStatus = existing.status === "REJECTED" || existing.status === "DRAFT";

        if (req.user.role === "TEACHER") {
          if (!isOwner || !editableStatus) {
            return res.status(403).json({
              error: "Teachers can only edit their own returned or draft syllabus plans",
            });
          }
          if (body.subjectId && body.gradeLevelId) {
            await assertTeacherTeachesSyllabusPair({
              userId: req.user.id,
              schoolId: existing.schoolId,
              subjectId: body.subjectId,
              gradeLevelId: body.gradeLevelId,
              role: req.user.role,
            });
          }
        } else if (!isReviewer && !isOwner) {
          return res.status(403).json({ error: "Not authorized to edit this syllabus" });
        }
      }

      const syllabus = await academicService.updateSyllabus(id, body);
      res.json(syllabus);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message || "Failed to update syllabus" });
    }
  },

  async deleteSyllabus(req: any, res: Response) {
    const { id } = req.params;
    try {
      await academicService.deleteSyllabus(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete syllabus" });
    }
  },

  async generateSyllabus(req: any, res: Response) {
    const { subjectName, gradeLevelName, frameworkType, customPrompt } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: "Gemini API Key is not configured in the workspace settings. Please configure it in Settings > Secrets." });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Generate a comprehensive high-fidelity academic syllabus for ${subjectName} at ${gradeLevelName} grade level, using the ${frameworkType} standards framework.
Custom instructions: ${customPrompt || "No custom instructions. Ensure it meets rigorous, world-class educational and professional design standards."}`,
        config: {
          systemInstruction: "You are an expert curriculum designer and educator designing rigorous, international-standard course syllabi (e.g. Cambridge, IB, CCSS).",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              academicYear: { type: Type.STRING },
              standardsFramework: { type: Type.STRING },
              textbooks: { type: Type.STRING },
              differentiation: { type: Type.STRING },
              accommodations: { type: Type.STRING },
              objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
              units: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    week: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    activities: { type: Type.STRING },
                    assessment: { type: Type.STRING },
                  },
                  required: ["week", "topic", "activities", "assessment"],
                },
              },
              gradingCriteria: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { label: { type: Type.STRING }, weight: { type: Type.INTEGER } },
                  required: ["label", "weight"],
                },
              },
            },
            required: ["title", "academicYear", "standardsFramework", "textbooks", "differentiation", "accommodations", "objectives", "units", "gradingCriteria"],
          },
        },
      });

      if (!response.text) {
        throw new Error("Empty response from AI model.");
      }

      const generatedSyllabus = JSON.parse(response.text.trim());
      res.json(generatedSyllabus);
    } catch (err: any) {
      console.error("AI Syllabus Generation Error:", err);
      res.status(500).json({ error: err.message || "Failed to generate syllabus using AI" });
    }
  },
};
