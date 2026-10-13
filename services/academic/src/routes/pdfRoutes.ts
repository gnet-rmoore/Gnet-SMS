import express from "express";
import { authenticate, requireTenant, requireRoles, requireResourceTenant } from "../middleware/auth";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { pdfController } from "../controllers/pdfController";

const router = express.Router();

const PDF_READ_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER", "STUDENT", "PARENT", "REGISTRAR"];
const PDF_WRITE_ROLES = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "TEACHER"];

// Grade Sheet PDF generation
router.get(
  "/api/exams/:examId/gradesheet/:studentId/pdf",
  authenticate,
  requireRoles(PDF_READ_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  pdfController.generateGradeSheetPDF
);

// Report Card PDF generation
router.get(
  "/api/exams/:examId/report-card/:studentId/pdf",
  authenticate,
  requireRoles(PDF_READ_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  pdfController.generateReportCardPDF
);

// Bulk Grade Sheet PDF (for class)
router.get(
  "/api/exams/:examId/gradesheet/class/:classId/pdf",
  authenticate,
  requireRoles(PDF_WRITE_ROLES),
  requireResourceTenant(resourceLoaders.exam),
  pdfController.generateBulkGradeSheetPDF
);

export default router;