import { Router } from "express";
import { authenticate, requireTenant, requireRoles, requireResourceTenant } from "../middleware/auth";
import { resourceLoaders } from "../middleware/resourceLoaders";
import { documentController } from "../controllers/documentController";

/** Same paths as monolith src/server/routes/documentRoutes.ts. */
const router = Router();

const DOC_READ = [
  "SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR", "TEACHER",
  "STUDENT", "PARENT", "ACCOUNTANT", "IT_ADMIN", "LIBRARIAN", "NURSE", "COUNSELOR",
  "SECURITY", "MAINTENANCE",
];
const DOC_MANAGE = ["SCHOOL_ADMIN", "PRINCIPAL", "VPI", "VPA", "REGISTRAR"];
/** Staff roles (excludes students/parents) may publish documents from the staff portal. */
const DOC_CREATE = DOC_READ.filter((r) => r !== "STUDENT" && r !== "PARENT");

router.get(
  "/api/schools/:schoolId/documents",
  authenticate,
  requireTenant,
  requireRoles(DOC_READ),
  documentController.getDocuments
);

router.post(
  "/api/schools/:schoolId/documents",
  authenticate,
  requireTenant,
  requireRoles(DOC_CREATE),
  documentController.createDocument
);

router.put(
  "/api/documents/:id",
  authenticate,
  requireRoles(DOC_MANAGE),
  requireResourceTenant(resourceLoaders.document),
  documentController.updateDocument
);

router.delete(
  "/api/documents/:id",
  authenticate,
  requireRoles(DOC_MANAGE),
  requireResourceTenant(resourceLoaders.document),
  documentController.deleteDocument
);

export default router;
