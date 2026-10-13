import express from "express";
import {
  authenticate,
  authenticateInternal,
  requireTenant,
  requireRoles,
  requireResourceTenant,
} from "../middleware/auth";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { academicController } from "../controllers/academicController";
import { lessonPlanController } from "../controllers/lessonPlanController";
import { promotionController } from "../controllers/promotionController";
import { academicYearsController } from "../controllers/academicYearsController";
import { auditController } from "../controllers/auditController";
import { YEAR_TRANSITION_ROLES, YEAR_START_ROLES } from "../domain/yearTransition";

/** Same paths as monolith src/server/routes/academicRoutes.ts. */
const router = express.Router();

const ACADEMIC_ADMIN = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"];
const ACADEMIC_STAFF = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"];
const CALENDAR_WRITE = ["SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR"];
const LESSON_REVIEWERS = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI"];
const YEAR_TRANSITION = [...YEAR_TRANSITION_ROLES];
const YEAR_START = [...YEAR_START_ROLES];

router.get("/api/schools/:schoolId/calendar", authenticate, requireTenant, academicController.getCalendar);

router.post(
  "/api/schools/:schoolId/calendar",
  authenticate,
  requireTenant,
  requireRoles(CALENDAR_WRITE),
  academicController.createCalendar
);

router.get("/api/schools/:schoolId/calendar/templates", authenticate, requireTenant, academicController.getCalendarTemplates);

router.post(
  "/api/periods/:periodId/exam-components",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.period),
  academicController.createExamComponent
);

router.patch(
  "/api/exam-components/:id",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.examComponent),
  academicController.updateExamComponent
);

router.delete(
  "/api/exam-components/:id",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.examComponent),
  academicController.deleteExamComponent
);

router.patch(
  "/api/periods/:id",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.period),
  academicController.updatePeriod
);

router.get("/api/schools/:schoolId/grade-legends", authenticate, requireTenant, academicController.getGradeLegends);

router.post(
  "/api/schools/:schoolId/grade-legends",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_ADMIN),
  academicController.createGradeLegend
);

router.patch(
  "/api/schools/:schoolId/grade-legends/:legendId",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_ADMIN),
  academicController.updateGradeLegend
);

router.delete(
  "/api/schools/:schoolId/grade-legends/:legendId",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_ADMIN),
  academicController.deleteGradeLegend
);

router.get("/api/schools/:schoolId/grade-levels", authenticate, requireTenant, academicController.getGradeLevels);

router.post(
  "/api/schools/:schoolId/grade-levels",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_ADMIN),
  academicController.createGradeLevel
);

router.patch(
  "/api/grade-levels/:id",
  authenticate,
  requireRoles(ACADEMIC_ADMIN),
  requireResourceTenant(resourceLoaders.gradeLevel),
  academicController.updateGradeLevel
);

router.delete(
  "/api/grade-levels/:id",
  authenticate,
  requireRoles(ACADEMIC_ADMIN),
  requireResourceTenant(resourceLoaders.gradeLevel),
  academicController.deleteGradeLevel
);

router.post(
  "/api/schools/:schoolId/grade-levels/seed",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_ADMIN),
  academicController.seedGradeLevels
);

/** Identity starter pack after school provision. */
router.post(
  "/api/internal/schools/:schoolId/grade-levels",
  authenticateInternal,
  academicController.createGradeLevelInternal
);

router.post(
  "/api/internal/schools/:schoolId/grade-levels/seed",
  authenticateInternal,
  academicController.seedGradeLevels
);

router.get(
  "/api/internal/schools/:schoolId/grade-levels",
  authenticateInternal,
  academicController.listGradeLevelsInternal
);

router.get(
  "/api/internal/schools/:schoolId/grade-levels/:id",
  authenticateInternal,
  academicController.getGradeLevelInternal
);

router.get(
  "/api/schools/:schoolId/divisions",
  authenticate,
  requireTenant,
  academicController.listDivisions
);

router.post(
  "/api/schools/:schoolId/divisions",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_ADMIN),
  academicController.createDivision
);

router.post(
  "/api/schools/:schoolId/divisions/seed",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_ADMIN),
  academicController.seedDivisions
);

router.patch(
  "/api/divisions/:id",
  authenticate,
  requireRoles(ACADEMIC_ADMIN),
  requireResourceTenant(resourceLoaders.division),
  academicController.updateDivision
);

router.delete(
  "/api/divisions/:id",
  authenticate,
  requireRoles(ACADEMIC_ADMIN),
  requireResourceTenant(resourceLoaders.division),
  academicController.deleteDivision
);

router.get(
  "/api/internal/schools/:schoolId/divisions",
  authenticateInternal,
  academicController.listDivisionsInternal
);

router.get(
  "/api/internal/schools/:schoolId/divisions/:id",
  authenticateInternal,
  academicController.getDivisionInternal
);

router.get(
  "/api/internal/schools/:schoolId/subject-offerings",
  authenticateInternal,
  academicController.listSubjectOfferingsInternal
);

router.get("/api/schools/:schoolId/subjects", authenticate, requireTenant, academicController.getSubjects);

router.post(
  "/api/schools/:schoolId/subjects",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_ADMIN),
  academicController.createSubject
);

router.patch(
  "/api/subjects/:id",
  authenticate,
  requireRoles(ACADEMIC_ADMIN),
  requireResourceTenant(resourceLoaders.subject),
  academicController.updateSubject
);

router.delete(
  "/api/subjects/:id",
  authenticate,
  requireRoles(ACADEMIC_ADMIN),
  requireResourceTenant(resourceLoaders.subject),
  academicController.deleteSubject
);

router.get(
  "/api/schools/:schoolId/subject-offerings",
  authenticate,
  requireTenant,
  academicController.getSubjectOfferings
);

router.post(
  "/api/schools/:schoolId/subject-offerings",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_ADMIN),
  academicController.createSubjectOffering
);

router.post(
  "/api/schools/:schoolId/subject-offerings/backfill",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_ADMIN),
  academicController.backfillSubjectOfferings
);

router.delete(
  "/api/subject-offerings/:id",
  authenticate,
  requireRoles(ACADEMIC_ADMIN),
  requireResourceTenant(resourceLoaders.subjectOffering),
  academicController.deleteSubjectOffering
);

router.get("/api/schools/:schoolId/syllabi", authenticate, requireTenant, academicController.getSyllabi);

router.post(
  "/api/schools/:schoolId/syllabi",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_STAFF),
  academicController.createSyllabus
);

router.post(
  "/api/schools/:schoolId/syllabi/generate-ai",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_STAFF),
  academicController.generateSyllabus
);

router.patch(
  "/api/syllabi/:id",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.syllabus),
  academicController.updateSyllabus
);

router.delete(
  "/api/syllabi/:id",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.syllabus),
  academicController.deleteSyllabus
);

router.get(
  "/api/schools/:schoolId/lesson-plans/pending",
  authenticate,
  requireTenant,
  requireRoles(LESSON_REVIEWERS),
  lessonPlanController.listPending
);

router.get(
  "/api/schools/:schoolId/lesson-plan-templates",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_STAFF),
  lessonPlanController.listTemplates
);

router.post(
  "/api/schools/:schoolId/lesson-plans/from-template",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_STAFF),
  lessonPlanController.createFromTemplate
);

router.get(
  "/api/schools/:schoolId/lesson-plan-syllabus-units",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_STAFF),
  lessonPlanController.listSyllabusUnits
);

router.post(
  "/api/schools/:schoolId/lesson-plans/from-syllabus-unit",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_STAFF),
  lessonPlanController.createFromSyllabusUnit
);

router.get(
  "/api/schools/:schoolId/lesson-plans",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_STAFF),
  lessonPlanController.list
);

router.post(
  "/api/schools/:schoolId/lesson-plans",
  authenticate,
  requireTenant,
  requireRoles(ACADEMIC_STAFF),
  lessonPlanController.create
);

router.get(
  "/api/lesson-plans/:id",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.lessonPlan),
  lessonPlanController.getOne
);

router.patch(
  "/api/lesson-plans/:id",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.lessonPlan),
  lessonPlanController.update
);

router.post(
  "/api/lesson-plans/:id/submit",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.lessonPlan),
  lessonPlanController.submit
);

router.post(
  "/api/lesson-plans/:id/review",
  authenticate,
  requireRoles(LESSON_REVIEWERS),
  requireResourceTenant(resourceLoaders.lessonPlan),
  lessonPlanController.review
);

router.post(
  "/api/lesson-plans/:id/duplicate",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.lessonPlan),
  lessonPlanController.duplicate
);

router.post(
  "/api/lesson-plans/:id/reschedule",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.lessonPlan),
  lessonPlanController.reschedule
);

router.post(
  "/api/lesson-plans/:id/save-as-template",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.lessonPlan),
  lessonPlanController.saveAsTemplate
);

router.post(
  "/api/lesson-plans/:id/share-to-classroom",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.lessonPlan),
  lessonPlanController.shareToClassroom
);

router.delete(
  "/api/lesson-plans/:id",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.lessonPlan),
  lessonPlanController.remove
);

router.delete(
  "/api/lesson-plan-templates/:id",
  authenticate,
  requireRoles(ACADEMIC_STAFF),
  requireResourceTenant(resourceLoaders.lessonPlanTemplate),
  lessonPlanController.deleteTemplate
);

// --- Year Transition + Promotion Statement ---
router.post(
  "/api/schools/:schoolId/promotion/census",
  authenticate,
  requireTenant,
  requireRoles(YEAR_TRANSITION),
  promotionController.captureCensus
);
router.get(
  "/api/schools/:schoolId/promotion/census",
  authenticate,
  requireTenant,
  requireRoles(YEAR_TRANSITION),
  promotionController.getCensus
);
router.post(
  "/api/schools/:schoolId/promotion/runs",
  authenticate,
  requireTenant,
  requireRoles(YEAR_TRANSITION),
  promotionController.createRun
);
router.get(
  "/api/schools/:schoolId/promotion/runs",
  authenticate,
  requireTenant,
  requireRoles(YEAR_TRANSITION),
  promotionController.listRuns
);
router.get(
  "/api/schools/:schoolId/promotion/runs/:runId",
  authenticate,
  requireTenant,
  requireRoles(YEAR_TRANSITION),
  promotionController.getRun
);
router.put(
  "/api/schools/:schoolId/promotion/runs/:runId/decisions",
  authenticate,
  requireTenant,
  requireRoles(YEAR_TRANSITION),
  promotionController.upsertDecisions
);
router.post(
  "/api/schools/:schoolId/promotion/runs/:runId/commit",
  authenticate,
  requireTenant,
  requireRoles(YEAR_TRANSITION),
  promotionController.commitRun
);
router.get(
  "/api/schools/:schoolId/promotion/statement",
  authenticate,
  requireTenant,
  requireRoles(YEAR_TRANSITION),
  promotionController.getStatement
);

// --- Academic Year lifecycle (switch the tenant to a new school year) ---
router.get(
  "/api/schools/:schoolId/academic-years",
  authenticate,
  requireTenant,
  requireRoles(YEAR_TRANSITION),
  academicYearsController.list
);
router.get(
  "/api/schools/:schoolId/academic-years/active",
  authenticate,
  requireTenant,
  requireRoles(YEAR_TRANSITION),
  academicYearsController.getActive
);
router.get(
  "/api/schools/:schoolId/academic-years/:yearKey",
  authenticate,
  requireTenant,
  requireRoles(YEAR_TRANSITION),
  academicYearsController.getByKey
);
router.post(
  "/api/schools/:schoolId/year-transition/start",
  authenticate,
  requireTenant,
  requireRoles(YEAR_START),
  academicYearsController.start
);
router.post(
  "/api/schools/:schoolId/academic-years/:yearKey/close",
  authenticate,
  requireTenant,
  requireRoles(YEAR_START),
  academicYearsController.close
);
router.post(
  "/api/schools/:schoolId/academic-years/:yearKey/activate",
  authenticate,
  requireTenant,
  requireRoles(YEAR_START),
  academicYearsController.reactivate
);

router.get(
  "/api/internal/schools/:schoolId/promotion/students/:studentUserId/next-grade",
  authenticateInternal,
  promotionController.resolveStudentNextGradeInternal
);

router.get("/api/internal/audit/events", authenticateInternal, auditController.listEvents);

export default router;
